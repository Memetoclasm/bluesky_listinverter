# Test Requirements: Bluesky List Converter

**Document date:** 2026-03-19
**Design source:** `docs/design-plans/2026-03-19-bsky-list-converter.md`
**Implementation plans:** `docs/implementation-plans/2026-03-19-bsky-list-converter/phase_0{1-5}.md`

Each acceptance criterion is mapped to either an automated test with a specified file path, or human verification with justification and a documented verification procedure.

---

## AC1: List Reading and Preview

### AC1.1 - Valid DID-based URL fetches list metadata

**Criterion:** Pasting a valid `bsky.app/profile/{did}/lists/{rkey}` URL fetches and displays list name, description, and member count.

**Coverage:** Automated unit test

**Test file:** `src/list-reader.test.ts`

**Test description:** Two assertions contribute to this criterion. First, `parseListUrl` is called with a URL containing a literal DID (e.g., `https://bsky.app/profile/did:plc:abc123/lists/3jwmdfk2kca2t`) and the result is asserted to contain `{ identifier: 'did:plc:abc123', rkey: '3jwmdfk2kca2t', isDid: true }`. Second, `fetchListMembers` is called with a mocked `fetch` that returns a single-page `app.bsky.graph.getList` response containing list name, description, and a small member array; the returned object is asserted to have the correct `list.name`, `list.description`, and a `members` array length matching the mocked response.

**Rationale:** `list-reader.ts` uses raw `fetch` (not `BskyAgent`) by design, keeping the module free of the full `@atproto/api` bundle. Mocking `globalThis.fetch` in Vitest is the correct unit testing approach for this boundary. The display half of this criterion (rendering to DOM) is not tested in isolation because `ui.ts` DOM helpers are intentionally untested at unit level; the data retrieval path is the testable contract.

---

### AC1.2 - Handle-based URL resolves to DID before fetch

**Criterion:** Pasting a URL with a handle (not DID) resolves the handle and fetches the list.

**Coverage:** Automated unit test

**Test file:** `src/list-reader.test.ts`

**Test description:** `parseListUrl` is called with a handle-based URL (e.g., `https://bsky.app/profile/alice.bsky.social/lists/3jwmdfk2kca2t`) and the result is asserted to have `{ isDid: false, identifier: 'alice.bsky.social' }`. Then `resolveHandleToDid` is called with a mocked `fetch` returning a `com.atproto.identity.resolveHandle` response body containing a DID; the returned value is asserted to equal that DID.

**Rationale:** Handle resolution is an independent network call to a separate XRPC endpoint. Testing `parseListUrl` and `resolveHandleToDid` separately in unit tests is more precise than integration-testing the full chain. The `isDid` flag drives whether `main.ts` calls `resolveHandleToDid`; verifying the flag is set correctly is sufficient to confirm the branching logic will function correctly when wired together.

---

### AC1.3 - Paginated fetch collects all members

**Criterion:** Lists with more than 100 members are fully fetched via pagination.

**Coverage:** Automated unit test

**Test file:** `src/list-reader.test.ts`

**Test description:** `fetchListMembers` is called with a `fetch` mock that returns three sequential pages: the first two responses include a `cursor` value in the body, the third has no `cursor`. Each page contains a distinct set of member entries. The test asserts that the returned `members` array contains the combined members from all three pages and that `fetch` was called three times (once per page).

**Rationale:** Pagination correctness is a pure logic concern in `fetchListMembers` -- the loop terminates when there is no cursor in the response. This is directly testable by controlling the sequence of mocked responses. The 100-member page size maximum comes from the AT Protocol `getList` API; testing with three pages (not two) confirms the loop iterates correctly rather than short-circuiting after one continuation.

---

### AC1.4 - Invalid or malformed URL shows inline error

**Criterion:** Invalid or malformed URL shows inline validation error.

**Coverage:** Automated unit test

**Test file:** `src/list-reader.test.ts`

**Test description:** `parseListUrl` is called with each of the following inputs and asserted to return `null` in all cases: empty string, a non-bsky.app URL (`https://example.com/profile/foo/lists/bar`), a bsky.app URL with no `/lists/` segment (`https://bsky.app/profile/alice.bsky.social`), and a bsky.app URL with a missing rkey (`https://bsky.app/profile/alice.bsky.social/lists/`).

**Rationale:** URL validation is a pure function with no I/O, making it ideal for exhaustive unit testing. The `null` return value is the agreed contract between `list-reader.ts` and `main.ts`.

---

### AC1.5 - Non-existent or private list shows error with suggestion

**Criterion:** Non-existent or private list shows a clear error with a suggestion to check the URL.

**Coverage:** Automated unit test

**Test file:** `src/list-reader.test.ts`

**Test description:** `fetchListMembers` is called twice with different mocked `fetch` error responses. In the first case, `fetch` resolves with a 404 response; the test asserts that `fetchListMembers` throws an error whose message includes "not found" or similar phrasing. In the second case, `fetch` resolves with a 500 response; the test asserts a thrown error with a generic message. Additionally, `resolveHandleToDid` is tested with a non-OK response, asserting it throws with a descriptive error.

**Rationale:** Error message content matters for UX. Testing it at the module level (before DOM rendering) ensures the right strings reach the UI layer. The design specifies "suggestion to check the URL" as a content requirement, making message-content assertions appropriate here.

---

## AC2: Authentication

### AC2.1 - User can log in via Bluesky OAuth and return authenticated

**Criterion:** User can log in via Bluesky OAuth redirect and return authenticated.

**Coverage:** Automated unit test (partial) + Human verification

**Test file:** `src/auth.test.ts`

**Test description (automated):** The `BrowserOAuthClient` is mocked via `vi.mock('@atproto/oauth-client-browser')`. When `BrowserOAuthClient.load()` returns a stub whose `init()` resolves with `{ session: mockSession, state: 'some-state' }`, the auth module's `init()` is asserted to return an `AuthState` object with non-null `did`, `handle`, and `agent` fields. The `state` being defined signals a fresh OAuth callback (not a session restore).

**Human verification procedure:**
1. Run `npm run dev` locally.
2. Open the app in a browser.
3. Paste a valid moderation list URL and fetch it.
4. Enter a Bluesky handle and click "Log in with Bluesky".
5. Confirm redirect to `bsky.app` authorization page.
6. Authorize the app on the bsky.app UI.
7. Confirm redirect back to the app with the handle displayed as "Logged in as @handle".

---

### AC2.2 - Authenticated session persists across page refreshes

**Criterion:** Authenticated session persists across page refreshes (no re-login needed).

**Coverage:** Human verification

**Justification:** Session persistence is implemented entirely inside `@atproto/oauth-client-browser`'s IndexedDB storage with non-extractable crypto keys. Mocking the library's internal IndexedDB state would be circular and would not test the actual behavior.

**Human verification procedure:**
1. Complete the OAuth login flow (see AC2.1 human verification steps).
2. Confirm the app shows "Logged in as @handle".
3. Hard-refresh the browser (Ctrl+Shift+R or Cmd+Shift+R).
4. Confirm the app still shows "Logged in as @handle" without prompting for login.
5. Close and reopen the browser tab.
6. Navigate to the app URL.
7. Confirm the app still shows "Logged in as @handle".

---

### AC2.3 - User can log out and UI returns to unauthenticated state

**Criterion:** User can log out and UI returns to unauthenticated state.

**Coverage:** Automated unit test

**Test file:** `src/auth.test.ts`

**Test description:** The auth module is initialized with a mocked session. The test calls `logout()` and asserts that `mockSession.signOut()` was called. It then verifies that subsequent calls to check the session state return an unauthenticated result (null).

---

### AC2.4 - OAuth failure shows retry button with explanation

**Criterion:** OAuth failure (user denies, network error) shows a retry button with explanation.

**Coverage:** Automated unit test (error propagation) + Human verification (UI presentation)

**Test file:** `src/auth.test.ts`

**Test description (automated):** Two scenarios. First: `init()` throws (failed callback); assert the auth module catches it and returns `null`. Second: `signIn()` rejects; assert the error propagates to the caller.

**Human verification procedure:**
1. Run the app and navigate to the login step.
2. Enter a valid Bluesky handle and click "Log in with Bluesky".
3. On the Bluesky authorization page, click "Cancel" or "Deny".
4. Confirm the app shows an error message explaining the login was not completed.
5. Confirm a "Try again" button or equivalent affordance is visible and functional.

---

## AC3: Curatelist Creation

### AC3.1 - Curatelist contains all members from source modlist

**Criterion:** Authenticated user can create a curatelist containing all members from the source modlist.

**Coverage:** Automated unit test

**Test file:** `src/list-writer.test.ts`

**Test description:** Mock `agent.com.atproto.repo.createRecord` to succeed. Call `createCuratelist` with 3 member DIDs. Assert: 4 total `createRecord` calls (1 list + 3 members); `added` count equals 3; each `listitem` record's `list` field equals the AT-URI from the list creation call; each `list` field contains `app.bsky.graph.list` as the collection segment (guarding against atproto issue #2730).

---

### AC3.2 - New list is created with curatelist purpose

**Criterion:** New list is created with purpose `app.bsky.graph.defs#curatelist` (not modlist).

**Coverage:** Automated unit test

**Test file:** `src/list-writer.test.ts`

**Test description:** Inspect the first `createRecord` call's `record` argument. Assert `record.purpose === 'app.bsky.graph.defs#curatelist'` and `record.$type === 'app.bsky.graph.list'`. Negative assertion confirms purpose is not `'app.bsky.graph.defs#modlist'`.

---

### AC3.3 - User can edit the new list's name before creation

**Criterion:** User can edit the new list's name before creation.

**Coverage:** Automated unit test (name propagation) + Human verification (UI interaction)

**Test file:** `src/list-writer.test.ts`

**Test description (automated):** Call `createCuratelist` with a custom `name`. Assert the list `createRecord` call receives `record.name` equal to the custom name.

**Human verification procedure:**
1. Fetch a moderation list, log in.
2. Confirm the name input is pre-filled and editable.
3. Change the name, click Create.
4. Open the resulting bsky.app link and confirm the new name.

---

### AC3.4 - Progress bar shows during member addition

**Criterion:** Progress bar shows during member addition ("Adding member N of M...").

**Coverage:** Automated unit test (callback invocation) + Human verification (visual rendering)

**Test file:** `src/list-writer.test.ts`

**Test description (automated):** Pass a `vi.fn()` spy as `onProgress`. Assert it was called N times with arguments `(1, N)`, `(2, N)`, ..., `(N, N)`.

**Human verification procedure:**
1. Fetch a list with 10+ members, log in, click Create.
2. Confirm progress text updates with incrementing counts.
3. Confirm a `<progress>` bar fills as members are added.

---

### AC3.5 - Clickable bsky.app link displayed on completion

**Criterion:** On completion, a clickable `bsky.app` link to the new list is displayed.

**Coverage:** Automated unit test (URL construction) + Human verification (link display)

**Test file:** `src/list-writer.test.ts`

**Test description (automated):** `atUriToListUrl('at://did:plc:abc123/app.bsky.graph.list/rkey123')` returns `https://bsky.app/profile/did:plc:abc123/lists/rkey123`. `createCuratelist`'s returned `listUrl` is a valid bsky.app URL.

**Human verification procedure:**
1. Complete a curatelist creation.
2. Confirm a link appears.
3. Click it, confirm it opens bsky.app showing the new curatelist.

---

## AC4: Error Handling During Creation

### AC4.1 - Partial failure completes remaining members and shows summary

**Criterion:** Partial failure (some members fail to add) completes remaining members and shows summary ("Added 310 of 312. 2 failed.").

**Coverage:** Automated unit test

**Test file:** `src/list-writer.test.ts`

**Test description:** Mock `createRecord` to fail on 1 of 3 member calls (non-429 error). Assert the function resolves (doesn't throw), returns `{ added: 2, failed: 1 }`, `errors` has one entry, and `onProgress` was called 3 times (all members attempted).

---

### AC4.2 - Rate limiting triggers automatic backoff and retry

**Criterion:** Rate limiting (429 response) triggers automatic backoff and retry.

**Coverage:** Automated unit test

**Test file:** `src/list-writer.test.ts`

**Test description:** Two sub-cases with `vi.useFakeTimers()`:
- *Default backoff:* 429 without `RateLimit-Reset` header; assert member retried after ~2s delay and ultimately succeeds.
- *Header-based backoff:* 429 with `RateLimit-Reset` header (Unix timestamp); assert delay matches the header value rather than default doubling.

---

### AC4.3 - List record creation failure shows retry option

**Criterion:** If list record creation itself fails, user sees a clear error and can retry.

**Coverage:** Automated unit test (error propagation) + Human verification (UI)

**Test file:** `src/list-writer.test.ts`

**Test description (automated):** Mock `createRecord` to throw on the first call (list creation). Assert `createCuratelist` throws, exactly 1 `createRecord` call was made, and `onProgress` was never called.

**Human verification procedure:**
1. Trigger a list creation failure.
2. Confirm a clear error message appears.
3. Confirm a "Retry" button is visible and functional.

---

## AC5: Deployment and Shareability

### AC5.1 - App is live on GitHub Pages

**Criterion:** App is live on GitHub Pages at a shareable URL.

**Coverage:** Human verification

**Justification:** Deployment liveness depends on GitHub infrastructure configuration outside the codebase.

**Human verification procedure:**
1. Enable GitHub Pages with "GitHub Actions" as source.
2. Push to `main` or manually trigger the deploy workflow.
3. Navigate to `https://{username}.github.io/bsky-list-converter/`.
4. Confirm the app loads.
5. Confirm `client-metadata.json` is served at the expected URL.

---

### AC5.2 - OAuth flow works with production URLs

**Criterion:** OAuth flow works with production GitHub Pages URLs.

**Coverage:** Human verification

**Justification:** OAuth client registration validation happens at runtime by the Bluesky authorization server. Cannot be tested locally.

**Human verification procedure:**
1. Confirm `client-metadata.json` has correct production URLs.
2. Navigate to the deployed app.
3. Complete the full OAuth flow against the production URL.
4. Confirm redirect back to the GitHub Pages URL with authenticated state.

---

### AC5.3 - UI is usable on mobile

**Criterion:** UI is usable on mobile (responsive layout).

**Coverage:** Human verification

**Justification:** Responsive CSS behavior requires visual inspection in an actual mobile browser or DevTools emulation.

**Human verification procedure:**
1. Open the app on a mobile device or Chrome DevTools device emulation (375px viewport).
2. Confirm no horizontal scroll, readable text, tappable buttons.
3. Complete the full flow (paste URL, fetch, login, create) on mobile.

---

### AC5.4 - README documents usage and development setup

**Criterion:** README documents what the tool does, links to the live app, and explains development setup.

**Coverage:** Human verification

**Human verification procedure:**
1. Open `README.md`.
2. Confirm it describes the tool's purpose.
3. Confirm a link to the live app is present and resolves.
4. Confirm development setup instructions include `git clone`, `npm install`, `npm run dev`.
5. Confirm deployment instructions explain `client-metadata.json` URL replacement.

---

## Summary Table

| Criterion | Type | File / Approach |
|-----------|------|-----------------|
| AC1.1 | Automated unit test | `src/list-reader.test.ts` |
| AC1.2 | Automated unit test | `src/list-reader.test.ts` |
| AC1.3 | Automated unit test | `src/list-reader.test.ts` |
| AC1.4 | Automated unit test | `src/list-reader.test.ts` |
| AC1.5 | Automated unit test | `src/list-reader.test.ts` |
| AC2.1 | Automated + human | `src/auth.test.ts` + OAuth round-trip |
| AC2.2 | Human verification | Session persistence check |
| AC2.3 | Automated unit test | `src/auth.test.ts` |
| AC2.4 | Automated + human | `src/auth.test.ts` + OAuth denial |
| AC3.1 | Automated unit test | `src/list-writer.test.ts` |
| AC3.2 | Automated unit test | `src/list-writer.test.ts` |
| AC3.3 | Automated + human | `src/list-writer.test.ts` + editable name |
| AC3.4 | Automated + human | `src/list-writer.test.ts` + progress bar |
| AC3.5 | Automated + human | `src/list-writer.test.ts` + link display |
| AC4.1 | Automated unit test | `src/list-writer.test.ts` |
| AC4.2 | Automated unit test | `src/list-writer.test.ts` |
| AC4.3 | Automated + human | `src/list-writer.test.ts` + retry button |
| AC5.1 | Human verification | GitHub Pages deployment |
| AC5.2 | Human verification | Production OAuth flow |
| AC5.3 | Human verification | Mobile browser check |
| AC5.4 | Human verification | README content review |
