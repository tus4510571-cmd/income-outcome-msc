# Project Documentation — Income–Outcome Tracker (ระบบรายรับ-รายจ่าย)

This folder is the single source of truth for this project. It exists so that
a new developer, or an AI coding agent, can understand and safely continue
this project without needing to talk to the previous developer.

**Project:** Income–Outcome Tracker ("MSC Income Outcome", branded
MAISON CRAFT) — a Thai-language income & expense bookkeeping web app / PWA
for a small business. Users record income and expenses by category, upload
evidence files (transfer slips, receipts, ID copies) to Google Drive or
Supabase Storage, scan paper receipts with Google Gemini OCR, generate Thai
accounting documents (receipts, cash bills, payment vouchers "PV", return
notes "RN"), and track refunds on both the expense and customer side.

> **History note (2026-08-23):** All documents in this folder were rewritten
> on 2026-08-23. The previous versions described a different app
> ("TaskFlow AI" — task management with workspaces and pgvector) and did not
> match this codebase at all. If you find references to TaskFlow AI,
> workspaces, tasks, pgvector, or OpenAI embeddings anywhere, they are stale
> template leftovers — ignore them.

## Reading order — human developer

1. `ARCHITECTURE.md`
2. `DATA_MODEL.md`
3. `BUSINESS_RULES.md`
4. `DEVELOPMENT.md`
5. `ENVIRONMENT.md`
6. `PROJECT_STATUS.md`
7. `DECISIONS.md`
8. `HANDOVER.md` (only during an active transition)

## Reading order — AI coding agent

See `/AGENTS.md` at the repo root first, then:
1. `AI_AGENT_GUIDE.md` (hard rules — read before writing any code)
2. `DATA_MODEL.md`
3. `ARCHITECTURE.md`
4. `BUSINESS_RULES.md`
5. `DEVELOPMENT.md` / `ENVIRONMENT.md`
6. `PROJECT_STATUS.md`
7. `DECISIONS.md`

## Document ownership (source of truth)

| Topic | Owning document |
|---|---|
| Architecture (current state) | `ARCHITECTURE.md` |
| Database schema, RLS, storage | `DATA_MODEL.md` |
| Domain / business logic | `BUSINESS_RULES.md` |
| Historical technical decisions | `DECISIONS.md` |
| Config, secrets, integrations | `ENVIRONMENT.md` |
| Local setup, workflows | `DEVELOPMENT.md` |
| Current state of work | `PROJECT_STATUS.md` |
| Rules for AI coding agents | `AI_AGENT_GUIDE.md` |
| Team transition checklist | `HANDOVER.md` |

## Update policy

- **Every PR/change that touches code, schema, or business rules:** update
  the matching doc(s) in the same change. An AI agent must not consider a
  task "done" until the matching doc is updated.
- **Any new DB column/table** → `DATA_MODEL.md`, same change.
- **Any new business rule or changed behavior** → `BUSINESS_RULES.md`, same change.
- **Any notable technical decision** → new entry at the bottom of
  `DECISIONS.md` (append-only).
- **Current-state changes** (what's shipped / broken / blocked) → `PROJECT_STATUS.md`.
- **Rarely:** `README.md`, `DEVELOPMENT.md`, `ENVIRONMENT.md`,
  `AI_AGENT_GUIDE.md` — only when process itself changes.
- **Only at handover:** `HANDOVER.md`.
