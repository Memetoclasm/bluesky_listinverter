# Bluesky List Converter — Human Test Plan

## Prerequisites

- Node.js 18+ installed
- Repository cloned and dependencies installed: `npm install`
- `npx vitest run` passes all 66 tests
- For local testing: `npm run dev` starts a dev server (typically at `http://localhost:5173`)
- A Bluesky account with at least one moderation list available for testing
- A known public moderation list URL (DID-based and handle-based variants)

## Phase 1: List Reading and Preview

| Step | Action | Expected |
|------|--------|----------|
| 1.1 | Open the app at `http://localhost:5173` | Page loads with a URL input field and a "Fetch List" button |
| 1.2 | Paste a valid DID-based list URL and click Fetch | List name, description, and member count are displayed in a preview section |
| 1.3 | Clear the input, paste a handle-based URL and click Fetch | Same preview appears — handle is resolved to DID transparently |
| 1.4 | Paste an invalid URL such as `https://example.com/not-a-list` and click Fetch | An inline error message appears indicating the URL is invalid |
| 1.5 | Paste a URL for a non-existent list (change the rkey to random characters) and click Fetch | An error message appears indicating the list was not found |
| 1.6 | Fetch a list known to have more than 100 members | The preview shows the full member count (not capped at 100) |

## Phase 2: Authentication

| Step | Action | Expected |
|------|--------|----------|
| 2.1 | After fetching a list, locate the authentication section | A handle input field and "Log in with Bluesky" button are visible |
| 2.2 | Enter a valid Bluesky handle and click the login button | Browser redirects to bsky.app authorization page |
| 2.3 | On the authorization page, click "Authorize" | Browser redirects back to the app; UI shows "Logged in as @yourhandle" |
| 2.4 | Hard-refresh the page (Ctrl+Shift+R) | The app still shows the authenticated state without requiring re-login |
| 2.5 | Close the tab, open a new tab, navigate to the app URL | The app still shows the authenticated state |
| 2.6 | Click the "Log out" button | The UI returns to the unauthenticated state |
| 2.7 | Refresh the page after logging out | The app remains in the unauthenticated state |

## Phase 3: OAuth Failure Handling

| Step | Action | Expected |
|------|--------|----------|
| 3.1 | Enter a valid handle and click login | Browser redirects to Bluesky authorization page |
| 3.2 | On the authorization page, click "Cancel" or "Deny" | Browser redirects back to the app |
| 3.3 | Observe the app UI | An error message explains the login was not completed; a retry affordance is visible |
| 3.4 | Click "Try again" | The login flow restarts correctly |

## Phase 4: Curatelist Creation

| Step | Action | Expected |
|------|--------|----------|
| 4.1 | Fetch a moderation list and log in (per Phases 1-2) | Preview is visible and user is authenticated |
| 4.2 | Locate the list name input; confirm it is pre-filled with the source list's name | The name field contains the original list name and is editable |
| 4.3 | Change the name to something distinct (e.g., "My Test Curatelist") | The input accepts the new name |
| 4.4 | Click "Create Curatelist" | A progress indicator appears showing "Adding member N of M..." |
| 4.5 | Observe the progress bar during creation | A progress element fills as members are added |
| 4.6 | Wait for creation to complete | A success message appears with a clickable bsky.app link |
| 4.7 | Click the bsky.app link | Opens in a new tab showing the newly created curatelist |
| 4.8 | Verify the new list on bsky.app | The list has the custom name, purpose is curatelist (not moderation), and contains all members |

## Phase 5: Error Handling During Creation

| Step | Action | Expected |
|------|--------|----------|
| 5.1 | Trigger a list creation failure (e.g., revoke OAuth token or disconnect network during creation) | A clear error message appears explaining the list could not be created |
| 5.2 | Observe the UI | A "Retry" button is visible with a descriptive error message |
| 5.3 | Restore connectivity / re-authorize, then click Retry | The creation process restarts successfully |

## Phase 6: Deployment and Shareability

| Step | Action | Expected |
|------|--------|----------|
| 6.1 | Enable GitHub Pages in repository settings with "GitHub Actions" as source | Pages settings show the deployment source is configured |
| 6.2 | Push to `main` or manually trigger the deploy workflow | GitHub Actions workflow runs and completes successfully |
| 6.3 | Navigate to `https://{USERNAME}.github.io/bsky-list-converter/` | The app loads and is functional |
| 6.4 | Navigate to `https://{USERNAME}.github.io/bsky-list-converter/client-metadata.json` | JSON file is served with correct client_id, redirect_uris, and client_uri |
| 6.5 | On the deployed app, complete the full OAuth flow | Login succeeds with production URLs |
| 6.6 | Open the deployed app on a mobile device (or Chrome DevTools at 375px width) | No horizontal scrolling; text is readable; buttons are tappable; full flow works |
| 6.7 | Open README.md in the repository | Describes the tool, links to the live app, explains development setup |

## End-to-End: Full Conversion Flow

1. Open the app at the production URL (or localhost for local testing)
2. Paste a real moderation list URL (handle-based)
3. Click Fetch. Confirm the list name, description, and member count appear.
4. Enter your Bluesky handle and click "Log in with Bluesky"
5. Authorize the app on bsky.app
6. Confirm redirect back to the app with "Logged in as @yourhandle"
7. Optionally edit the list name
8. Click "Create Curatelist"
9. Watch the progress bar increment from 1 to N
10. When complete, click the bsky.app link
11. On bsky.app, verify: the list exists, is a curatelist, has the expected name, and member count matches

## End-to-End: Large List Pagination + Rate Limiting

1. Find or create a moderation list with 200+ members
2. Paste its URL and fetch it. Confirm the member count matches the full list (not 100)
3. Log in and create a curatelist from this list
4. If rate limiting occurs, confirm the app pauses and resumes automatically
5. On completion, verify the new curatelist on bsky.app has the same number of members

## Traceability

| Acceptance Criterion | Automated Test | Manual Step |
|----------------------|----------------|-------------|
| AC1.1 - DID URL fetches metadata | `list-reader.test.ts` | 1.2 |
| AC1.2 - Handle URL resolves to DID | `list-reader.test.ts` | 1.3 |
| AC1.3 - Paginated fetch | `list-reader.test.ts` | 1.6 |
| AC1.4 - Invalid URL error | `list-reader.test.ts` | 1.4 |
| AC1.5 - Non-existent list error | `list-reader.test.ts` | 1.5 |
| AC2.1 - OAuth login | `auth.test.ts` | 2.1-2.3 |
| AC2.2 - Session persistence | — | 2.4-2.5 |
| AC2.3 - Logout | `auth.test.ts` | 2.6-2.7 |
| AC2.4 - OAuth failure retry | `auth.test.ts` | 3.1-3.4 |
| AC3.1 - All members in curatelist | `list-writer.test.ts` | 4.8 |
| AC3.2 - Curatelist purpose | `list-writer.test.ts` | 4.8 |
| AC3.3 - Editable name | `list-writer.test.ts` | 4.2-4.3 |
| AC3.4 - Progress bar | `list-writer.test.ts` | 4.4-4.5 |
| AC3.5 - bsky.app link | `list-writer.test.ts` | 4.6-4.7 |
| AC4.1 - Partial failure summary | `list-writer.test.ts` | E2E Large List |
| AC4.2 - Rate limit backoff | `list-writer.test.ts` | E2E Large List |
| AC4.3 - List creation failure retry | `list-writer.test.ts` | 5.1-5.3 |
| AC5.1 - GitHub Pages live | — | 6.1-6.3 |
| AC5.2 - Production OAuth | — | 6.4-6.5 |
| AC5.3 - Mobile responsive | — | 6.6 |
| AC5.4 - README docs | — | 6.7 |
