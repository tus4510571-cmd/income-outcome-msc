# Decisions Log

> Append-only. Never edit or delete past entries. New entries go at the
> bottom, newest last.

---

## [2026-01-05] Use pgvector inside Supabase instead of a separate vector DB

**Status:** Accepted

**Context:** Needed vector similarity search for AI task search. Team was
choosing between a dedicated vector DB (Pinecone/Weaviate) and pgvector
inside the existing Supabase Postgres instance.

**Decision:** Use the `pgvector` extension inside Supabase. Single database,
single RLS model, no extra service to operate.

**Alternatives considered:** Pinecone — rejected due to added operational
complexity and cost for expected scale (< 100k tasks in year 1).

**Consequences:** Simpler ops, but query performance may need an IVFFlat/HNSW
index if the table grows past ~500k rows; not yet added.

---

## [2026-01-20] No task-level permissions in v1

**Status:** Accepted

**Context:** Product wanted to ship fast; per-task ACLs add significant
complexity to both schema and RLS policies.

**Decision:** All workspace members can edit/delete all tasks in that
workspace. No task-level ownership restriction in v1.

**Alternatives considered:** Row-level `created_by`-based edit restriction —
deferred to v2, tracked in `PROJECT_STATUS.md`.

**Consequences:** Simpler RLS policies and UI. Risk: no audit trail on who
changed what field (no history table exists yet).

---

## [2026-02-10] Embedding failures are non-blocking

**Status:** Accepted

**Context:** Early testing showed OpenAI API timeouts occasionally blocked
task saves entirely, which was worse than a task temporarily missing from
search.

**Decision:** Task create/update always succeeds even if the embedding call
fails; the task simply won't appear in AI search until re-embedded.

**Alternatives considered:** Retry queue with a background job — deferred,
no infrastructure for background jobs exists yet.

**Consequences:** Search index can silently drift from actual task data.
No monitoring currently alerts on embedding failure rate (gap).

---

> **Validity note (added 2026-08-23):** All entries above this line were
> written for "TaskFlow AI", the template app that previously occupied these
> docs. They never applied to this codebase (which has no pgvector, no
> OpenAI, and no task-level anything). They are preserved because this log
> is append-only; read the entries below for decisions that actually govern
> this codebase.

---

## [2026-08-23] Documentation reset: replaced TaskFlow AI template docs

**Status:** Accepted

**Context:** Every file in `/docs` described a different product (team task
manager with workspaces/pgvector/OpenAI embeddings). Reading them would have
misled any developer or AI agent. Full audit of `/src`, `/supabase`, root
config, and git history was performed and all documents rewritten to match
the real Income–Outcome Tracker app.

**Decision:** Rewrite ARCHITECTURE/DATA_MODEL/BUSINESS_RULES/DEVELOPMENT/
ENVIRONMENT/PROJECT_STATUS/AI_AGENT_GUIDE/HANDOVER from scratch based on
code evidence; keep DECISIONS append-only and annotate stale entries.

**Consequences:** Docs now match reality as of 2026-08-23. Any future change
must follow the update policy in `docs/README.md`.

---

## [2026-08-23] Google Drive integration via Apps Script Web App (not googleapis SDK)

**Status:** Accepted (pre-existing practice; documented from code)

**Context:** Evidence files need durable storage the business owner can
browse natively. Options considered: googleapis service-account SDK vs a
Google Apps Script Web App deployed in the owner's own account.

**Decision:** Route every Drive operation (upload / move-to-deleted /
overwrite / download / list) through a user-configured GAS Web App URL
(`settings.google_apps_script_url`) using simple fetch + JSON. The
`googleapis` npm package stays installed but unused. Folder IDs also come
from per-user settings.

**Alternatives considered:** Service-account SDK (rejected: OAuth setup
burden, files land in a service identity instead of the owner's Drive);
Supabase Storage only (kept as fallback when GAS is not connected).

**Consequences:** No secrets in env; owner sees files in their Drive. Costs:
GAS URL must be the long script.google.com form (short URLs break POST),
dates must carry T12:00:00 against timezone shifts, long filenames can fail,
and the GAS source lives outside this repo.

---

## [2026-08-23] Per-user credentials in the settings table (no server-side secret env vars)

**Status:** Accepted (documented from code)

**Context:** Gemini key, GAS URL, and folder IDs are needed at runtime;
single-business deployment made per-user config simpler than env plumbing.

**Decision:** Store all integration credentials as rows in `settings`
(RLS-scoped), managed via the Settings page. Only the two public Supabase
values live in `.env.local`.

**Consequences:** Zero server-secret management; acceptable exposure under
RLS. Revisit if multi-tenant or admin features ever appear.

---

## [2026-08-23] Refunds modeled as columns on detail tables (no separate ledger)

**Status:** Accepted (documented from code)

**Context:** Expense refunds and customer refunds needed status + evidence
without complicating reporting.

**Decision:** Add `refund_*` columns directly to `expense_details` /
`income_details` and flip `is_refunded` in place; cancellation nulls fields.
Document numbering helpers (PV/RN) generate sequential Thai-year-based
numbers scanned from existing rows.

**Consequences:** Simple queries and UI. Limitations: no refund history /
audit trail, canceling erases metadata though evidence files remain in
Drive/Storage.

---

## [2026-08-23] Plain SQL files instead of supabase CLI migrations

**Status:** Accepted (current state; candidate to reverse)

**Context:** Solo development flow applied SQL directly via the Supabase
SQL Editor.

**Decision (as-is):** Schema changes live as standalone `.sql` files in
`/supabase/` applied manually. Known drift exists between files and live DB
(DATA_MODEL §7).

**Consequences:** Low ceremony but drift risk. Recommendation recorded in
PROJECT_STATUS upcoming items: reconcile drift and consider migrating to
timestamped CLI migrations if team grows.

---

## [2026-08-23] Employee-labor documents may be uploaded late (deferred completion)

**Status:** Accepted

**Context:** Real-world workflow pays wages immediately, but the signed
payment voucher (ใบสำคัญรับเงิน) and ID-card copy arrive days later. The old
creation form hard-required all 3 evidence files, so transactions were
delayed indefinitely waiting for paperwork. Owner asked to save with the
transfer slip only and complete documents later, with the summary page
reporting completeness.

**Decision:**
- Creation (`employee-labor/new`) now requires ONLY the transfer slip.
  Missing ID/receipt => transaction saved as "incomplete" (case 4.2); a
  `-sum` merged PDF is produced ONLY when all 3 files are present (case
  4.1), matching existing Drive layout: per-file PDFs under subfolder
  `ค่าจ้างพนักงาน`, `-sum` at month root.
- Late uploads happen on the detail page (`EmployeeFileSection`). The 3 core
  slots now use the SAME Google-Drive pipeline as creation
  (`convertImageToPdfBase64` → `uploadToGoogleDrive` →
  `saveGoogleDriveFileLink`), replacing the previous behavior where late
  uploads went to Supabase Storage via generic `FileUpload`. When the last
  missing file arrives, the system reads existing rows from
  `transaction_files`, downloads each per-file PDF from Drive
  (`downloadFromGoogleDrive`), merges, and writes `-sum` to month root;
  re-uploads after complete overwrite the old sum
  (`overwriteInGoogleDrive`). New Server Action `updateTransactionFilePath`
  was added (additive).
- Completeness status is DERIVED, not stored: required types
  {transfer_slip, id_card_copy, employee_receipt} minus types present in
  `transaction_files`. Summary `isComplete` fixed to require slip too, and
  its Excel export gained a "เอกสารที่ขาด" column. No schema change.
- `file_name` saved at creation now carries the real Drive filename instead
  of the placeholder "drive-file.pdf", so later merges can reconstruct the
  base name; legacy rows fall back to deriving it from transaction date +
  nickname parsed from description.

**Alternatives considered:**
- Explicit `doc_status`/`doc_missing` columns on `expense_details` — rejected
  (Option B): needs migration, can drift from actual rows, touches a table
  shared with refund logic; derived state cannot go stale.
- Keeping Storage for late uploads — rejected: split one transaction's
  evidence across two stores, `-sum` never updated, breaks Drive-as-archive.
- Merging `-sum` even while incomplete — rejected by owner: incomplete
  records must have no merge file until complete.

**Consequences:** Incomplete transactions are visible and actionable in
summary ("ขาด: ..." chips already rendered by TransactionList). Risk noted:
if a Drive upload succeeds but the DB insert fails, retrying creates one
duplicate file in Drive (harmless, pre-existing pattern). Old transactions
created before this change keep working via the name-derivation fallback.

---

## [2026-08-23] Employee-labor late-upload UX: staged selection + single confirm (replaces instant per-file upload)

**Status:** Accepted

**Context:** The first implementation uploaded each core document the
moment it was picked on the detail page, so there was no confirmation step
and no visible progress — unlike the creation page and shop-without-receipt,
which show an "Accept and save to drive" button with a per-step status list.
Owner asked for parity with that flow.

**Decision:** Detail-page core uploads are now staged: pick files (camera or
file input) → local preview with filename chip (removable) → one "Accept
and save to drive" button runs the pipeline sequentially, rendering a task
list (upload per document, then merge `-sum` when the set becomes complete).
Uploads may be done incrementally across visits; already-uploaded documents
are read-only. Pipeline reuses the same lib functions as creation; failure
stops at the failed step and keeps selections for retry.

**Alternatives considered:** Keep instant upload per file — rejected by
owner (no confirmation/progress); force selecting ALL missing documents
before save — superseded by owner's later instruction to keep incremental
uploads allowed.

**Consequences:** One extra click per batch; behavior otherwise unchanged
(same Drive paths/naming, same derived completeness).

---

## [2026-08-23] Scope discipline: no out-of-scope changes without asking; every push needs owner approval

**Status:** Accepted

**Context:** While delivering the employee-labor help box, the agent also
removed an unused `TransactionCard` import in
`(dashboard)/outcome/employee-labor/page.tsx` and disclosed it only after
the push as a "bonus". The owner challenged it. The removal itself was
verified safe (the component file was untouched, still imported by five
other pages, `tsc` passed, zero runtime impact) — the problem was process:
an unrequested change shipped without prior consent. In the same exchange
the owner set a standing rule about git pushes.

**Decision:**
1. An agent must not make ANY change outside the explicitly requested
   scope — including one-line hygiene such as removing unused imports,
   reformatting, or renaming — without asking the owner first.
2. Every `git push` to `origin/main` requires the owner's explicit approval
   each time, because `main` auto-deploys to Vercel production.
3. When reporting completed work, list exactly which files/lines were
   changed and why, including anything incidental.

**Alternatives considered:**
- Allow silent hygiene fixes bundled into related edits — rejected: hides
  intent, makes diff review harder, erodes trust.
- Revert the unused-import removal — rejected as unnecessary (verified
  safe), but offered to the owner; owner did not request it.

**Consequences:** Slightly more back-and-forth on trivial items, but
predictable diffs and full owner control over what reaches production.
Applies to human developers and AI agents alike.

---

## [2026-08-24] Transaction deletion: interactive progress modal with real-time Google Drive moveToDeleted feedback

**Status:** Accepted

**Context:** The old deletion flow used native `window.confirm()` and silently
ignored Google Drive file moving errors if the GAS Web App failed, giving the user
zero feedback on which files were being moved to the `delete transaction` folder.

**Decision:**
- Replaced `window.confirm` with `DeleteTransactionModal.tsx`.
- Before deletion, fetches and lists all associated evidence files with the target
  Google Drive folder path (`[YYYY] > [MM] > delete transaction`).
- During execution, renders live step-by-step progress (check files → move in
  Google Drive → delete row in Supabase).
- Returns structured results `{ success, movedCount, driveSuccess, driveError }`
  so any Drive error is surfaced clearly instead of being swallowed.

**Consequences:** Better user transparency and reliable audit trail when deleting transactions.

---

## [2026-08-24] PDF merge: ignoreEncryption enabled for PDFDocument.load

**Status:** Accepted

**Context:** When merging employee-labor documents (or any PDFs) downloaded from
Google Drive or bank slips with standard encryption/security metadata, `pdf-lib`
threw `Input document to PDFDocument.load is encrypted`.

**Decision:** Pass `{ ignoreEncryption: true }` into `PDFDocument.load(uint8Array, { ignoreEncryption: true })`
in `mergePdfBase64` (`src/lib/pdfUtils.ts`).

**Consequences:** Prevents runtime errors during `-sum` PDF merge when handling bank slips or PDFs with security metadata.


