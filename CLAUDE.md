# Bluesky List Converter

Last verified: 2026-03-19

## Purpose

Browser-only tool that converts Bluesky moderation lists into curatelists (pinnable feeds). No backend -- runs entirely in the browser via the AT Protocol public API and OAuth.

## Tech Stack

- Language: TypeScript 5.x
- Bundler: Vite 6
- Auth: `@atproto/oauth-client-browser` (browser OAuth with IndexedDB session storage)
- API: `@atproto/api` (AT Protocol client)
- Testing: Vitest 4 with jsdom
- Deploy: GitHub Pages via GitHub Actions

## Commands

- `npm run dev` -- Start Vite dev server (localhost:5173)
- `npm test` -- Run all tests once
- `npm run test:watch` -- Run tests in watch mode
- `npm run build` -- Type-check then production build to `dist/`

## Project Structure

- `src/auth.ts` -- OAuth module: init, login, logout, session management
- `src/list-reader.ts` -- URL parsing, handle resolution, list member fetching (public API)
- `src/list-writer.ts` -- Curatelist creation with rate-limit backoff (authenticated API)
- `src/ui.ts` -- DOM helpers: show/hide sections, render preview/progress/results
- `src/main.ts` -- Entry point: wires modules together, manages app state
- `src/style.css` -- Mobile-first responsive styles
- `public/client-metadata.json` -- OAuth client metadata (URLs must match deployment)
- `index.html` -- Single-page shell with section placeholders

## Module Contracts

### auth (src/auth.ts)

- **Exposes**: `init()`, `login(handle)`, `logout()`, `getAuthState()`, `AuthState`
- **Guarantees**: `init()` returns `AuthState | null`; handles OAuth callback detection and session restore from IndexedDB; cleans URL after callback redirect
- **Expects**: `client-metadata.json` served at `{origin}/bsky-list-converter/client-metadata.json`
- **Invariant**: `login()` throws if `init()` not called first; `logout()` is best-effort (never throws)

### list-reader (src/list-reader.ts)

- **Exposes**: `parseListUrl(url)`, `resolveHandleToDid(handle)`, `fetchListMembers(atUri)`, `ListMember`, `ListData`
- **Guarantees**: `parseListUrl` returns null on invalid input (never throws); `fetchListMembers` paginates automatically (limit 100/page); intentional API errors use `ApiError` class, unexpected errors are wrapped with context
- **Expects**: Public Bluesky API available at `public.api.bsky.app`
- **No auth required** -- reads public API only

### list-writer (src/list-writer.ts)

- **Exposes**: `createCuratelist(agent, name, description, memberDids, onProgress)`, `atUriToListUrl(atUri)`, `CreateListResult`, `ProgressCallback`
- **Guarantees**: Creates list record first, then adds members one-by-one; retries 429s with exponential backoff (max 5 retries, max 60s delay); 100ms throttle between members; calls `onProgress` after every member (success or failure); never throws on individual member failure (collects errors in result)
- **Expects**: Authenticated `Agent` instance with valid session
- **Invariant**: List creation failure throws immediately (no partial state); member failures are collected, not thrown

### ui (src/ui.ts)

- **Exposes**: `showError`, `clearError`, `showPreview`, `setLoading`, `showAuthSection`, `showLoggedIn`, `showAuthError`, `showCreateForm`, `showProgress`, `showResult`, `showCreateError`
- **Guarantees**: Each `show*` function hides conflicting sections; all DOM access uses `getElementById` with null guards
- **Expects**: DOM elements with specific IDs from `index.html` (error-section, preview-section, auth-section, progress-section, result-section, etc.)

### main (src/main.ts)

- **Orchestrator** -- no public API; wires auth, list-reader, list-writer, and ui together
- **Exports**: `fetchedListData`, `fetchedMembers`, `currentAuthState` (module-level state, exported for testing)
- **Flow**: DOM ready -> auth.init() -> fetch button click -> parse URL -> resolve DID -> fetch members -> show preview -> auth/login -> create curatelist -> show result

## Conventions

- Flat source structure (no subdirectories under `src/`)
- Each module has a co-located `.test.ts` file
- Tests mock `fetch` globally; auth tests mock the `@atproto` packages
- Vite base path is `/bsky-list-converter/` (matches GitHub Pages deployment)
- Error handling: functional returns (null) for validation, thrown errors for API failures

## Boundaries

- Safe to edit: `src/`, `index.html`, `src/style.css`, `vite.config.ts`
- Coordinate carefully: `public/client-metadata.json` (OAuth URLs must match deployment domain)
- Do not edit: `package-lock.json` (auto-generated), `.github/workflows/` (CI config)

## Gotchas

- OAuth `client-metadata.json` contains hardcoded URLs -- must be updated when deploying to a different domain
- `login()` redirects the browser (never returns normally) -- callers catch only pre-redirect errors
- List writer rate-limit backoff resets on success -- a single 429 mid-batch does not permanently slow the process
- `_resetAuthState()` in auth.ts is test-only; not part of public API
