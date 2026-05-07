"""
LLM provider abstraction — Ollama (local) and OpenAI-compatible (remote).
Supports SSE streaming via async generators with tool/function calling.
"""

from __future__ import annotations

import json
import os
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import AsyncGenerator

import httpx


# ---------------------------------------------------------------------------
# Types
# ---------------------------------------------------------------------------

@dataclass
class LLMConfig:
    """Runtime provider config, persisted in AppSetting."""
    active: str = "ollama"           # "ollama" | "openai" | "deepseek"
    # Ollama
    ollama_base: str = os.environ.get("OLLAMA_HOST", "http://localhost:11434")
    ollama_model: str = "llama3.2"
    # OpenAI-compatible
    openai_base: str = "https://api.openai.com/v1"
    openai_key: str = os.environ.get("OPENAI_API_KEY", "")
    openai_model: str = "gpt-4o-mini"
    # DeepSeek
    deepseek_key: str = os.environ.get("DEEPSEEK_API_KEY", "")
    deepseek_model: str = "deepseek-chat"


@dataclass
class ChatMessage:
    role: str       # "user" | "assistant" | "system" | "tool"
    content: str = ""
    tool_call_id: str | None = None  # for tool result messages
    tool_calls: list | None = None   # for assistant messages
    reasoning_content: str | None = None  # DeepSeek thinking mode (must be passed back)


@dataclass
class ToolDef:
    """Definition of a tool the model can call."""
    name: str
    description: str
    parameters: dict  # JSON schema


@dataclass
class ToolCall:
    """A tool call requested by the model."""
    id: str
    name: str
    arguments: dict


@dataclass
class StreamEvent:
    """Event yielded by generate()."""
    type: str            # "token" | "tool_call" | "reasoning" | "error" | "done"
    content: str = ""    # text token content
    tool_calls: list[ToolCall] = field(default_factory=list)
    error: str = ""
    truncated: bool = False  # True when finish_reason is "length" (hit max_tokens)


@dataclass
class CompletionRequest:
    messages: list[ChatMessage] = field(default_factory=list)
    model: str | None = None          # override provider model
    stream: bool = True
    temperature: float = 0.7
    max_tokens: int = 8192
    tools: list[ToolDef] = field(default_factory=list)


# ---------------------------------------------------------------------------
# Abstract provider
# ---------------------------------------------------------------------------

class LLMProvider(ABC):
    @abstractmethod
    async def generate(self, req: CompletionRequest) -> AsyncGenerator[StreamEvent, None]:
        """Yield StreamEvent objects (token, tool_call, error, done)."""
        ...

    @abstractmethod
    async def count_tokens(self, text: str) -> int:
        """Approximate token count."""
        ...


# ---------------------------------------------------------------------------
# Ollama provider
# ---------------------------------------------------------------------------

class OllamaProvider(LLMProvider):
    def __init__(self, config: LLMConfig):
        self.base = config.ollama_base.rstrip("/")
        self.model = config.ollama_model

    async def generate(self, req: CompletionRequest) -> AsyncGenerator[StreamEvent, None]:
        model = req.model or self.model
        payload = {
            "model": model,
            "messages": [{"role": m.role, "content": m.content} for m in req.messages],
            "stream": True,
            "options": {
                "temperature": req.temperature,
                "num_predict": req.max_tokens,
            },
        }
        if req.tools:
            payload["tools"] = [_tool_to_ollama(t) for t in req.tools]

        async with httpx.AsyncClient(timeout=120) as client:
            async with client.stream("POST", f"{self.base}/api/chat", json=payload) as resp:
                resp.raise_for_status()
                async for line in resp.aiter_lines():
                    if not line:
                        continue
                    try:
                        data = json.loads(line)
                    except json.JSONDecodeError:
                        continue

                    # Check for tool calls (Ollama returns them in message.tool_calls)
                    if "message" in data:
                        msg = data["message"]
                        if "tool_calls" in msg:
                            calls = []
                            for tc in msg["tool_calls"]:
                                fn = tc.get("function", {})
                                try:
                                    args = json.loads(fn.get("arguments", "{}")) if isinstance(fn.get("arguments"), str) else fn.get("arguments", {})
                                except json.JSONDecodeError:
                                    args = {}
                                calls.append(ToolCall(
                                    id=tc.get("id", ""),
                                    name=fn.get("name", ""),
                                    arguments=args,
                                ))
                            yield StreamEvent(type="tool_call", tool_calls=calls)
                            return

                        if msg.get("content"):
                            yield StreamEvent(type="token", content=msg["content"])

                    if data.get("done"):
                        yield StreamEvent(type="done")
                        return

    async def count_tokens(self, text: str) -> int:
        return max(1, len(text) // 4)


# ---------------------------------------------------------------------------
# OpenAI-compatible provider
# ---------------------------------------------------------------------------

class OpenAIProvider(LLMProvider):
    def __init__(self, config: LLMConfig):
        self.base = config.openai_base.rstrip("/")
        self.key = config.openai_key
        self.model = config.openai_model

    async def generate(self, req: CompletionRequest) -> AsyncGenerator[StreamEvent, None]:
        model = req.model or self.model
        headers = {
            "Authorization": f"Bearer {self.key}",
            "Content-Type": "application/json",
        }

        payload = {
            "model": model,
            "messages": [_msg_to_dict(m) for m in req.messages],
            "stream": True,
            "temperature": req.temperature,
            "max_tokens": req.max_tokens,
        }
        if req.tools:
            payload["tools"] = [_tool_to_openai(t) for t in req.tools]

        async with httpx.AsyncClient(timeout=120) as client:
            for attempt in range(2):
                try:
                    resp = await client.send(
                        httpx.Request("POST", f"{self.base}/chat/completions", json=payload, headers=headers),
                        stream=True,
                    )
                except (httpx.ConnectError, OSError) as e:
                    if attempt == 0:
                        import asyncio as _asyncio
                        await _asyncio.sleep(1)
                        continue
                    yield StreamEvent(type="error", content=f"Connection failed (DNS or network): {e}")
                    return
                break

            if not resp.is_success:
                body = await resp.aread()
                error_text = body.decode("utf-8", errors="replace")[:500]
                yield StreamEvent(type="error", content=f"API error ({resp.status_code}): {error_text}")
                return

            # Accumulate tool calls across streaming chunks
            tool_call_accums: dict[int, dict] = {}

            async for line in resp.aiter_lines():
                if not line.startswith("data: "):
                    continue
                chunk = line[6:].strip()
                if chunk == "[DONE]":
                    yield StreamEvent(type="done")
                    return
                try:
                    data = json.loads(chunk)
                except json.JSONDecodeError:
                    continue

                choice = data.get("choices", [{}])[0]
                delta = choice.get("delta", {})
                finish = choice.get("finish_reason")

                # Accumulate tool call chunks
                if "tool_calls" in delta:
                    for tc in delta["tool_calls"]:
                        idx = tc.get("index", 0)
                        if idx not in tool_call_accums:
                            tool_call_accums[idx] = {"id": "", "name": "", "arguments": ""}
                        fn = tc.get("function", {})
                        if tc.get("id"):
                            tool_call_accums[idx]["id"] = tc["id"]
                        if fn.get("name"):
                            tool_call_accums[idx]["name"] += fn["name"]
                        if fn.get("arguments"):
                            tool_call_accums[idx]["arguments"] += fn["arguments"]

                # Text content (visible response)
                content = delta.get("content", "")
                if content:
                    yield StreamEvent(type="token", content=content)

                # DeepSeek thinking trace — shown in a collapsible "Thinking" section
                reasoning = delta.get("reasoning_content")
                if reasoning:
                    yield StreamEvent(type="reasoning", content=reasoning)

                # Finish reason
                if finish == "tool_calls":
                    calls = []
                    for idx in sorted(tool_call_accums.keys()):
                        acc = tool_call_accums[idx]
                        try:
                            args = json.loads(acc["arguments"])
                        except json.JSONDecodeError:
                            args = {"command": acc["arguments"]}
                        calls.append(ToolCall(
                            id=acc["id"] or f"call_{idx}",
                            name=acc["name"],
                            arguments=args,
                        ))
                    yield StreamEvent(type="tool_call", tool_calls=calls)
                    return
                elif finish is not None:
                    is_truncated = finish == "length"
                    yield StreamEvent(type="done", truncated=is_truncated)
                    return

    async def count_tokens(self, text: str) -> int:
        try:
            import tiktoken
            enc = tiktoken.get_encoding("cl100k_base")
            return len(enc.encode(text))
        except ImportError:
            return max(1, len(text) // 4)


# ---------------------------------------------------------------------------
# DeepSeek provider (OpenAI-compatible)
# ---------------------------------------------------------------------------

class DeepSeekProvider(OpenAIProvider):
    def __init__(self, config: LLMConfig):
        self.base = "https://api.deepseek.com/v1"
        self.key = config.deepseek_key
        self.model = config.deepseek_model


# ---------------------------------------------------------------------------
# Tool helpers
# ---------------------------------------------------------------------------

def _tool_to_openai(t: ToolDef) -> dict:
    return {
        "type": "function",
        "function": {
            "name": t.name,
            "description": t.description,
            "parameters": t.parameters,
        },
    }


def _tool_to_ollama(t: ToolDef) -> dict:
    return {
        "type": "function",
        "function": {
            "name": t.name,
            "description": t.description,
            "parameters": t.parameters,
        },
    }


def _msg_to_dict(m: ChatMessage) -> dict:
    d = {"role": m.role}
    # content must be null (not "") when tool_calls is present (OpenAI/DeepSeek requirement)
    if m.content:
        d["content"] = m.content
    else:
        d["content"] = None
    if m.tool_call_id:
        d["tool_call_id"] = m.tool_call_id
    if m.tool_calls:
        d["tool_calls"] = m.tool_calls
    if m.reasoning_content:
        d["reasoning_content"] = m.reasoning_content
    return d


# ---------------------------------------------------------------------------
# Factory
# ---------------------------------------------------------------------------

def get_provider(config: LLMConfig) -> LLMProvider:
    if config.active == "deepseek":
        if not config.deepseek_key:
            raise ValueError("DeepSeek API key not configured")
        return DeepSeekProvider(config)
    if config.active == "openai":
        if not config.openai_key:
            raise ValueError("OpenAI API key not configured")
        return OpenAIProvider(config)
    return OllamaProvider(config)
