# Environment & Configuration

## 1. Environment variables (.env.local)

Only two exist; both are public (anon) values:

| Variable | Purpose | Where to get it | Used in |
|---|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL | Supabase dashboard > Settings > API | all Supabase clients |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | publishable/anon key (`sb_publishable_…`), RLS-restricted | Supabase dashboard > API Keys | all Supabase clients |

`.env.example` mirrors these names with placeholder values.
`.env*` is gitignored. There are NO server-side secret env vars in this
project by design (see §2).

## 2. Per-user runtime settings (DB table `settings`, via Settings page)

All integration credentials are stored per-user in the database, configured
through `/settings`. Key catalog:

| Key | Purpose | Consumer |
|---|---|---|
| `google_apps_script_url` | GAS Web App endpoint for all Drive ops | `lib/drive.ts`, `/api/drive-image`, `/api/drive-list`; must start `https://script.google.com/` |
| `income_drive_folder_id` / `outcome_drive_folder_id` | target Drive folders per transaction type | uploads, refund evidence, delete-to-deleted moves |
| `quotation_drive_folder_id` | reserved for quotation feature | Settings UI only |
| `gemini_api_key` | Gemini OCR key | `/api/scan-receipt`, `/api/test-gemini` |
| `shopify_access_token` / `shopify_store_domain` | saved only — **no feature reads them yet** | Settings UI only |
| `signature_payer_drive_id` / `signature_approver_drive_id` | signature images embedded in PV/RN print pages | resolved via `/api/drive-image?id=signature_payer\|signature_approver` |
| `signature_folder_id` | folder listing signature candidates on Settings page | `/api/drive-list` |
| `company_name` / `company_address` / `company_phone` / `company_email` / `company_tax_id` | "my company" block on generated cash bills / documents | document templates |

Agents: never hardcode values for these keys; always read/write through
`getSetting`/`setSetting`.

## 3. Third-party services / integrations

| Service | Used for | Notes |
|---|---|---|
| Supabase | Auth, Postgres (RLS), Storage bucket `transaction-files` | project region Singapore |
| Google Drive (via user's Apps Script Web App) | evidence + document file storage | **GAS script source is NOT in this repo** — contract documented in `ARCHITECTURE.md` §6 / `lib/drive.ts`; actions used: upload (default), moveToDeleted, overwrite, download (GET), list_files (GET) |
| Google Gemini | receipt OCR JSON extraction | user-supplied key; models probed at runtime (any "flash" model) |
| Shopify | none yet | credentials saved but unused |

## 4. Environments

| Environment | URL | Notes |
|---|---|---|
| Local | http://localhost:3000 | real Supabase project + real Gemini calls; no mocks |
| Production | Vercel (auto-deploy on push to `main` via GitHub integration) | check build status in Vercel project dashboard |
| Staging | none | does not exist — preview deploys per PR if Vercel GitHub app configured for them |

## 5. Secrets management

- Repo/env: only the two public Supabase values (gitignored `.env.local`).
- Everything else lives in the `settings` DB table protected by RLS.
- If a new server-side secret is ever required, add it to `.env.example`
  AND update this file — but prefer the existing per-user settings pattern.

## 6. Quotas / limits worth knowing

- Vercel-style ~4.5 MB server-action payload limit assumed by design —
  images are compressed client-side before upload/scan (`pdfUtils.ts`).
- Gemini: model availability probed at runtime; no hardcoded model name in
  the scan route (only `/api/test-gemini` pins gemini-2.5-flash).
