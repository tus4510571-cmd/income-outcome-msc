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
- **Late Summary Merge Buttons (2026-08-28):** Implemented manual `🔄 รวมไฟล์ PDF (-sum)` button on detail pages for shop-with-receipt, shop-without-receipt, and a shared `<IncomeMergeButton>` for income transactions with multiple files. Supports fallback downloads from direct URLs (e.g. Supabase Storage relative paths using signed URLs) and automatically converts raw image assets (JPEG/PNG) to PDF format to prevent merge exceptions like `No PDF header found`.

## Deployment

Pushing to `main` on this repository triggers an automatic **Vercel**
production deployment (GitHub integration). There are no other deploy
steps — verify build health at your Vercel project dashboard after pushing.
