# AI Agent Guide

## 1. Read this first

Before making any change, read in order:
1. `/AGENTS.md` (repo root)
2. `DATA_MODEL.md`
3. `ARCHITECTURE.md`
4. `BUSINESS_RULES.md`
5. `DEVELOPMENT.md`

All UI text is **Thai**, hardcoded. Do not introduce i18n unless asked.
The product owner reads Thai; error messages thrown to users are in Thai.

## 2. Hard rules (do not violate)

- There is **no service-role/admin Supabase client in this codebase, by
  design**. Never create one. Every query goes through the anon-key SSR
  clients in `/src/lib/supabase/client.ts` (browser) or
  `/src/lib/supabase/server.ts` (server), protected by per-user RLS.
- **Gemini API calls are allowed only inside route handlers**
  (`/src/app/api/scan-receipt/route.ts`, `/src/app/api/test-gemini/route.ts`).
  The Gemini API key comes from the per-user `settings` table
  (`gemini_api_key`), never from env vars.
- **All Google Drive access goes through `/src/lib/drive.ts`**, which calls a
  Google Apps Script (GAS) Web App whose URL each user configures in
  Settings. Do NOT use the `googleapis` npm package — it is installed but
  intentionally unused (see `DECISIONS.md` 2026-08-23 entry). Do not hardcode
  any Drive folder IDs; they come from user settings.
- Server Actions live only in `/src/lib/actions.ts`. Follow its existing
  pattern: get the auth user first, then query via the server client. These
  actions **throw** `Error` with Thai messages on failure — there is no
  `{ data, error }` return wrapper. Keep throwing unless asked to refactor,
  and keep messages in Thai.
- Files are stored in exactly two places: Supabase Storage bucket
  `transaction-files` (path pattern in `DATA_MODEL.md` §5) or Google Drive
  via GAS. Preserve the **delete-then-upload workaround** in
  `uploadFile()` — the storage bucket has no UPDATE policy on purpose.
- Employee-labor core evidence (`transfer_slip`, `id_card_copy`,
  `employee_receipt`) must ALWAYS use the Google-Drive pipeline
  (`lib/drive.ts` + `saveGoogleDriveFileLink`), including late uploads on
  the detail page — never the generic `FileUpload`(Storage). Storage is
  reserved for that page's optional `attachment_N` extras. Detail-page core
  uploads run through the staged confirm flow in `EmployeeFileSection`
  (select → preview → "Accept and save to drive" button → task list); do
  not reintroduce instant upload-on-pick. Completeness is derived from
  `transaction_files` types — do not add a stored status column without
  revisiting `DECISIONS.md` 2026-08-23.
- Any new database column or table: add the ALTER/CREATE SQL as a new file
  in `/supabase/` AND apply it manually in the Supabase SQL Editor, AND add
  it to `DATA_MODEL.md` in the same change. See `DATA_MODEL.md` §7 for the
  known schema-drift list — fix drift when you touch an affected area.
- Never invent a business rule not documented in `BUSINESS_RULES.md`. If a
  requirement is ambiguous, state the assumption explicitly instead of
  guessing silently.
- Tailwind only — no CSS modules, no styled-components. Inline `style=`
  appears only in document-capture templates (fixed pixel widths needed by
  `html-to-image`); do not spread that pattern elsewhere.
- Do not assume things that do not exist: no background jobs/queues, no
  teams/workspaces/multi-tenancy, no Stripe/OpenAI/pgvector, no CI, no test
  framework, no staging environment (see §5).
- **Scope discipline:** never change anything outside the explicitly
  requested scope — including one-line hygiene (unused imports, formatting,
  renames) — without asking first. List every changed file/line when
  reporting.
- **Push approval:** never run `git push` without the owner's explicit
  approval for that instance; pushing `main` auto-deploys to Vercel
  production (see DECISIONS.md 2026-08-23 scope-discipline entry).

## 3. Code conventions the agent must follow

- App Router under `/src/app`; dashboard pages under
  `/src/app/(dashboard)/<domain>/...` with `page.tsx` (+ optional
  `new/page.tsx`, `[id]/page.tsx`, `[id]/print/page.tsx`).
- Data fetching: Server Components call the Supabase server client directly
  or call Server Actions; Client Components never create their own Supabase
  queries except `signOut` in `Sidebar.tsx` and theme/session helpers.
- All shared types/constants (categories, required files, currency options,
  `formatCurrency`) live in `/src/lib/types.ts`. Reuse them; do not redefine
  category strings inline.
- Document numbering helpers (`getNextDailySequence`, `getNextMonthlySequence`,
  `getNextPVNumber`, `getNextRNNumber`) are Server Actions — always reuse
  them; never compute PV/RN numbers client-side.
- Amount math rule used everywhere: line total = `quantity * unit_price`;
  transaction amount is recomputed as the sum of receipt items whenever
  items change (see `addReceiptItems` / `updateReceiptItems`).
- Dates: store plain `YYYY-MM-DD` strings. When sending dates to GAS, append
  `T12:00:00` (timezone-shift protection — see `DECISIONS.md`).
- New reusable components go in `/src/components/`. Domain-specific page
  subcomponents may live next to their page (e.g. `IncomeDetailContent.tsx`).

## 4. What "done" means for a task

There is currently **no automated lint gate beyond `npm run lint`** (ESLint),
no typecheck script, and no tests (see `DEVELOPMENT.md`). Therefore:
- `npm run lint` passes and `npx tsc --noEmit` passes (run it manually).
- You manually exercised every affected flow in `npm run dev` (create /
  edit / delete transaction, file upload, print page, refund flow — whichever
  apply). This app has zero test coverage, so your manual verification IS the
  safety net. State in your summary what you verified.
- If a DB change was made: SQL file added to `/supabase/`, applied, and
  `DATA_MODEL.md` updated in the same change.
- If business behavior changed: `BUSINESS_RULES.md` updated in the same change.
- If a notable technical decision was made: entry appended to `DECISIONS.md`.
- `PROJECT_STATUS.md` updated if the change affects current state.

## 5. Things this repo does NOT have (don't assume)

- No background job queue / cron — everything runs inside requests.
- No multi-user organizations: strict single-owner data model; users only
  ever see their own rows (RLS `auth.uid() = user_id`).
- No i18n framework — Thai-only hardcoded strings.
- No mobile app codebase — this is a responsive web PWA
  (`manifest.ts`, service worker in `/public`, camera capture supported).
- No automated tests, no CI/CD pipelines (no `.github/` directory).
- No documented production hosting/deployment target — see
  `PROJECT_STATUS.md` "Risks and unknowns".
- No Stripe, OpenAI, pgvector, workspaces, or tasks — those existed only in
  the old template docs and were removed 2026-08-23.
- Quotation module (`/quotation`) is a UI placeholder — no DB table exists.

## 6. Escalation

If a task requires information not present in `/docs`, state clearly what
is missing rather than guessing, and add a note to `PROJECT_STATUS.md`
"Risks and unknowns" so it isn't lost. Known missing information is listed
there already (deployment target, GAS script source code, Shopify usage).
