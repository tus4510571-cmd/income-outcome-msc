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

## Deployment

Pushing to `main` on this repository triggers an automatic **Vercel**
production deployment (GitHub integration). There are no other deploy
steps — verify build health at your Vercel project dashboard after pushing.
