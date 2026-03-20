# Bluesky List Converter Implementation Plan

**Goal:** Parse Bluesky list URLs and fetch all members from the public API, displaying a preview.

**Architecture:** `src/list-reader.ts` handles URL parsing, handle-to-DID resolution, and paginated member fetching via the public AppView. `src/ui.ts` provides DOM helpers for rendering previews and errors. Uses `@atproto/api` `BskyAgent` pointed at `https://public.api.bsky.app` for unauthenticated reads.

**Tech Stack:** TypeScript, @atproto/api (BskyAgent), Vitest

**Scope:** 5 phases from original design (phases 1-5)

**Codebase verified:** 2026-03-19 -- greenfield after Phase 1 scaffolding

---

## Acceptance Criteria Coverage

This phase implements and tests:

### bsky-list-converter.AC1: List Reading and Preview
- **bsky-list-converter.AC1.1 Success:** Pasting a valid `bsky.app/profile/{did}/lists/{rkey}` URL fetches and displays list name, description, and member count
- **bsky-list-converter.AC1.2 Success:** Pasting a URL with a handle (not DID) resolves the handle and fetches the list
- **bsky-list-converter.AC1.3 Success:** Lists with >100 members are fully fetched via pagination
- **bsky-list-converter.AC1.4 Failure:** Invalid or malformed URL shows inline validation error
- **bsky-list-converter.AC1.5 Failure:** Non-existent or private list shows clear error with suggestion to check the URL

---

<!-- START_SUBCOMPONENT_A (tasks 1-2) -->
<!-- START_TASK_1 -->
### Task 1: URL parsing module

**Files:**
- Create: `src/list-reader.ts`

**Implementation:**

Create `src/list-reader.ts` with a `parseListUrl` function that extracts the identifier (handle or DID) and rkey from a Bluesky list URL.

URL format: `https://bsky.app/profile/{handle-or-did}/lists/{rkey}`

The function should:
- Accept a string URL
- Use `new URL(url)` for parsing (catches malformed URLs via thrown error)
- Match the pathname against `/profile/([^/]+)/lists/([^/]+)`
- Return `{ identifier: string, rkey: string, isDid: boolean }` on success, or `null` on failure
- Detect DIDs by checking `identifier.startsWith('did:')`

Also add a `resolveHandleToDid` function:
- Takes a handle string
- Calls `https://public.api.bsky.app/xrpc/com.atproto.identity.resolveHandle?handle={handle}` using `fetch`
- Returns the DID string
- Throws on failure with a descriptive message

Also add a `fetchListMembers` function:
- Takes an AT-URI string (format: `at://{did}/app.bsky.graph.list/{rkey}`)
- Paginates through `app.bsky.graph.getList` using `fetch` against `https://public.api.bsky.app/xrpc/app.bsky.graph.getList`
- Uses `limit=100` (max) per page
- Follows `cursor` until no more pages
- Returns `{ list: { name, description, purpose, listItemCount }, members: Array<{ did, handle, displayName }> }`
- Throws on non-OK HTTP responses with status-aware error messages (404 -> "List not found", other -> generic)

Use raw `fetch` rather than `BskyAgent` for these unauthenticated reads. This avoids importing the full `@atproto/api` bundle in the list-reader module (the Agent class is needed later for authenticated writes, but not here).

**Verification:**

Run: `npx tsc --noEmit`
Expected: No type errors

**Commit:** `feat: add URL parsing and list fetching module`
<!-- END_TASK_1 -->

<!-- START_TASK_2 -->
### Task 2: URL parsing and list fetching tests

**Verifies:** bsky-list-converter.AC1.1, bsky-list-converter.AC1.2, bsky-list-converter.AC1.3, bsky-list-converter.AC1.4, bsky-list-converter.AC1.5

**Files:**
- Create: `src/list-reader.test.ts`

**Testing:**

Tests must verify each AC listed above. Mock `globalThis.fetch` (Vitest `vi.fn()`) to simulate API responses -- do not hit real Bluesky APIs.

- **bsky-list-converter.AC1.1:** `parseListUrl` correctly extracts identifier and rkey from a valid DID-based URL like `https://bsky.app/profile/did:plc:abc123/lists/3jwmdfk2kca2t`. Then `fetchListMembers` returns list metadata (name, description) and member array when given a valid AT-URI and fetch returns a successful single-page response.

- **bsky-list-converter.AC1.2:** `parseListUrl` correctly extracts a handle (not DID) from a URL like `https://bsky.app/profile/alice.bsky.social/lists/3jwmdfk2kca2t`, with `isDid: false`. Then `resolveHandleToDid` calls the resolveHandle endpoint and returns the DID from a mocked successful response.

- **bsky-list-converter.AC1.3:** `fetchListMembers` follows pagination cursors. Mock fetch to return 3 pages: first two with `cursor` set, third without. Verify all members from all pages are collected.

- **bsky-list-converter.AC1.4:** `parseListUrl` returns `null` for invalid URLs: empty string, non-bsky.app URL, URL missing the lists segment, URL with missing rkey.

- **bsky-list-converter.AC1.5:** `fetchListMembers` throws a descriptive error when fetch returns 404 (list not found) or other non-OK status. `resolveHandleToDid` throws when the handle doesn't exist (fetch returns error).

**Verification:**

Run: `npm test`
Expected: All tests pass

**Commit:** `test: add list-reader unit tests`
<!-- END_TASK_2 -->
<!-- END_SUBCOMPONENT_A -->

<!-- START_SUBCOMPONENT_B (tasks 3-4) -->
<!-- START_TASK_3 -->
### Task 3: UI helpers module

**Files:**
- Create: `src/ui.ts`

**Implementation:**

Create `src/ui.ts` with DOM helper functions for the list converter UI. These functions get elements by ID from the `index.html` created in Phase 1 and manipulate their content/visibility.

Functions to implement:

`showError(message: string)`: Shows `#error-section` with the error message, hides other dynamic sections.

`clearError()`: Hides `#error-section`.

`showPreview(data: { name: string, description?: string, memberCount: number, sampleHandles: string[] })`: Shows `#preview-section` with:
- List name as a heading
- Description (if present)
- Member count
- First 5 sample handles as a comma-separated list

`hidePreview()`: Hides `#preview-section`.

`setLoading(button: HTMLButtonElement, loading: boolean)`: Disables button and changes text to "Loading..." when true, restores original text when false. Store original text in a `data-original-text` attribute.

Each function should use `document.getElementById()` and set `hidden` attribute or `textContent`/`innerHTML` as appropriate. Use `textContent` for user-provided strings to prevent XSS.

**Verification:**

Run: `npx tsc --noEmit`
Expected: No type errors

**Commit:** `feat: add UI helper functions`
<!-- END_TASK_3 -->

<!-- START_TASK_4 -->
### Task 4: Wire list reading into main.ts

**Files:**
- Modify: `src/main.ts` (replace placeholder content)

**Implementation:**

Update `src/main.ts` to wire the fetch button to the list-reader and UI modules:

1. On DOM load, get references to `#list-url` input and `#fetch-btn` button
2. Add click handler to `#fetch-btn` that:
   - Reads the URL from the input field
   - Calls `clearError()`
   - Calls `setLoading(button, true)`
   - Calls `parseListUrl(url)` -- if null, calls `showError('Invalid Bluesky list URL. Expected format: https://bsky.app/profile/.../lists/...')` and returns
   - If `isDid` is false, calls `resolveHandleToDid(identifier)` to get the DID
   - Constructs the AT-URI: `at://${did}/app.bsky.graph.list/${rkey}`
   - Calls `fetchListMembers(atUri)`
   - On success: calls `showPreview()` with the list data, extracting the first 5 member handles as samples
   - On error: calls `showError()` with a user-friendly message (e.g., "Could not fetch list. Please check the URL and try again.")
   - In finally block: calls `setLoading(button, false)`
3. Store the fetched members array and list metadata in module-level variables so Phase 4 can access them for curatelist creation

**Verification:**

Run: `npm run build`
Expected: Builds without errors

Run: `npm test`
Expected: All existing tests still pass

**Commit:** `feat: wire list reading into main UI flow`
<!-- END_TASK_4 -->
<!-- END_SUBCOMPONENT_B -->
