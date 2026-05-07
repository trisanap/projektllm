"""
Skills router — discover, inspect, and run skills from the skills/ directory.
"""
from __future__ import annotations

import os
import re
import shutil
import subprocess
import tempfile
import uuid
from datetime import datetime, timezone
from pathlib import Path

import yaml
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File as FastAPIFile, Form
from fastapi.responses import FileResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.auth import require_user
from backend.database import get_db, Project, File as FileModel

SKILLS_DIR = Path(__file__).resolve().parent.parent.parent / "skills"
UPLOAD_DIR = Path(__file__).resolve().parent.parent / "uploads"
_NO_AUTH = os.environ.get("PROJEKTLLM_NO_AUTH", "0") == "1"


def _id():
    return uuid.uuid4().hex[:12]


def _now():
    return datetime.now(timezone.utc).isoformat()


def _human_size(size: int) -> str:
    if size < 1024:
        return f"{size} B"
    elif size < 1024 * 1024:
        return f"{size // 1024} KB"
    else:
        return f"{size / (1024 * 1024):.1f} MB"

router = APIRouter(prefix="/api/skills", tags=["skills"])


# ── Frontmatter parsing ──────────────────────────────────────────────────────

_FM_RE = re.compile(r"^---\s*\n(.*?)\n---\s*\n", re.DOTALL)


def _parse_skill(dir_path: Path) -> dict | None:
    """Read a skill directory and return its metadata from SKILL.md frontmatter."""
    skill_md = dir_path / "SKILL.md"
    if not skill_md.exists():
        return None

    raw = skill_md.read_text("utf-8")
    m = _FM_RE.match(raw)
    if not m:
        return None

    meta = yaml.safe_load(m.group(1))
    if not isinstance(meta, dict) or not meta.get("name"):
        return None

    # List knowledge files (.md, .txt, .py, .docx, .pdf — excluding clients/ and SKILL.md itself)
    knowledge = []
    for f in sorted(dir_path.rglob("*")):
        if f.is_dir() or f.name == "SKILL.md":
            continue
        if f.parent == dir_path / "clients":
            continue
        rel = f.relative_to(dir_path)
        ext = f.suffix.lower()
        if ext in (".md", ".txt", ".py", ".docx", ".pdf", ".csv", ".html"):
            knowledge.append(str(rel))

    return {
        "name": meta.get("name"),
        "description": meta.get("description", ""),
        "trigger": meta.get("trigger", ""),
        "tool": meta.get("tool", ""),
        "inputs": meta.get("inputs", {}),
        "files": meta.get("files", {}),
        "outputs": meta.get("outputs", []),
        "knowledge": knowledge,
    }


# ── Endpoints ────────────────────────────────────────────────────────────────


@router.get("")
async def list_skills():
    """List all available skills."""
    if not SKILLS_DIR.exists():
        return []
    skills = []
    for d in sorted(SKILLS_DIR.iterdir()):
        if d.is_dir():
            meta = _parse_skill(d)
            if meta:
                skills.append(meta)
    return skills


@router.get("/{name}")
async def get_skill(name: str):
    """Get full skill details."""
    skill_dir = SKILLS_DIR / name
    if not skill_dir.is_dir():
        raise HTTPException(404, f"Skill '{name}' not found")
    meta = _parse_skill(skill_dir)
    if not meta:
        raise HTTPException(404, f"Skill '{name}' has no valid SKILL.md")
    return meta


@router.get("/{name}/knowledge/{file_path:path}")
async def get_skill_knowledge(name: str, file_path: str):
    """Get a knowledge file from a skill."""
    skill_dir = SKILLS_DIR / name
    full_path = (skill_dir / file_path).resolve()

    # Security: ensure the resolved path is within the skill directory
    if not str(full_path).startswith(str(skill_dir.resolve())):
        raise HTTPException(403, "Forbidden")

    if not full_path.exists() or not full_path.is_file():
        raise HTTPException(404, "File not found")

    ext = full_path.suffix.lower()
    if ext in (".md", ".txt", ".py", ".csv", ".html"):
        return {"content": full_path.read_text("utf-8"), "path": file_path}
    if ext in (".docx", ".pdf"):
        return FileResponse(str(full_path))

    raise HTTPException(415, f"Unsupported file type: {ext}")


@router.post("/{name}/run")
async def run_skill(
    name: str,
    produk: UploadFile = FastAPIFile(...),
    bahan: UploadFile = FastAPIFile(...),
    client: str = Form(...),
    reg: str = Form(...),
    date: str = Form(...),
    lead_auditor: str = Form(...),
    auditor: str = Form(...),
    registration_type: str = Form("Pengajuan Baru"),
    city: str = Form(""),
    product_type: str = Form(""),
    company: str = Form(""),
    penyelia: str = Form(""),
    penyelia_ktp: str = Form(""),
    penyelia_cert: str = Form(""),
    penyelia_sk: str = Form(""),
    penyelia_contact: str = Form(""),
    skip_api: bool = Form(False),
):
    """Run a skill's tool with the given inputs and uploaded files.

    The halal-audit skill takes two PDFs (produk + bahan) and metadata,
    runs generate_report.py, and returns the generated files.
    """
    skill_dir = SKILLS_DIR / name
    if not skill_dir.is_dir():
        raise HTTPException(404, f"Skill '{name}' not found")

    meta = _parse_skill(skill_dir)
    if not meta:
        raise HTTPException(404, f"Skill '{name}' has no valid SKILL.md")

    tool = meta.get("tool", "")
    if not tool:
        raise HTTPException(400, f"Skill '{name}' has no tool configured")

    tool_path = skill_dir / tool
    if not tool_path.exists():
        raise HTTPException(404, f"Tool '{tool}' not found in skill '{name}'")

    template_dir = skill_dir / "template"
    if not template_dir.exists():
        raise HTTPException(400, "Skill has no template/ directory")

    # Create temp working directory
    work_dir = Path(tempfile.mkdtemp(prefix=f"skill_{name}_"))
    try:
        client_dir = work_dir / "clients" / client
        client_dir.mkdir(parents=True, exist_ok=True)

        # Save uploaded files
        produk_path = client_dir / f"Daftar_Produk_{client}.pdf"
        bahan_path = client_dir / f"Daftar_Bahan_{client}.pdf"

        produk_data = await produk.read()
        bahan_data = await bahan.read()
        produk_path.write_bytes(produk_data)
        bahan_path.write_bytes(bahan_data)

        # Copy template
        skill_template = template_dir / "Draft_Laporan_Audit_TEMPLATE.docx"
        if not skill_template.exists():
            raise HTTPException(400, "Template file not found in skill")

        # Link/copy template into the workdir
        work_template = work_dir / "template"
        work_template.mkdir(exist_ok=True)
        shutil.copy2(str(skill_template), str(work_template / "Draft_Laporan_Audit_TEMPLATE.docx"))

        # Copy skill scripts
        shutil.copy2(str(tool_path), str(work_dir / tool))
        for extra in skill_dir.glob("*.py"):
            if extra.name != tool:
                shutil.copy2(str(extra), str(work_dir / extra.name))

        # Build command
        cmd = [
            "python3", str(work_dir / tool),
            client,
            "--reg", reg,
            "--date", date,
            "--lead-auditor", lead_auditor,
            "--auditor", auditor,
            "--registration-type", registration_type,
        ]
        if city:
            cmd += ["--city", city]
        if product_type:
            cmd += ["--product-type", product_type]
        if company:
            cmd += ["--company", company]
        if penyelia:
            cmd += ["--penyelia", penyelia]
        if penyelia_ktp:
            cmd += ["--penyelia-ktp", penyelia_ktp]
        if penyelia_cert:
            cmd += ["--penyelia-cert", penyelia_cert]
        if penyelia_sk:
            cmd += ["--penyelia-sk", penyelia_sk]
        if penyelia_contact:
            cmd += ["--penyelia-contact", penyelia_contact]
        if skip_api:
            cmd += ["--skip-api"]

        # Run
        result = subprocess.run(
            cmd,
            cwd=str(work_dir),
            capture_output=True,
            text=True,
            timeout=300,
        )

        # Collect output files
        output_files = []
        if client_dir.exists():
            for f in client_dir.iterdir():
                if f.is_file() and f.suffix in (".docx", ".txt"):
                    rel = f.relative_to(work_dir)
                    output_files.append({
                        "name": f.name,
                        "path": str(rel),
                        "size": f.stat().st_size,
                    })

        return {
            "success": result.returncode == 0,
            "returncode": result.returncode,
            "stdout": result.stdout,
            "stderr": result.stderr,
            "output_files": output_files,
            "work_dir": str(work_dir),  # caller can download files
        }

    except subprocess.TimeoutExpired:
        shutil.rmtree(work_dir, ignore_errors=True)
        raise HTTPException(504, "Skill execution timed out")
    except Exception:
        shutil.rmtree(work_dir, ignore_errors=True)
        raise


@router.get("/{name}/run/{work_dir_name}/download/{file_name:path}")
async def download_skill_output(name: str, work_dir_name: str, file_name: str):
    """Download an output file from a skill execution."""
    work_dir = Path(tempfile.gettempdir()) / work_dir_name
    if not work_dir.exists():
        raise HTTPException(404, "Work directory not found (may have been cleaned up)")

    full_path = (work_dir / file_name).resolve()
    if not str(full_path).startswith(str(work_dir.resolve())):
        raise HTTPException(403, "Forbidden")

    if not full_path.exists() or not full_path.is_file():
        raise HTTPException(404, "File not found")

    return FileResponse(str(full_path), filename=full_path.name)


@router.post("/{name}/run/{work_dir_name}/save/{project_id}")
async def save_skill_output_to_project(
    name: str,
    work_dir_name: str,
    project_id: str,
    body: dict,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(require_user) if not _NO_AUTH else None,
):
    """Save a generated file from a skill run to a project's knowledge base."""
    project = await db.get(Project, project_id)
    if not project:
        raise HTTPException(404, "Project not found")

    # Permission check
    uid = current_user["user_id"] if current_user else None
    if uid and project.owner_id != uid and not current_user.get("is_admin", False):
        raise HTTPException(403, "No permission to save to this project")

    # Resolve file in work dir
    work_dir = Path(tempfile.gettempdir()) / work_dir_name
    if not work_dir.exists():
        raise HTTPException(404, "Work directory not found")

    file_path = body.get("file_path", "")
    if not file_path:
        raise HTTPException(400, "file_path is required")

    full_path = (work_dir / file_path).resolve()
    if not str(full_path).startswith(str(work_dir.resolve())):
        raise HTTPException(403, "Forbidden")
    if not full_path.exists() or not full_path.is_file():
        raise HTTPException(404, f"File not found: {file_path}")

    UPLOAD_DIR.mkdir(exist_ok=True)

    display_name = body.get("display_name") or full_path.name
    fid = _id()
    dest = UPLOAD_DIR / f"{fid}_{display_name}"
    shutil.copy2(str(full_path), str(dest))

    size = dest.stat().st_size
    ext = display_name.split(".")[-1].lower() if "." in display_name else "bin"

    db_file = FileModel(
        id=fid,
        project_id=project_id,
        name=display_name,
        kind=ext,
        size=_human_size(size),
        tokens=size // 4,
        filepath=str(dest),
    )
    db.add(db_file)
    project.updated_at = _now()
    await db.commit()

    return {
        "id": fid,
        "project_id": project_id,
        "name": db_file.name,
        "kind": ext,
        "size": db_file.size,
        "tokens": db_file.tokens,
        "added_at": db_file.added_at,
    }
