# Architecture

## 1. Overview

Income–Outcome Tracker ("MSC Income Outcome") is a single-tenant (per-user)
income & expense bookkeeping web app for the MAISON CRAFT small business.
Users record income/expenses by category, attach evidence files, scan paper
receipts with Gemini OCR, generate Thai accounting documents (receipts,
cash bills, payment vouchers PV, return notes RN), export Excel summaries,
and manage refunds — all from a Thai-language responsive PWA.

## 2. Tech stack

| Layer | Technology | Notes |
|---|---|---|
| Framework | Next.js 16.2.9 (App Router) + React 19.2.4 + TypeScript | `strict` mode; `npm run lint` = ESLint 9 flat config |
| Styling | Tailwind CSS 4 (`@tailwindcss/postcss`) | dark mode via `next-themes`; no CSS modules |
| Database | Supabase Postgres | per-user RLS on every table; region Singapore per README |
| Auth | Supabase Auth (email/password) | profile auto-created by DB trigger; session cookie managed by `@supabase/ssr` |
| File storage | Supabase Storage bucket `transaction-files` (private) **or** Google Drive via Google Apps Script (GAS) Web App | Drive preferred when connected; Storage is fallback |
| OCR / AI | Google Gemini via `@google/genai` | key stored per-user in `settings`; called only in `/api/scan-receipt` + `/api/test-gemini` |
| Documents / exports | `pdf-lib` (image→PDF, merge), `html-to-image` (capture receipt templates as JPEG), `xlsx` (Excel summary export) | client-side |
| PWA | `manifest.ts`, service worker in `/public`, camera capture inputs | installable on phones |
| Icons/UI utils | `lucide-react`, `clsx`, `date-fns` | |

## 3. High-level diagram

```
[Browser / PWA]
   -> Server Components  -> Supabase server client (anon key, RLS) -> Postgres
   -> Server Actions (/src/lib/actions.ts)
        -> Supabase (Postgres CRUD, Storage upload/remove, signed URLs)
        -> GAS Web App (Google Drive upload/move/download/list)  [via fetch]
   -> Route Handlers (/src/app/api/*)
        /api/scan-receipt : images -> Gemini -> JSON line items
        /api/drive-image  : proxy image bytes from Drive (CORS for html-to-image)
        /api/drive-list   : list Drive folder files
        /api/test-gemini  : connectivity ping
   -> Client-side libs: pdf-lib, html-to-image, xlsx (document generation/export)
```

There is no service-role client anywhere; RLS is the only authorization layer.

## 4. Folder structure

```
/src
  /app
    page.tsx                     - landing (links to income/outcome/settings)
    layout.tsx, error.tsx, manifest.ts, globals.css
    login/, forgot-password/, update-password/
    auth/callback/route.ts       - Supabase auth code exchange
    /api
      scan-receipt/route.ts      - Gemini receipt OCR -> JSON
      drive-image/route.ts       - proxy Drive image (signatures use settings IDs)
      drive-list/route.ts        - list files in a Drive folder
      test-gemini/route.ts       - API-key health check
    /(dashboard)                 - authed shell: Sidebar + MobileHeader +
                                   SessionTimeout + ServiceWorkerRegister
      settings/page.tsx          - GAS URL, Drive folders, Gemini key, Shopify,
                                   signatures, company details, theme
      quotation/ (+new)          - PLACEHOLDER only (no DB table yet)
      income/payment-link|chat-direct|branch-transfer
            each: page.tsx, new/page.tsx, [id]/page.tsx (+ detail components)
      income/summary/page.tsx                    - list + Excel export
      income/return-note/[id]/print/page.tsx     - RN document (ใบส่งคืน)
      income/payment-voucher/[id]/print/page.tsx - PV document (ใบสำคัญจ่าย)
      outcome/shop-with-receipt|shop-without-receipt|employee-labor
            each: page.tsx, new/page.tsx, [id]/page.tsx
      outcome/shop-without-receipt/[id]/print/   - cash bill print flow
      outcome/employee-labor/receipt/new/        - employee receipt generator
      outcome/summary/page.tsx                   - list + Excel export
      edit/[id]/page.tsx         - generic transaction editor
  /components                    - Sidebar, MobileHeader, Transaction*,
                                   ReceiptGenerator, ReceiptCaptureTemplate,
                                   CashBillGenerator, EmployeeReceiptGenerator,
                                   RefundModal/Timeline, CustomerRefundModal/
                                   Timeline, FileUpload/FileImage/
                                   PreImageUpload, SessionTimeout,
                                   ServiceWorkerRegister, ThemeProvider
  /lib
    actions.ts                   - ALL Server Actions (single file, by design)
    types.ts                     - shared types, categories, required-file maps,
                                   currency options, formatCurrency()
    drive.ts                     - GAS Web App client (upload/move/overwrite/download)
    pdfUtils.ts                  - image compression, image->PDF, PDF merge
    thaiBaht.ts                  - number -> Thai baht text ("...บาทถ้วน")
    utils.ts, /supabase/{client,server,middleware}.ts
/supabase                        - plain SQL files applied manually (see DATA_MODEL §7)
/public                          - icons, service worker
middleware.ts (root)             - calls updateSession() (auth gate + idle timeout)
*.mjs / *.js at repo root        - one-off dev/test scripts, NOT part of the app
/docs                            - this documentation system
```
Update this tree whenever a top-level folder's purpose changes.

## 5. Core modules / domains

- **Auth & Session** (`login/signup/forgot-password/update-password`,
  `auth/callback`, `/src/lib/supabase/*`, root `middleware.ts`,
  `SessionTimeout`) — email/password auth, auto-profile trigger,
  route protection redirect to `/login`, 15-minute idle timeout.
- **Transactions** (`src/lib/actions.ts`, `(dashboard)/income/*`,
  `(dashboard)/outcome/*`, `edit/[id]`) — CRUD with per-category detail
  forms, joined fetch of details/items/files. Employee-labor supports
  deferred evidence: save with slip only, upload the rest later on the
  detail page, auto download→merge→`-sum` when complete (DECISIONS
  2026-08-23).
- **Files & Drive** (`actions.uploadFile/saveGoogleDriveFileLink/getSignedUrl/deleteTransaction`,
  `lib/drive.ts`, `FileUpload`/`PreImageUpload`, `/api/drive-*`) — evidence
  uploads to GAS-managed Drive or Supabase Storage; deletion moves Drive
  files to a "_deleted" folder.
- **AI receipt scan** (`/api/scan-receipt`) — multi-image OCR to structured
  JSON with auto-balancing; model chosen at runtime from available flash models.
- **Documents** (`ReceiptGenerator`, `ReceiptCaptureTemplate`,
  `CashBillGenerator`, `EmployeeReceiptGenerator`, print pages, `pdfUtils`)
  — Thai-style receipts/cash bills/PV/RN rendered in DOM, captured via
  `html-to-image`, optionally merged into PDFs.
- **Refunds** (`RefundModal/Timeline` for expenses;
  `CustomerRefundModal/Timeline` for income; `recordRefund`,
  `cancelRefund`, `recordCustomerRefund`, `cancelCustomerRefund`) — status +
  evidence stored on the detail tables (no separate ledger).
- **Summaries** (`income/summary`, `outcome/summary`) — filtered lists + XLSX export.
- **Settings** (`settings/page.tsx`, `getSetting`/`setSetting`) — all
  integration credentials are per-user rows in `settings`.

## 6. Request lifecycles (examples)

### Create expense "shop_without_receipt"
1. `outcome/shop-without-receipt/new/page.tsx` collects form + files.
2. Server Action `createTransaction(...)` inserts `transactions` +
   `expense_details`.
3. Each file goes through `uploadFile()` → delete old same-path file →
   Storage upload → insert `transaction_files` row (or
   `saveGoogleDriveFileLink` if uploaded via GAS first).
4. Optional AI scan: images POST to `/api/scan-receipt` → Gemini JSON →
   form pre-filled → `addReceiptItems()` writes items and recomputes amount.
5. Cash-bill print uses `getNextPVNumber(date)` → `PV{พ.ศ.yyyy2}{MM}{seq}`.

### Record customer refund (income side)
1. `CustomerRefundModal` collects amount/date/reason/evidence.
2. Server Action `recordCustomerRefund` generates RN + PV numbers if not
   supplied (`getNextRNNumber`, `getNextPVNumber`), uploads evidence to Drive
   subfolder `Customer_Refund` (fallback Storage), updates
   `income_details.refund_*` columns.

## 7. Key architectural constraints

- Every query is scoped by RLS to `auth.uid()`. Server Actions additionally
  check the user where needed (`getAuthUser`, `.eq("user_id", user.id)`).
- The GAS Web App URL must start `https://script.google.com/` (short URLs get
  redirected and POST degrades to GET). All requests send dates as
  `{date}T12:00:00` to avoid timezone day-shifts.
- Gemini responses must be pure JSON (`responseMimeType: application/json`);
  the route auto-appends a balancing line item if extracted items don't sum
  to `totalAmount` (±0.01 tolerance).
- Amounts are always derived from `receipt_items` when items exist — never
  edit `transactions.amount` independently of items.
- Client bundle size guard: images are compressed (`pdfUtils.compressImageBase64`,
  max width 1600 / JPEG q0.8) before upload or before conversion to PDF to
  stay under server-action payload limits (~4.5 MB).

## 8. Known limitations / technical debt

- Zero test coverage; no CI. Verification is manual.
- DB schema drift between `/supabase/*.sql` and live DB — see
  `DATA_MODEL.md` §7.
- `googleapis` package installed but unused (dead dependency).
- One-off scripts clutter the repo root (`test-*.mjs`, `update-*.js`, ...).
- No pagination on transaction lists; full-history queries per user.
- Quotation module is an empty placeholder (UI only).
