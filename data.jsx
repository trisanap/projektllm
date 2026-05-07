// Mock data for the prototype.
const PROJECTS = [
  {
    id: "p-launch",
    name: "Q3 Product Launch",
    color: "oklch(0.68 0.18 35)",
    glyph: "QL",
    description: "Coordinating the v4.2 release: GTM brief, launch site copy, beta feedback synthesis.",
    instructions: "Act as a senior product marketing partner. Cite knowledge files when relevant. Default tone: technical, precise, no fluff. Output structured markdown unless asked otherwise.",
    files: [
      { id: "f1", name: "launch-brief.md",          kind: "md",   size: "12 KB",  added: "2d",   tokens: 3120 },
      { id: "f2", name: "competitor-matrix.csv",    kind: "csv",  size: "48 KB",  added: "2d",   tokens: 8400 },
      { id: "f3", name: "beta-feedback-Q2.pdf",     kind: "pdf",  size: "1.2 MB", added: "5d",   tokens: 22100 },
      { id: "f4", name: "pricing-deck-v3.pdf",      kind: "pdf",  size: "640 KB", added: "1w",   tokens: 9600 },
      { id: "f5", name: "messaging-pillars.md",     kind: "md",   size: "8 KB",   added: "1w",   tokens: 1840 },
      { id: "f6", name: "user-interviews.txt",      kind: "txt",  size: "210 KB", added: "2w",   tokens: 41200 },
    ],
    chats: [
      { id: "c1", title: "Synthesize beta feedback themes",         updated: "12m ago", pinned: true },
      { id: "c2", title: "Draft launch announcement post",          updated: "2h ago" },
      { id: "c3", title: "Compare pricing vs. Vercel & Supabase",   updated: "yesterday" },
      { id: "c4", title: "Email sequence for waitlist conversion",  updated: "3d ago" },
      { id: "c5", title: "Risk register for launch week",           updated: "1w ago" },
    ],
  },
  {
    id: "p-research",
    name: "Embeddings Research",
    color: "oklch(0.66 0.14 220)",
    glyph: "ER",
    description: "Evaluating retrieval architectures for the knowledge feature.",
    instructions: "Be rigorous. Show citations to attached papers. Prefer ASCII tables.",
    files: [
      { id: "f1", name: "matryoshka-paper.pdf", kind: "pdf", size: "880 KB", added: "3d", tokens: 14000 },
      { id: "f2", name: "bge-m3-eval.csv",      kind: "csv", size: "62 KB",  added: "5d", tokens: 9100 },
    ],
    chats: [
      { id: "c1", title: "Re-rank vs. hybrid: which is cheaper?", updated: "1h ago" },
      { id: "c2", title: "Chunk size sweep results",              updated: "yesterday" },
    ],
  },
  {
    id: "p-personal",
    name: "Personal Notes",
    color: "oklch(0.68 0.14 155)",
    glyph: "PN",
    description: "Catch-all journal & writing.",
    instructions: "Casual tone. Be a thinking partner, not a search engine.",
    files: [
      { id: "f1", name: "reading-list.md", kind: "md", size: "4 KB", added: "1d", tokens: 800 },
    ],
    chats: [
      { id: "c1", title: "Outline weekend essay", updated: "2d ago" },
    ],
  },
];

// Active chat transcript for "Synthesize beta feedback themes"
const ACTIVE_THREAD = [
  {
    id: "m1",
    role: "user",
    content: "Read through `beta-feedback-Q2.pdf` and `user-interviews.txt`. Pull out the top recurring themes, weighted by frequency. Group by surface (onboarding, editor, billing). Cite snippets where possible.",
    time: "10:42",
    attachments: [{ name: "beta-feedback-Q2.pdf", kind: "pdf" }, { name: "user-interviews.txt", kind: "txt" }],
  },
  {
    id: "m2",
    role: "assistant",
    model: "DeepSeek v4 Flash",
    time: "10:42",
    content: `Pulled signal from **63 beta sessions** + **21 interviews**. Three surfaces dominate; ranked themes below.

### Onboarding — 41% of friction reports
1. **Project setup is opaque** — 18 mentions. Users don't know whether folders or knowledge come first. *"I made three empty projects before I realized the files attach to one."* — B-114
2. **No starter template** — 12 mentions. Users want a "blank vs. example" choice on first project.
3. **API key wall** — 9 mentions. Several beta users churned at the key step.

### Editor — 33%
1. **Streaming feels slow on long files** — 14 mentions. Likely a rendering bottleneck, not API.
2. **Citations break on .csv** — 7 mentions. Reproducible.
3. **Hard to re-attach a file mid-thread** — 6 mentions.

### Billing — 11%
1. Confusion about token vs. message limits (8 mentions).
2. No usage breakdown by project (5 mentions).

> Want me to draft a one-pager prioritizing the top three for the launch-week patch?`,
    citations: [
      { file: "beta-feedback-Q2.pdf", page: 7 },
      { file: "user-interviews.txt", page: "L412" },
    ],
  },
  {
    id: "m3",
    role: "user",
    content: "Yes — keep it under 200 words. Frame as a memo to engineering.",
    time: "10:44",
  },
];

// A partial assistant response we'll "stream" when the user sends a new message.
const STREAM_REPLY = `**Memo: Launch-week patch priorities**
*To: Eng · From: Product · Re: Beta themes → ship list*

Three issues account for **74%** of friction. Each is small, reproducible, and shippable inside the launch freeze.

1. **Project setup flow is opaque** (18 reports). Users can't tell where folders, files, and chats compose. Fix: surface a one-card "what is a project?" affordance on the empty state, plus a labelled order-of-operations.
2. **Streaming feels slow on long files** (14 reports). Suspect render-path, not network — confirm with a profiling pass on threads >40 turns.
3. **Citation parser breaks on .csv** (7 reports, all reproducible). Off-by-one in row indexing; fix is ~30 LoC in \`citation/csv.ts\`.

Out of scope for launch but tracked: API-key wall (move to a deferred state), per-project usage. Both can land in 4.2.1.

Recommend cutting a patch branch tomorrow; I'll own QA scripts.`;

window.PROJECTS = PROJECTS;
window.ACTIVE_THREAD = ACTIVE_THREAD;
window.STREAM_REPLY = STREAM_REPLY;
