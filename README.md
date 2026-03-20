# Bluesky List Converter

Convert Bluesky moderation lists into curatelists that you can pin as feeds.

## Live App

Try the tool here: https://{USERNAME}.github.io/bsky-list-converter/

> **Note:** Replace `{USERNAME}` with the GitHub username of your fork.

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
git clone https://github.com/{USERNAME}/bsky-list-converter
cd bsky-list-converter
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

1. **Update `public/client-metadata.json`:**

   Replace `{USERNAME}` in the file with your actual GitHub username. This is required for the OAuth flow to work correctly.

2. **Enable GitHub Pages:**

   - Go to your repository settings → Pages
   - Select **GitHub Actions** as the source
   - The site will deploy automatically on push to `main`

3. **Verify the OAuth metadata is served:**

   After deployment, visit `https://YOUR_USERNAME.github.io/bsky-list-converter/client-metadata.json` and confirm it returns valid JSON with your correct GitHub Pages URLs.

## Tech Stack

- **Frontend Framework:** Vite with TypeScript
- **Styling:** CSS (mobile-first responsive design)
- **AT Protocol:**
  - `@atproto/api` — Bluesky API client
  - `@atproto/oauth-client-browser` — Browser-based OAuth flow
- **Testing:** Vitest with jsdom
- **Build & Deploy:** Vite + GitHub Actions → GitHub Pages

## Features

- ✅ Read any public Bluesky moderation list
- ✅ Preview list members before action
- ✅ OAuth login with Bluesky (secure, no password stored)
- ✅ Create a curatelist from list members
- ✅ Fully responsive design (mobile & desktop)
- ✅ No external dependencies or build bloat

## License

MIT
