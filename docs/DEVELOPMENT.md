# Development Guide

## 1. Prerequisites

- Node.js ≥ 18 (LTS recommended), npm
- A Supabase project (region Singapore per README.md at repo root)
- Supabase Project URL + **publishable/anon key** (`sb_publishable_…`)
- For full functionality (configured at runtime in Settings page, NOT env):
  - Google Apps Script Web App URL + Drive folder IDs (income/outcome/quotation)
  - Gemini API key
  - Signature image IDs in Drive (optional, for PV/RN documents)

## 2. Local setup

```bash
git clone <repo>
cd incomeoutcome-app
npm install
cp .env.example .env.local   # fill NEXT_PUBLIC_SUPABASE_URL / _ANON_KEY
npm run dev                  # http://localhost:3000
```

Database bootstrap (one-time, manual — there are no CLI migrations):
1. Run `/supabase/schema.sql` in Supabase SQL Editor.
2. Run `/supabase/storage-policies.sql`.
3. Create private storage bucket `transaction-files`
   (see comment at top of storage-policies.sql).
4. Run `/supabase/refund-migration.sql`, then
   `/supabase/customer-refund-migration.sql`.
5. Optional sample data: `/supabase/seed.sql` (replace the hardcoded demo
   user UUID with a real auth user first).

Then open the app → Settings page → connect GAS URL + folder IDs (+ Gemini
key) before testing upload/AI features.

## 3. Commands

| Command | Purpose |
|---|---|
| `npm run dev` | local dev server |
| `npm run build` / `npm run start` | production build / serve |
| `npm run lint` | ESLint (flat config, `eslint.config.mjs`) |
| `npx tsc --noEmit` | typecheck (no npm script exists — run manually) |

There is NO test command, NO CI pipeline (no `.github/`), and no staging
environment. Verification is manual via `npm run dev`.

Root-level `*.mjs`/`*.js` files (`test-db.mjs`, `test-gemini*.mjs`,
`update-headers.js`, …) are one-off developer utilities — not part of the
app, not wired into any script.

## 4. Coding conventions

- All Server Actions in `/src/lib/actions.ts` (single-file convention);
  pattern: get auth user → create server client → query; throw Thai-error
  `Error`s (no `{data,error}` wrapper).
- Shared domain types/constants ONLY in `/src/lib/types.ts`.
- Pages: Server Components where possible; interactive forms are Client
  Components calling Server Actions or API routes. Never put Supabase keys
  or queries in new places.
- Files kebab-case for components? No — this repo uses PascalCase filenames
  for components (`TransactionCard.tsx`) and route folders kebab-case.
  Follow existing style.
- Tailwind utility classes only; inline styles reserved for capture
  templates (html-to-image needs fixed px widths).
- New SQL changes: standalone `.sql` file in `/supabase/` + apply in SQL
  Editor + update `DATA_MODEL.md` (including drift table §7).

## 5. Testing

None exists. Required manual verification for changes:
- Create/edit/delete each affected transaction category.
- Upload flow with GAS configured AND without (Storage fallback).
- Print/capture pages render after your change (html-to-image is sensitive
  to layout/CSS changes).
- `npx tsc --noEmit` clean.

If you add tests, document the framework choice here and add the npm script.

## 6. Deployment

Production hosting is **Vercel**, wired through the GitHub integration:
every push to `main` (`git push origin main`) triggers an automatic
production deployment. No manual deploy step exists. Check build/runtime
status in the Vercel project dashboard (access not managed in-repo).
Note: `pdfUtils.ts` comments indicate a ~4.5 MB server-action payload limit
was considered during development, consistent with Vercel.

## 7. Troubleshooting

| Symptom | Cause / fix |
|---|---|
| Drive upload fails mentioning Short URL / POST converted to GET | Settings has a shortened script.google.com URL — replace with full /exec URL |
| Upload error "upsert / UPDATE policy" | Expected: code deletes then re-uploads; don't "fix" by adding upsert |
| Gemini 400 "API key missing" | Set gemini_api_key on the Settings page (per-user), not .env |
| 413 Payload Too Large on scan | Image compression skipped — ensure files pass through compressImageBase64 |
| Wrong day on Drive files/documents | Some path bypassed the T12:00:00 date guard — see BUSINESS_RULES §9 |
| Session logs out quickly | last-activity cookie expired (15-min idle timeout by design) |
