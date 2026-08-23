# Project Status

## Current state (as of 2026-08-23)

**Milestone:** Documentation reset completed — `/docs` rewritten to match
the actual codebase after being discovered describing a foreign app
("TaskFlow AI" template).

**What's working / shipped (verified in code + git log):**
- Income recording across payment_link / chat_direct / branch_transfer,
  outcome recording across shop_with_receipt / shop_without_receipt /
  employee_labor, generic editor (`edit/[id]`)
- Evidence uploads: Supabase Storage + Google Drive via GAS, delete moves
  Drive files to a deleted area
- Gemini receipt OCR with runtime model fallback + auto-balancing line items
- Expense refund & reversal tracking with evidence (company_direct /
  via_personal)
- Customer refund & goods return (Non-VAT) with auto RN/PV numbering and
  print pages (ใบส่งคืนสินค้า, ใบสำคัญจ่าย)
- Cash bill generation/printing for shop_without_receipt; monthly PV
  sequence `PV{พ.ศ.}{MM}####`
- Income/outcome summaries with Excel (xlsx) export
- PWA: manifest, service worker, camera capture, Maison Craft branding
- Session security: middleware auth gate + 15-min idle timeout
- Dark mode, Thai baht text conversion, multi-currency display
- Employee-labor deferred documents (2026-08-23): save with slip only,
  late upload via Drive pipeline with auto `-sum` merge on completion,
  summary completeness report + "เอกสารที่ขาด" Excel column

**In progress / placeholder:**
- Quotation module: list + "create" pages exist but are empty placeholders
  (no table, no persistence)

## Recent changes log (from git history)

```
[2026-08] feat(income-refund): customer refund & goods return system (RN/PV generator)
[2026-08] feat: monthly PV document sequence (PV69080001)
[2026-08] feat(refund): expense refund & reversal system with evidence tracking
[2026-08] feat(pwa): manifest, service worker, camera capture, logo/branding
[2026-08] feat: session timeout, validation popups, multi-file AI scan UX
[2026-08] fix: image compression before AI scan (413), GAS timezone/date fixes
[2026-08-23] docs: full documentation rewrite (was stale TaskFlow AI template)
```

## Known issues / technical debt

- Schema drift between `/supabase/*.sql` and live DB:
  `expense_details.receipt_number`, `income_details.deposit_info`,
  stale `transaction_files.file_type` CHECK (see DATA_MODEL §7).
- Zero automated tests; zero CI. All verification manual.
- No pagination anywhere; lists load full history per user.
- `googleapis` dependency installed but never imported (remove candidate).
- One-off scripts accumulate at repo root.
- Shopify credentials saved in Settings but unused by any feature.

## Blocked items (and why)

- Quotation feature blocked on schema decision (no quotations table exists;
  numbering/storage approach undefined).

## Risks and unknowns

- **Deployment target undocumented** — how/where production runs is not
  captured anywhere in the repo. Ask the owner or inspect hosting dashboard.
- **GAS Web App source code is outside this repo** — the Drive integration's
  contract is documented here (lib/drive.ts), but the Apps Script project
  itself must be obtained from the business owner.
- Per-user secrets (Gemini key, GAS URL) stored in `settings` protected only
  by RLS; acceptable now, revisit if features expose settings broadly.
- `seed.sql` contains a hardcoded real-looking user UUID — replace before
  sharing dumps externally.

## Upcoming (suggested next steps)

1. Reconcile schema drift (write corrective SQL, close DATA_MODEL §7).
2. Decide quotation data model, then implement create flow.
3. Add minimal smoke tests (Vitest) for Server Actions numbering helpers.
4. Remove `googleapis` dependency; move root one-off scripts into /scripts.
5. Document deployment pipeline once known.
