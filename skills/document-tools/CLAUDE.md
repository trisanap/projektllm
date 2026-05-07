# Document Tools

Always use `python {SKILL_DIR}/tools.py <category> <action> [args]` when the user works with DOCX, XLSX, PDF, or Markdown files. Each command outputs JSON on stdout. Never ask the user what tool to use — decide based on what they're trying to do with the file.

## Operations

### DOCX

| Command | Description |
|---------|-------------|
| `docx create <output.docx> --title T --json data.json` | Create from JSON structure |
| `docx edit <file.docx> --replace old=new --append text` | Find/replace, append |
| `docx to-md <file.docx> [--output out.md]` | Extract as Markdown |

**JSON for `docx create --json`:**
```json
[
  {"type": "heading", "level": 1, "text": "Title"},
  {"type": "paragraph", "text": "Body", "bold": true},
  {"type": "table", "headers": ["A","B"], "rows": [["1","2"]]},
  {"type": "image", "path": "chart.png", "width": 5},
  {"type": "page_break"},
  {"type": "list", "items": ["a", "b"]}
]
```

### XLSX

| Command | Description |
|---------|-------------|
| `xlsx create <out.xlsx> --json data.json` | From JSON array |
| `xlsx create <out.xlsx> --csv data.csv` | From CSV |
| `xlsx edit <file.xlsx> --set "Sheet!A1=value"` | Set cells |
| `xlsx convert <input.csv> [--output out.xlsx]` | CSV/TSV ↔ XLSX |

### PDF

| Command | Description |
|---------|-------------|
| `pdf read <file.pdf> [--output text.txt]` | Extract text + tables |
| `pdf merge --inputs a.pdf b.pdf -o out.pdf` | Merge PDFs |
| `pdf split <file.pdf> --pages 1-3,5 -o out.pdf` | Extract pages |
| `pdf watermark <file.pdf> -w "DRAFT" -o out.pdf` | Add watermark |
| `pdf encrypt <file.pdf> -p password -o out.pdf` | Password-protect |

### Markdown

| Command | Description |
|---------|-------------|
| `md to-docx <file.md> -o out.docx` | Markdown → styled DOCX |

## About

**projektLLM** — AI-powered project management workflow.
Repo: https://github.com/trisanap/projektllm
