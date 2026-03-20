# Bluesky List Converter Implementation Plan

**Goal:** Create a curatelist in the authenticated user's account with all members from the source moderation list, with progress tracking, error handling, and rate limit management.

**Architecture:** `src/list-writer.ts` creates the list record and adds members one at a time via `com.atproto.repo.createRecord`, using the authenticated `Agent` from the OAuth session. Each member addition is an independent API call with a throttle delay and exponential backoff on 429 responses. Errors on individual member additions are collected (not thrown) so the operation continues through partial failures. UI shows real-time progress and a summary at completion.

**Tech Stack:** TypeScript, @atproto/api (Agent, com.atproto.repo.createRecord), Vitest

**Scope:** 5 phases from original design (phases 1-5)

**Codebase verified:** 2026-03-19 -- builds on Phases 1-3

---

## Acceptance Criteria Coverage

This phase implements and tests:

### bsky-list-converter.AC3: Curatelist Creation
- **bsky-list-converter.AC3.1 Success:** Authenticated user can create a curatelist containing all members from the source modlist
- **bsky-list-converter.AC3.2 Success:** New list is created with purpose `app.bsky.graph.defs#curatelist` (not modlist)
- **bsky-list-converter.AC3.3 Success:** User can edit the new list's name before creation
- **bsky-list-converter.AC3.4 Success:** Progress bar shows during member addition ("Adding member N of M...")
- **bsky-list-converter.AC3.5 Success:** On completion, a clickable `bsky.app` link to the new list is displayed

### bsky-list-converter.AC4: Error Handling During Creation
- **bsky-list-converter.AC4.1 Success:** Partial failure (some members fail to add) completes remaining members and shows summary ("Added 310 of 312. 2 failed.")
- **bsky-list-converter.AC4.2 Success:** Rate limiting (429 response) triggers automatic backoff and retry
- **bsky-list-converter.AC4.3 Failure:** If list record creation itself fails, user sees clear error and can retry

---

<!-- START_SUBCOMPONENT_A (tasks 1-2) -->
<!-- START_TASK_1 -->
### Task 1: List writer module

**Files:**
- Create: `src/list-writer.ts`

**Implementation:**

Create `src/list-writer.ts` that uses an authenticated `Agent` to create a curatelist and add members.

**Types to export:**

```typescript
export interface CreateListResult {
  listUri: string
  listUrl: string
  added: number
  failed: number
  errors: Array<{ did: string; error: string }>
}

export type ProgressCallback = (current: number, total: number) => void
```

**`createCuratelist` function:**
- Parameters: `agent: Agent`, `name: string`, `description: string`, `memberDids: string[]`, `onProgress: ProgressCallback`
- Returns: `Promise<CreateListResult>`

Step 1 -- Create the list record:
```typescript
const listResponse = await agent.com.atproto.repo.createRecord({
  repo: agent.did!,
  collection: 'app.bsky.graph.list',
  record: {
    $type: 'app.bsky.graph.list',
    purpose: 'app.bsky.graph.defs#curatelist',
    name,
    description,
    createdAt: new Date().toISOString(),
  },
})
const listUri = listResponse.data.uri
```

If this call fails, throw the error immediately (AC4.3 -- caller handles retry).

Step 2 -- Add members one at a time:
- Iterate through `memberDids`
- For each member, call `createRecord` with collection `app.bsky.graph.listitem`:
  ```typescript
  {
    $type: 'app.bsky.graph.listitem',
    subject: memberDid,
    list: listUri,  // AT-URI from step 1 -- MUST contain app.bsky.graph.list
    createdAt: new Date().toISOString(),
  }
  ```
- Call `onProgress(current, total)` after each member (success or fail)
- On success: increment `added` counter, wait 100ms before next call
- On error with HTTP 429: implement exponential backoff:
  - Parse `RateLimit-Reset` header if available to calculate wait time
  - Otherwise, double the delay starting from 2 seconds (2s, 4s, 8s, 16s, max 60s)
  - Retry the same member after waiting
  - Reset backoff delay on success
- On other errors: collect the error in the `errors` array, continue to next member (AC4.1)

Step 3 -- Construct result:
- Convert `listUri` to a bsky.app URL: parse DID and rkey from the AT-URI (`at://{did}/app.bsky.graph.list/{rkey}`) and construct `https://bsky.app/profile/{did}/lists/{rkey}`
- Return `{ listUri, listUrl, added, failed: errors.length, errors }`

**`atUriToListUrl` helper** (also export for use in UI):
```typescript
export function atUriToListUrl(atUri: string): string {
  const withoutScheme = atUri.replace('at://', '')
  const parts = withoutScheme.split('/')
  return `https://bsky.app/profile/${parts[0]}/lists/${parts[2]}`
}
```

**Verification:**

Run: `npx tsc --noEmit`
Expected: No type errors

**Commit:** `feat: add list writer with progress tracking and rate limit handling`
<!-- END_TASK_1 -->

<!-- START_TASK_2 -->
### Task 2: List writer tests

**Verifies:** bsky-list-converter.AC3.1, bsky-list-converter.AC3.2, bsky-list-converter.AC3.3, bsky-list-converter.AC3.4, bsky-list-converter.AC3.5, bsky-list-converter.AC4.1, bsky-list-converter.AC4.2, bsky-list-converter.AC4.3

**Files:**
- Create: `src/list-writer.test.ts`

**Testing:**

Mock the `Agent` class -- specifically `agent.com.atproto.repo.createRecord` and `agent.did`. Tests verify the list-writer's own logic (record construction, error collection, retry behavior).

- **bsky-list-converter.AC3.1:** `createCuratelist` calls `createRecord` once for the list and once per member DID. Given 3 member DIDs, verify 4 total `createRecord` calls. Verify the returned `added` count equals the number of members. Additionally, assert that each `listitem` record's `list` field equals the AT-URI returned from the list creation call and contains `app.bsky.graph.list` as the collection segment (not `app.bsky.list` -- see atproto issue #2730).

- **bsky-list-converter.AC3.2:** The list record passed to the first `createRecord` call has `purpose: 'app.bsky.graph.defs#curatelist'` and `$type: 'app.bsky.graph.list'`. NOT modlist.

- **bsky-list-converter.AC3.3:** When a custom name is passed to `createCuratelist` (different from the source list name), the list record's `name` field in the `createRecord` call matches the custom name, not the original source name.

- **bsky-list-converter.AC3.4:** The `onProgress` callback is called once per member with incrementing `current` values: `(1, N)`, `(2, N)`, ..., `(N, N)` where N is the total member count. Use a spy (`vi.fn()`) to verify call count and arguments.

- **bsky-list-converter.AC4.1:** When `createRecord` succeeds for the list and 2 of 3 members but throws a non-429 error for one member, the function still completes all members and returns `{ added: 2, failed: 1, errors: [{ did: '...', error: '...' }] }`.

- **bsky-list-converter.AC4.2:** Two sub-cases for rate limit handling. Use `vi.useFakeTimers` to avoid real delays:
  - *Default backoff:* When `createRecord` throws with `status: 429` and no `RateLimit-Reset` header, the function uses exponential backoff (starting at 2s) and retries the same member. Verify the member is retried and ultimately succeeds.
  - *Header-based backoff:* When `createRecord` throws with `status: 429` and includes a `RateLimit-Reset` header (Unix timestamp), the function waits until that timestamp before retrying. Assert the delay applied corresponds to the header value rather than the default doubling.

- **bsky-list-converter.AC4.3:** When the initial list `createRecord` call throws, the function throws immediately without attempting to add members.

Also test `atUriToListUrl`:
- `at://did:plc:abc123/app.bsky.graph.list/rkey123` returns `https://bsky.app/profile/did:plc:abc123/lists/rkey123`

**Verification:**

Run: `npm test`
Expected: All tests pass

**Commit:** `test: add list writer tests`
<!-- END_TASK_2 -->
<!-- END_SUBCOMPONENT_A -->

<!-- START_SUBCOMPONENT_B (tasks 3-4) -->
<!-- START_TASK_3 -->
### Task 3: Creation UI helpers

**Files:**
- Modify: `src/ui.ts` (add creation-related UI functions)

**Implementation:**

Add these functions to `src/ui.ts`:

`showCreateForm(listName: string, onCreate: (name: string) => void)`: Shows a section within `#preview-section` (below the list preview) with:
- An editable text input pre-filled with `listName` (AC3.3)
- A "Create Curatelist" button that calls `onCreate` with the current input value
- The input has `maxlength="64"` (AT Protocol name limit)

`showProgress(current: number, total: number)`: Shows `#progress-section` with:
- Text: "Adding member {current} of {total}..."
- A `<progress>` element with `value={current}` and `max={total}` (AC3.4)

`showResult(listUrl: string, added: number, failed: number, errors: Array<{ did: string; error: string }>)`: Shows `#result-section` with:
- If `failed === 0`: "Successfully added all {added} members!"
- If `failed > 0`: "Added {added} of {added + failed}. {failed} failed." (AC4.1)
- A clickable link: `<a href="{listUrl}" target="_blank">View your new curatelist</a>` (AC3.5)
- If errors exist: a collapsible details section listing failed DIDs

`showCreateError(message: string, onRetry: () => void)`: Shows an error in `#result-section` with the message and a "Retry" button (AC4.3).

**Verification:**

Run: `npx tsc --noEmit`
Expected: No type errors

**Commit:** `feat: add creation UI helpers`
<!-- END_TASK_3 -->

<!-- START_TASK_4 -->
### Task 4: Wire list creation into main.ts

**Files:**
- Modify: `src/main.ts`

**Implementation:**

Update `src/main.ts` to add the curatelist creation flow:

1. After successful list preview AND authentication, show the create form (using the source list's name as the default).

2. When user clicks "Create Curatelist":
   - Disable the button
   - Get the list name from the editable input
   - Get the `agent` from the auth state
   - Get the `memberDids` array collected during list reading (stored in module-level variable from Phase 2)
   - Construct a description: `"Converted from {source list name}"`
   - Call `createCuratelist(agent, name, description, memberDids, onProgress)`
   - Wire `onProgress` to `showProgress(current, total)`
   - On success: call `showResult(result.listUrl, result.added, result.failed, result.errors)`
   - On error (list creation failed): call `showCreateError(message, retryFn)` where `retryFn` re-triggers the creation

3. The flow should be: Input URL -> Fetch & Preview -> Login -> Create Curatelist -> Result
   - Each step reveals the next section
   - Use the `hidden` attribute on sections to control visibility

**Verification:**

Run: `npm run build`
Expected: Builds without errors

Run: `npm test`
Expected: All existing tests still pass

**Commit:** `feat: wire curatelist creation into main UI flow`
<!-- END_TASK_4 -->
<!-- END_SUBCOMPONENT_B -->
