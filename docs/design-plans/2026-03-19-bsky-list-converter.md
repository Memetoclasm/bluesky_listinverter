# Bluesky List Converter Design

## Summary

This tool is a client-side web application that converts a Bluesky moderation list into a curatelist -- a different list type that users can pin as a feed in the Bluesky app. Moderation lists and curatelists share the same member structure in the AT Protocol but serve different purposes: moderation lists drive block/mute actions, while curatelists are user-curated follow feeds. Currently there is no native Bluesky UI for this conversion, leaving users to recreate lists manually.

The application runs entirely in the browser with no backend. It reads the source moderation list from the public Bluesky AppView API without requiring authentication, then asks the user to log in via Bluesky's OAuth flow. Once authenticated, it writes the new curatelist and its member records directly to the user's PDS (Personal Data Server) -- the AT Protocol node that stores their data. The whole conversion pipeline -- URL parsing, paginated member fetching, OAuth, and batched record creation with progress reporting -- is handled in vanilla TypeScript bundled by Vite and hosted as a static site on GitHub Pages.

## Definition of Done

1. **A tool** that takes a Bluesky moderation list URL and creates a curatelist with the same members in the user's account
2. **Reads all members** from the source moderation list (handling pagination)
3. **Creates a new curatelist** that can be pinned as a feed in Bluesky
4. **Self-contained GitHub repo** with clear README -- shareable on Bluesky
5. **User-friendly as feasible** -- form factor (CLI vs web app vs something else) and auth approach to be determined during brainstorming, optimizing for usability when people click a link shared on Bluesky

**Out of scope:** syncing with the source list, mass-following

## Acceptance Criteria

### bsky-list-converter.AC1: List Reading and Preview
- **bsky-list-converter.AC1.1 Success:** Pasting a valid `bsky.app/profile/{did}/lists/{rkey}` URL fetches and displays list name, description, and member count
- **bsky-list-converter.AC1.2 Success:** Pasting a URL with a handle (not DID) resolves the handle and fetches the list
- **bsky-list-converter.AC1.3 Success:** Lists with >100 members are fully fetched via pagination
- **bsky-list-converter.AC1.4 Failure:** Invalid or malformed URL shows inline validation error
- **bsky-list-converter.AC1.5 Failure:** Non-existent or private list shows clear error with suggestion to check the URL

### bsky-list-converter.AC2: Authentication
- **bsky-list-converter.AC2.1 Success:** User can log in via Bluesky OAuth redirect and return authenticated
- **bsky-list-converter.AC2.2 Success:** Authenticated session persists across page refreshes (no re-login needed)
- **bsky-list-converter.AC2.3 Success:** User can log out and UI returns to unauthenticated state
- **bsky-list-converter.AC2.4 Failure:** OAuth failure (user denies, network error) shows retry button with explanation

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

### bsky-list-converter.AC5: Deployment and Shareability
- **bsky-list-converter.AC5.1 Success:** App is live on GitHub Pages at a shareable URL
- **bsky-list-converter.AC5.2 Success:** OAuth flow works with production GitHub Pages URLs
- **bsky-list-converter.AC5.3 Success:** UI is usable on mobile (responsive layout)
- **bsky-list-converter.AC5.4 Success:** README documents what the tool does, links to the live app, and explains development setup

## Glossary

- **AT Protocol (atproto)**: The open, federated social networking protocol that underpins Bluesky. Defines the data model, identity system, and API lexicons used throughout this document.
- **AppView**: A read-oriented AT Protocol service that aggregates and indexes data from across the network. `public.api.bsky.app` is the public Bluesky AppView used here for unauthenticated list reads.
- **PDS (Personal Data Server)**: The server that stores a user's AT Protocol records (posts, lists, etc.). Each user's data lives on their PDS; write calls in this tool go to the authenticated user's PDS, not a shared server.
- **DID (Decentralized Identifier)**: A stable, globally unique identifier for an AT Protocol account (e.g., `did:plc:abc123`). Unlike handles, DIDs don't change when a user changes their username.
- **Handle**: A human-readable username in AT Protocol (e.g., `@alice.bsky.social`). Handles can change, so the tool resolves them to DIDs before constructing AT-URIs.
- **AT-URI**: A URI scheme for addressing AT Protocol records, in the form `at://{did}/{collection}/{rkey}`. Used to reference list records and list item records.
- **rkey (Record Key)**: The identifier portion of an AT-URI that uniquely identifies a record within a collection on a given PDS.
- **Moderation list (`app.bsky.graph.defs#modlist`)**: An AT Protocol list type used to drive bulk block or mute actions. The source list in this tool's conversion flow is always a moderation list.
- **Curatelist (`app.bsky.graph.defs#curatelist`)**: An AT Protocol list type that users can pin as a feed to see posts from its members. This is the output type produced by the tool.
- **`app.bsky.graph.list`**: The AT Protocol lexicon (record schema) for a list record. Both moderation lists and curatelists use this schema; the `purpose` field distinguishes them.
- **`app.bsky.graph.listitem`**: The AT Protocol lexicon for a record that adds one member (by DID) to a list.
- **Lexicon**: AT Protocol's schema definition system, similar to an API contract. Lexicon identifiers like `app.bsky.graph.getList` name both the data types and the XRPC endpoint methods.
- **XRPC**: The HTTP-based RPC protocol used by AT Protocol services. Query methods (`getList`, `resolveHandle`) use GET; procedure methods (`createRecord`) use POST.
- **OAuth / PKCE**: The authorization protocol used for user login. PKCE (Proof Key for Code Exchange) is an extension that prevents authorization code interception attacks, required for public clients (apps with no server-side secret).
- **DPoP (Demonstration of Proof of Possession)**: An OAuth extension that binds access tokens to a specific cryptographic key, preventing stolen tokens from being used by a different client. Required by the AT Protocol OAuth spec.
- **PAR (Pushed Authorization Requests)**: An OAuth extension where the authorization parameters are sent directly to the server before the redirect, rather than in the URL. Used by `@atproto/oauth-client-browser` to keep request parameters confidential and tamper-resistant.
- **`@atproto/oauth-client-browser`**: The official AT Protocol OAuth client library for browser environments. Handles PKCE, DPoP, PAR, and session storage in IndexedDB with non-extractable keys.
- **`@atproto/api`**: The official AT Protocol client library providing the `Agent` class for making authenticated and unauthenticated API calls.
- **IndexedDB**: A browser-native key-value store used here (by the OAuth library) to persist session tokens across page refreshes without exposing them to JavaScript as plain strings.
- **`client-metadata.json`**: A JSON file hosted at the app's root URL that serves as the OAuth client registration. Its URL is used as the OAuth `client_id`, which is how the Bluesky authorization server identifies the application.
- **Public Suffix List**: A Mozilla-maintained list of domain suffixes under which independent parties can register subdomains. `github.io` is on this list, which means each `{username}.github.io` subdomain is treated as a distinct origin -- a requirement for AT Protocol OAuth `client_id` URLs.
- **SPA (Single-Page Application)**: A web app that loads once and updates the page dynamically via JavaScript rather than navigating to new server-rendered pages.
- **Vite**: A frontend build tool that bundles TypeScript/JavaScript for browser deployment. Used here to compile the TypeScript source and produce the static `dist/` output deployed to GitHub Pages.
- **GitHub Pages**: GitHub's static site hosting service, used to serve the app's HTML, JS, CSS, and `client-metadata.json` at a public URL.
- **GitHub Actions**: GitHub's CI/CD automation system. Used here to run the Vite build and deploy to GitHub Pages on each push.
- **Rate limiting / 429**: HTTP status 429 ("Too Many Requests") indicates the server is throttling the client. The list writer handles this with exponential backoff -- progressively longer waits before retrying.
- **Exponential backoff**: A retry strategy where the wait time doubles after each failed attempt, reducing load on the server while still recovering from transient errors.

## Architecture

Single-page application built with Vite + TypeScript, hosted on GitHub Pages. No backend.

**Three layers:**

1. **Auth layer** -- `@atproto/oauth-client-browser` handles the full OAuth flow (PKCE, DPoP, PAR). The app hosts a `client-metadata.json` file at its root URL, which serves as the OAuth `client_id`. After login, the library provides an authenticated session stored in IndexedDB with non-extractable crypto keys.

2. **AT Protocol layer** -- `@atproto/api` provides the `Agent` class. After OAuth login, the authenticated agent makes read calls through the public AppView (`public.api.bsky.app`) and write calls to the user's PDS (discovered from their DID document).

3. **UI layer** -- Minimal HTML/CSS/TypeScript. Single page with three states: input (paste URL, preview list), auth (login with Bluesky via OAuth redirect), and conversion (create curatelist, show progress, display result link). No UI framework -- vanilla TS with DOM manipulation. Responsive CSS for mobile (users will click links from the Bluesky app).

**Data flow:**

```
User pastes modlist URL
  -> Parse AT-URI from URL (resolve handle to DID if needed)
  -> Fetch all members via app.bsky.graph.getList (paginated, no auth)
  -> Display preview: list name, member count, sample handles
  -> User clicks "Log in with Bluesky"
  -> OAuth redirect to bsky.app authorization page
  -> Return with auth code, exchange for tokens
  -> User clicks "Create Curatelist"
  -> Create app.bsky.graph.list record (purpose: curatelist) on user's PDS
  -> Create app.bsky.graph.listitem records for each member (with progress bar)
  -> Display clickable link to new list (bsky.app URL)
```

**OAuth client configuration** (`client-metadata.json`):

```json
{
  "client_id": "https://{username}.github.io/bsky-list-converter/client-metadata.json",
  "client_name": "Bluesky List Converter",
  "client_uri": "https://{username}.github.io/bsky-list-converter",
  "redirect_uris": ["https://{username}.github.io/bsky-list-converter/"],
  "scope": "atproto transition:generic",
  "grant_types": ["authorization_code", "refresh_token"],
  "token_endpoint_auth_method": "none",
  "application_type": "web",
  "dpop_bound_access_tokens": true
}
```

**Key AT Protocol contracts:**

List record (`app.bsky.graph.list`):
- `purpose`: `"app.bsky.graph.defs#curatelist"`
- `name`: string (max 64 chars) -- defaults to source list name, user-editable
- `description`: string (max 300 graphemes) -- e.g., "Converted from [source list name]"
- `createdAt`: ISO 8601 datetime

List item record (`app.bsky.graph.listitem`):
- `subject`: DID of the member account
- `list`: AT-URI of the curatelist (must use `app.bsky.graph.list` collection in the URI)
- `createdAt`: ISO 8601 datetime

## Existing Patterns

No existing codebase -- this is a greenfield project in a blank directory.

The design follows established patterns from the Bluesky third-party tool ecosystem:
- **Static SPA pattern**: Multiple existing tools (bsky-tools, nws-bot list converters) are deployed as static sites with no backend. This design follows the same approach.
- **OAuth over app passwords**: While existing tools use app passwords, Bluesky's official guidance recommends OAuth for new tools. The `@atproto/oauth-client-browser` package (v0.3.37, actively maintained) is designed for exactly this use case.
- **Public AppView for reads**: All existing tools use `public.api.bsky.app` for unauthenticated read operations. This design follows suit.
- **GitHub Pages hosting**: Confirmed viable for both static assets and OAuth client metadata hosting (`github.io` is on the Public Suffix List, satisfying AT Protocol OAuth requirements).

## Implementation Phases

<!-- START_PHASE_1 -->
### Phase 1: Project Scaffolding
**Goal:** Initialize Vite + TypeScript project with dependencies, build pipeline, and deployment config.

**Components:**
- `package.json` with dependencies: `@atproto/oauth-client-browser`, `@atproto/api`, `vite`, `typescript`
- `tsconfig.json` with strict mode
- `vite.config.ts` with base path for GitHub Pages
- `index.html` with basic page structure (input field, button placeholders, result area)
- `src/main.ts` entry point
- `.github/workflows/deploy.yml` GitHub Actions workflow for Pages deployment
- `public/client-metadata.json` OAuth client metadata (with placeholder URLs)

**Dependencies:** None (first phase)

**Done when:** `npm install` succeeds, `npm run build` produces `dist/` output, `npm run dev` serves the page locally
<!-- END_PHASE_1 -->

<!-- START_PHASE_2 -->
### Phase 2: List Reading
**Goal:** Parse Bluesky list URLs and fetch all members from the public API.

**Components:**
- `src/list-reader.ts` -- URL parsing (extract DID/handle + rkey from `bsky.app` URLs), handle-to-DID resolution via `com.atproto.identity.resolveHandle`, paginated member fetching via `app.bsky.graph.getList`
- `src/ui.ts` -- DOM helpers for rendering list preview (name, description, member count, sample handles), progress indicators, error messages

**Dependencies:** Phase 1 (project setup)

**Covers:** `bsky-list-converter.AC1` (list reading and preview)

**Done when:** User can paste a moderation list URL and see the list name, member count, and sample member handles. Invalid URLs show clear error messages. Pagination works for lists with >100 members.
<!-- END_PHASE_2 -->

<!-- START_PHASE_3 -->
### Phase 3: OAuth Authentication
**Goal:** Users can log in with their Bluesky account via OAuth.

**Components:**
- `src/auth.ts` -- OAuth client initialization using `@atproto/oauth-client-browser`, login flow (handle input -> redirect -> callback handling), session persistence check, logout, "logged in as @handle" display
- Updates to `src/main.ts` -- wire auth state into UI (show login button after preview, show logged-in state, handle OAuth callback on page load)

**Dependencies:** Phase 1 (project setup)

**Covers:** `bsky-list-converter.AC2` (authentication)

**Done when:** User can log in via Bluesky OAuth redirect, see their handle displayed, log out, and have sessions persist across page refreshes.
<!-- END_PHASE_3 -->

<!-- START_PHASE_4 -->
### Phase 4: List Creation
**Goal:** Create a curatelist in the authenticated user's account with all members from the source list.

**Components:**
- `src/list-writer.ts` -- create curatelist record via `com.atproto.repo.createRecord`, add members as `app.bsky.graph.listitem` records with progress tracking, rate limiting (delay between calls), error collection for failed member additions
- Updates to `src/ui.ts` -- "Create Curatelist" button, editable list name field, progress bar ("Adding member 47 of 312..."), result display with clickable bsky.app link, error summary for partial failures
- Updates to `src/main.ts` -- wire conversion flow (preview -> auth -> create)

**Dependencies:** Phase 2 (list reading), Phase 3 (OAuth authentication)

**Covers:** `bsky-list-converter.AC3` (list creation), `bsky-list-converter.AC4` (error handling during creation)

**Done when:** Authenticated user can create a curatelist from a previewed moderation list, see progress during member addition, receive a clickable link to the new list, and see a summary of any failed additions.
<!-- END_PHASE_4 -->

<!-- START_PHASE_5 -->
### Phase 5: Polish and Deployment
**Goal:** Responsive styling, final UX polish, and live deployment to GitHub Pages.

**Components:**
- CSS styling -- clean, minimal, card-based layout. Mobile-responsive (people tap links from Bluesky app). Accessible form elements and contrast.
- `public/client-metadata.json` updated with production GitHub Pages URLs
- `.github/workflows/deploy.yml` verified and triggered
- `README.md` -- project description, live link, how it works, development setup

**Dependencies:** Phase 4 (list creation)

**Covers:** `bsky-list-converter.AC5` (deployment and shareability)

**Done when:** App is live on GitHub Pages, OAuth flow works with production URLs, responsive on mobile, README documents usage.
<!-- END_PHASE_5 -->

## Additional Considerations

**Rate limiting:** The Bluesky PDS may rate-limit rapid `createRecord` calls when adding many members. The list-writer should add a small delay (e.g., 50-100ms) between member additions and implement exponential backoff on 429 responses.

**Large lists:** Some moderation lists contain thousands of members. The UI should show clear progress and handle this gracefully. No hard limit imposed by the tool -- the AT Protocol's pagination handles the read side, and batched writes with progress tracking handle the write side.

**`listitem` URI gotcha:** The `list` field in `app.bsky.graph.listitem` records must reference `app.bsky.graph.list` in the AT-URI (not `app.bsky.list` without `.graph.`). Using the wrong collection path creates orphaned records that don't associate with the list in the AppView (documented in atproto issue #2730).
