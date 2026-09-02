# Agent Instructions

This repository has a structured documentation system in `/docs`. Before
making any change, read `/docs/AI_AGENT_GUIDE.md`, then follow the reading
order defined there. 

## Golden Rules for Agents:
1. **Document ONLY Verified, Implemented Reality:** Never write hypothetical,
   unimplemented, or speculative features into `/docs` or `AGENTS.md`. Everything
   documented must strictly match the verified codebase and database schema.
2. **Scope Discipline:** Never change files or code outside the requested scope
   (including cleanups or unused imports) without asking the owner first.
3. **Push Approval:** Never run `git push` without explicit owner approval,
   as pushing to `main` auto-deploys to Vercel production.
4. **Throw Thai Errors:** Server Actions throw `Error` with user-friendly Thai messages.

Full documentation index: `/docs/README.md`

## Recent Accomplishments (Verified Implemented Features)

- **Universal Summary Check (2026-08-24):** Added universal summary (`-sum.pdf`) file completeness check across all Income and Outcome categories.
- **AI Scan PDF Upload Fix (2026-08-24):** Optimized Gemini OCR endpoint and bypassed canvas compression for PDF files.
- **Non-Mandatory Transfer Slip (2026-08-28):** Allowed saving shop-with-receipt without immediately forcing transfer slip upload, and bypassed auto-merge on incomplete creations.
- **Late Summary Merge Buttons (2026-08-28):** Implemented manual `🔄 รวมไฟล์ PDF (-sum)` button on detail pages for shop-with-receipt, shop-without-receipt, and a shared `<IncomeMergeButton>` for income transactions with multiple files. Supports fallback downloads from direct URLs (e.g. Supabase Storage relative paths using signed URLs), automatically converts raw image assets (JPEG/PNG) to PDF format, handles binary stream mapping (e.g. `application/octet-stream` to image format based on file extensions), merges all attached documents (including business cards and custom attachments) in the correct layout order, and constructs descriptive, standardized filenames (with date, daily sequence, and shop name suffix) dynamically if files in legacy records lack naming prefixes.
- **Flexible Shop-with-Receipt Creation (2026-09-02):** Removed mandatory restrictions on transfer slip, seller ID card, and item list uploads during new transaction creation in `shop-with-receipt/new`. Users can save with only the tax invoice/receipt uploaded to Google Drive. The system skips auto-merging `-sum.pdf` if documents are incomplete and registers missing documents in Supabase so the transaction is labeled `incomplete` in summary views, allowing users to return later to upload remaining files and perform a manual summary merge.
- **Structured Employee Address in Receipt Generator (2026-09-03):** Replaced the single optional textarea for employee address in `outcome/employee-labor/receipt/new` with distinct fields: House No. (`บ้านเลขที่`), Village No. (`หมู่`), Street (`ถนน`), Sub-district (`ตำบลหรือแขวง`), District (`อำเภอหรือเขต`), and Province (`จังหวัด`), and mapped them directly to the matching blank positions on the printable `EmployeeReceiptGenerator` payment voucher template.

## Deployment

Pushing to `main` on this repository triggers an automatic **Vercel**
production deployment (GitHub integration). There are no other deploy
steps — verify build health at your Vercel project dashboard after pushing.
