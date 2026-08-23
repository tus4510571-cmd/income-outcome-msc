# Handover Record

## Handover: Previous developer -> Next developer / AI agent (2026-08-23)

### Documentation audit (completed 2026-08-23, full docs rewrite)

- [x] `ARCHITECTURE.md` reflects the current system — rewritten from code audit
- [x] `DATA_MODEL.md` matches SQL files; **live-DB drift documented in §7**
      (`expense_details.receipt_number`, `income_details.deposit_info`,
      stale `transaction_files.file_type` CHECK)
- [x] `BUSINESS_RULES.md` reflects current behavior — verified against
      actions.ts, API routes, and pages
- [x] `ENVIRONMENT.md` matches `.env.example` (2 public vars only) and lists
      every per-user settings key
- [x] `PROJECT_STATUS.md` current as of this date
- [x] `AI_AGENT_GUIDE.md` rewritten with hard rules matching this codebase
- [x] `DECISIONS.md` annotated: pre-2026-08-23 entries belong to the old
      "TaskFlow AI" template and never applied here

### Access checklist

- [ ] Repository access transferred
- [ ] Supabase project access transferred (region Singapore)
- [ ] Hosting/deployment access transferred — **target currently undocumented**;
      capture it in `DEVELOPMENT.md` §6 during transfer
- [ ] Google account owning the Apps Script Web App + Drive folders transferred
- [ ] Gemini API key ownership transferred (key itself lives in per-user settings)
- [ ] All credentials rotated after transfer

### Open risks / tribal knowledge not yet written down

- The **GAS Web App source code is not in this repo** — obtain it from the
  outgoing owner or the Drive integration becomes a black box.
- Live DB may differ from `/supabase` files beyond DATA_MODEL §7 — run a
  schema dump comparison when access is granted.
- No automated tests/CI exist; ask the owner about any manual QA habits.
- Shopify settings keys suggest a planned integration that was never built —
  confirm with owner whether to keep or remove.

### Outgoing contact

Unknown at time of writing. If a transition window exists, record it here.
