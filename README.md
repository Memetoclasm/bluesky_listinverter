# Bluesky List Converter

Convert Bluesky moderation lists into curatelists that you can pin as feeds. (Thanks to @bitterbitch.bsky.social and @danifroom.bsky.social for the inspiration)

## Live App

Try the tool here: https://memetoclasm.github.io/bluesky_listinverter/

## How It Works

1. **Paste a list URL:** Find a moderation list on Bluesky (e.g., from your network or community) and copy its URL.

2. **Preview members:** The tool loads the list and shows you all the members before making any changes.

3. **Log in with Bluesky:** Click the login button to authenticate with your Bluesky account via OAuth.

4. **Create a curatelist:** Once logged in, the tool creates a new curatelist with the same members as the original moderation list.

5. **Pin it as a feed:** In the Bluesky app, open the created curatelist and pin it to your feeds for easy access.

## Development Setup

### Prerequisites

- Node.js 18+ and npm

### Installation

```bash
git clone https://github.com/memetoclasm/bluesky_listinverter
cd bluesky_listinverter
npm install
```

### Development Server

Start the development server:

```bash
npm run dev
```

The app will be available at `http://localhost:5173` by default.

### Running Tests

```bash
npm test           # Run tests once
npm run test:watch # Run tests in watch mode
```

### Building for Production

```bash
npm run build
```

The production build is output to the `dist/` directory.

## Deployment Setup

### Deploying to GitHub Pages

1. **Enable GitHub Pages** (required before the app will work):

   - Go to your repository **Settings → Pages**
   - Under **Source**, select **GitHub Actions** (not "Deploy from a branch")
   - Save — the site will deploy automatically on the next push to `main`

   **Important:** If you select "Deploy from a branch" instead, GitHub will serve the raw source files rather than the built app, and nothing will work.

2. **Update `public/client-metadata.json`:**

   If you fork this repo, replace `memetoclasm` in the file with your GitHub org or username. The OAuth URLs must match your GitHub Pages domain for login to work.

3. **Verify the deployment:**

   After the Actions workflow completes, visit `https://memetoclasm.github.io/bluesky_listinverter/client-metadata.json` and confirm it returns valid JSON.

## Tech Stack

- **Frontend Framework:** Vite with TypeScript
- **Styling:** CSS (mobile-first responsive design)
- **AT Protocol:**
  - `@atproto/api` — Bluesky API client
  - `@atproto/oauth-client-browser` — Browser-based OAuth flow
- **Testing:** Vitest with jsdom
- **Build & Deploy:** Vite + GitHub Actions → GitHub Pages

## Features

- Read any public Bluesky moderation list
- Preview list members before action
- OAuth login with Bluesky (secure, no password stored)
- Create a curatelist from list members
- Fully responsive design (mobile & desktop)
- No external dependencies or build bloat

## Security and Privacy

**No backend server.** This app runs entirely in your browser. No data is sent anywhere except directly to Bluesky's own APIs.

**Reading lists requires no login.** List fetching uses Bluesky's public API (`public.api.bsky.app`) with no authentication. Your credentials are never involved in reading.

**Writing uses OAuth with DPoP.** When you log in, the app gets an OAuth token scoped to your Bluesky account. This token is:
- Stored in your browser's IndexedDB (managed by `@atproto/oauth-client-browser`)
- Never sent to any third-party server
- DPoP-bound, meaning it is cryptographically tied to the browser session that created it and cannot be stolen and replayed from another device

**OAuth scope.** The token uses `atproto transition:generic`, which is the standard broad scope for AT Protocol apps. This is an ecosystem-wide limitation — AT Protocol does not yet support narrower scopes. The app only uses the token to create list records and list item records on your account.

**Your password is never seen by this app.** OAuth redirects you to Bluesky's own login page. The app only receives a token after you authorize it.

## License

MIT
