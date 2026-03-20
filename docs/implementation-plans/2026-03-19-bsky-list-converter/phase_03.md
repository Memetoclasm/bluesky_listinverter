# Bluesky List Converter Implementation Plan

**Goal:** Users can log in with their Bluesky account via OAuth and manage their session.

**Architecture:** `src/auth.ts` wraps `@atproto/oauth-client-browser`'s `BrowserOAuthClient` to provide a simple auth interface: init (detects callback or restores session), login (redirects to Bluesky), logout, and session access. The session object is passed directly to `@atproto/api` `Agent` for authenticated API calls. Session state is persisted in IndexedDB by the library; the app tracks the authenticated DID in localStorage.

**Tech Stack:** TypeScript, @atproto/oauth-client-browser, @atproto/api, Vitest

**Scope:** 5 phases from original design (phases 1-5)

**Codebase verified:** 2026-03-19 -- builds on Phase 1 scaffolding and Phase 2 list-reader

---

## Acceptance Criteria Coverage

This phase implements and tests:

### bsky-list-converter.AC2: Authentication
- **bsky-list-converter.AC2.1 Success:** User can log in via Bluesky OAuth redirect and return authenticated
- **bsky-list-converter.AC2.2 Success:** Authenticated session persists across page refreshes (no re-login needed)
- **bsky-list-converter.AC2.3 Success:** User can log out and UI returns to unauthenticated state
- **bsky-list-converter.AC2.4 Failure:** OAuth failure (user denies, network error) shows retry button with explanation

---

<!-- START_SUBCOMPONENT_A (tasks 1-2) -->
<!-- START_TASK_1 -->
### Task 1: Auth module

**Files:**
- Create: `src/auth.ts`

**Implementation:**

Create `src/auth.ts` that wraps `BrowserOAuthClient` with a clean interface. The module exports an object/class with these capabilities:

**Initialization (`init`):**
- Create a `BrowserOAuthClient` instance using `BrowserOAuthClient.load()` with:
  - `clientId`: Determine dynamically from `window.location.origin + '/bsky-list-converter/client-metadata.json'`
  - `handleResolver`: `'https://bsky.social'`
- Call `client.init()` which does two things: (1) detects OAuth callback params in the URL and processes them, or (2) restores an existing session from IndexedDB
- `client.init()` returns `{ session, state }` on callback/restore, or `undefined` if no session
- Distinguish callback from restore: if `state !== undefined`, it was a fresh OAuth callback (clean up URL with `history.replaceState`)
- Register `client.addEventListener('deleted', ...)` to handle session invalidation across tabs
- If a session is obtained, fetch the user's profile via `Agent` to get their handle (the session only contains the DID, not the handle)
- Return an object with: `{ did: string, handle: string, agent: Agent }` on success, or `null` if not authenticated

**Login (`login`):**
- Accept a handle string (e.g., `"alice.bsky.social"`)
- Call `client.signIn(handle)` -- this redirects the browser and never resolves normally
- Wrap in try/catch: the promise only rejects if the user navigates back or an AbortSignal fires

**Logout (`logout`):**
- Call `session.signOut()` -- revokes the token on the server and clears IndexedDB
- Clear any locally stored DID from localStorage
- Return void

**Error handling:**
- `init` errors: catch and return `null` (user is not authenticated)
- `login` errors: let them propagate to the caller for UI handling
- `signOut` errors: catch and log (best-effort cleanup)

Export types:
```typescript
export interface AuthState {
  did: string
  handle: string
  agent: Agent
}
```

**Verification:**

Run: `npx tsc --noEmit`
Expected: No type errors

**Commit:** `feat: add OAuth authentication module`
<!-- END_TASK_1 -->

<!-- START_TASK_2 -->
### Task 2: Auth module tests

**Verifies:** bsky-list-converter.AC2.1, bsky-list-converter.AC2.3, bsky-list-converter.AC2.4

**Files:**
- Create: `src/auth.test.ts`

**Testing:**

The OAuth flow involves browser redirects, IndexedDB, and crypto operations managed by `@atproto/oauth-client-browser`. Unit testing the full flow is impractical -- the library handles the complex parts internally.

Tests should verify the auth module's own logic by mocking the `BrowserOAuthClient` class:

- **bsky-list-converter.AC2.1:** When `client.init()` returns a result with `state` defined (callback scenario), the auth module returns an `AuthState` with `did`, `handle`, and `agent`. Mock `BrowserOAuthClient.load` to return a client stub whose `init()` resolves with a mock session, and mock `Agent` to return a profile with a handle.

- **bsky-list-converter.AC2.3:** After calling `logout()`, the session's `signOut()` is called and the module returns to unauthenticated state (next call to check state returns null).

- **bsky-list-converter.AC2.4:** When `client.init()` throws (e.g., callback processing fails), the auth module catches the error and returns null, allowing the UI to show an appropriate message. When `client.signIn()` rejects, the error propagates to the caller.

Note: bsky-list-converter.AC2.2 (session persistence across refreshes) is handled entirely by `@atproto/oauth-client-browser`'s IndexedDB storage. This is the library's responsibility and is verified by manual testing, not by mocking.

**Verification:**

Run: `npm test`
Expected: All tests pass

**Commit:** `test: add auth module tests`
<!-- END_TASK_2 -->
<!-- END_SUBCOMPONENT_A -->

<!-- START_SUBCOMPONENT_B (tasks 3-4) -->
<!-- START_TASK_3 -->
### Task 3: Auth UI helpers

**Files:**
- Modify: `src/ui.ts` (add auth-related UI functions)

**Implementation:**

Add these functions to `src/ui.ts`:

`showAuthSection(onLogin: (handle: string) => void)`: Shows `#auth-section` with:
- A text input for the user's Bluesky handle (placeholder: `"your-handle.bsky.social"`)
- A "Log in with Bluesky" button that calls `onLogin` with the handle value
- Clear any previous error in the auth section

`showLoggedIn(handle: string, onLogout: () => void)`: Replaces `#auth-section` content with:
- Text: "Logged in as @{handle}"
- A "Log out" button that calls `onLogout`

`hideAuthSection()`: Hides `#auth-section`.

`showAuthError(message: string)`: Shows an error message within `#auth-section` (below the login form) with a "Try again" affordance. Does not hide the login form itself.

**Verification:**

Run: `npx tsc --noEmit`
Expected: No type errors

**Commit:** `feat: add auth UI helpers`
<!-- END_TASK_3 -->

<!-- START_TASK_4 -->
### Task 4: Wire auth into main.ts

**Files:**
- Modify: `src/main.ts`

**Implementation:**

Update `src/main.ts` to integrate the auth flow:

1. **On page load (before anything else):** Call `auth.init()` to check for OAuth callback or existing session.
   - If a session is returned: store the `AuthState`, show "Logged in as @handle" UI, and if there's list data from a prior fetch, show the "Create Curatelist" button (Phase 4 will implement this)
   - If no session: continue with unauthenticated state

2. **After successful list preview** (in the fetch button handler from Phase 2): Show the auth section below the preview.
   - If already logged in: show "Logged in as @handle" with logout
   - If not logged in: show the login form

3. **Login handler:** When user submits handle:
   - Validate the handle is non-empty
   - Call `auth.login(handle)`
   - On error: call `showAuthError()` with a user-friendly message ("Could not start login. Check your handle and try again.")

4. **Logout handler:** When user clicks logout:
   - Call `auth.logout()`
   - Update UI to show login form again
   - Clear any stored auth state

5. **Error recovery:** If `auth.init()` fails (callback error), show an error message with "Try again" that reloads the page or re-shows the login form.

**Verification:**

Run: `npm run build`
Expected: Builds without errors

Run: `npm test`
Expected: All existing tests still pass

**Commit:** `feat: wire OAuth authentication into main UI`
<!-- END_TASK_4 -->
<!-- END_SUBCOMPONENT_B -->
