# Backend Requests

## Request 1: Fix `lib/agent/process.ts` typos and lint errors
**What**: 
1. Fix TypeScript error `TS2304` at `lib/agent/process.ts:610` by renaming `NEARBY_RESPONDER_RADIUS_KM` to `RESPONDER_SEARCH_RADIUS_KM`.
2. Fix ESLint `prefer-const` error at `lib/agent/process.ts:147` (`let responderQuery` -> `const responderQuery`).
3. Fix ESLint `invalid character` error in `scripts/test-api.mjs`.

**Why**: These pre-existing errors in backend/script files are causing the CI (`next build`) to fail. We cannot deploy or build the frontend until these are fixed or ignored.

**Which screen**: All screens (affects global `next build`).
