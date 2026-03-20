# Bluesky List Converter Implementation Plan

**Goal:** Initialize Vite + TypeScript project with dependencies, build pipeline, and deployment config.

**Architecture:** Single-page application built with Vite + TypeScript, hosted on GitHub Pages. No backend. Three layers: Auth (OAuth), AT Protocol (API calls), UI (vanilla DOM).

**Tech Stack:** Vite 6.x, TypeScript 5.x, @atproto/oauth-client-browser 0.3.41, @atproto/api 0.19.4, Vitest 4.x

**Scope:** 5 phases from original design (phases 1-5)

**Codebase verified:** 2026-03-19 -- greenfield, /workspace contains only .devcontainer/, .git/, docs/

---

## Acceptance Criteria Coverage

**Verifies: None** -- this is an infrastructure/scaffolding phase. Verification is operational (install, build, dev server).

---

<!-- START_TASK_1 -->
### Task 1: Create package.json and install dependencies

**Files:**
- Create: `package.json`

**Step 1: Create package.json**

Create `package.json` with the following content:

```json
{
  "name": "bsky-list-converter",
  "private": true,
  "version": "0.0.1",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "dependencies": {
    "@atproto/api": "^0.19.4",
    "@atproto/oauth-client-browser": "^0.3.41"
  },
  "devDependencies": {
    "typescript": "^5.7.0",
    "vite": "^6.0.0",
    "vitest": "^4.1.0"
  }
}
```

**Step 2: Install dependencies**

Run: `npm install`
Expected: Installs without errors. `node_modules/` and `package-lock.json` are created.

**Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: initialize package.json with dependencies"
```
<!-- END_TASK_1 -->

<!-- START_TASK_2 -->
### Task 2: Create TypeScript configuration

**Files:**
- Create: `tsconfig.json`
- Create: `tsconfig.node.json`

**Step 1: Create tsconfig.json**

Create `tsconfig.json` with the following content:

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "types": ["vitest/globals"]
  },
  "include": ["src"]
}
```

Create `tsconfig.node.json` with the following content:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2023"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "strict": true
  },
  "include": ["vite.config.ts"]
}
```

**Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors (there are no .ts files in `src/` yet, so this should exit cleanly)

**Step 3: Commit**

```bash
git add tsconfig.json tsconfig.node.json
git commit -m "chore: add TypeScript configuration"
```
<!-- END_TASK_2 -->

<!-- START_TASK_3 -->
### Task 3: Create Vite config, index.html, and entry point

**Files:**
- Create: `vite.config.ts`
- Create: `index.html`
- Create: `src/main.ts`

**Step 1: Create vite.config.ts**

Create `vite.config.ts` with the following content:

```typescript
import { defineConfig } from 'vite'

export default defineConfig({
  base: '/bsky-list-converter/',
  test: {
    globals: true,
  },
})
```

**Step 2: Create index.html**

Create `index.html` in the project root (Vite uses the root `index.html` as the entry point, not one inside `public/`):

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Bluesky List Converter</title>
  </head>
  <body>
    <div id="app">
      <h1>Bluesky List Converter</h1>
      <p>Convert a Bluesky moderation list into a curatelist you can pin as a feed.</p>

      <div id="input-section">
        <label for="list-url">Moderation list URL:</label>
        <input type="url" id="list-url" placeholder="https://bsky.app/profile/.../lists/..." />
        <button id="fetch-btn" type="button">Fetch List</button>
      </div>

      <div id="preview-section" hidden></div>
      <div id="auth-section" hidden></div>
      <div id="progress-section" hidden></div>
      <div id="result-section" hidden></div>
      <div id="error-section" hidden></div>
    </div>
    <script type="module" src="/src/main.ts"></script>
  </body>
</html>
```

**Step 3: Create src/main.ts**

Create the `src/` directory and `src/main.ts`:

```typescript
console.log('Bluesky List Converter loaded')
```

**Step 4: Verify build succeeds**

Run: `npm run build`
Expected: Produces `dist/` directory containing `index.html` and bundled JS assets.

**Step 5: Verify dev server starts**

Run: `npx vite --host 0.0.0.0 &` then `curl -s http://localhost:5173/bsky-list-converter/ | head -5`
Expected: Returns the HTML content. Kill the background process after verification.

**Step 6: Commit**

```bash
git add vite.config.ts index.html src/main.ts
git commit -m "chore: add Vite config, index.html, and entry point"
```
<!-- END_TASK_3 -->

<!-- START_TASK_4 -->
### Task 4: Create OAuth client metadata and GitHub Actions deploy workflow

**Files:**
- Create: `public/client-metadata.json`
- Create: `.github/workflows/deploy.yml`

**Step 1: Create public/client-metadata.json**

Create the `public/` directory and `public/client-metadata.json`. Use placeholder `{USERNAME}` -- the user will replace this with their GitHub username before deploying:

```json
{
  "client_id": "https://{USERNAME}.github.io/bsky-list-converter/client-metadata.json",
  "client_name": "Bluesky List Converter",
  "client_uri": "https://{USERNAME}.github.io/bsky-list-converter",
  "redirect_uris": ["https://{USERNAME}.github.io/bsky-list-converter/"],
  "scope": "atproto transition:generic",
  "grant_types": ["authorization_code", "refresh_token"],
  "response_types": ["code"],
  "token_endpoint_auth_method": "none",
  "application_type": "web",
  "dpop_bound_access_tokens": true
}
```

**Step 2: Create .github/workflows/deploy.yml**

Create the `.github/workflows/` directory and `.github/workflows/deploy.yml`:

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [main]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: false

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
      - run: npm ci
      - run: npm run build
      - uses: actions/upload-pages-artifact@v3
        with:
          path: dist

  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - id: deployment
        uses: actions/deploy-pages@v4
```

**Step 3: Verify build still succeeds with new public/ assets**

Run: `npm run build`
Expected: `dist/` now contains `client-metadata.json` copied from `public/`.

Run: `ls dist/client-metadata.json`
Expected: File exists (Vite copies `public/` contents to `dist/` root).

**Step 4: Commit**

```bash
git add public/client-metadata.json .github/workflows/deploy.yml
git commit -m "chore: add OAuth client metadata and GitHub Pages deploy workflow"
```
<!-- END_TASK_4 -->

<!-- START_TASK_5 -->
### Task 5: Add .gitignore

**Files:**
- Create: `.gitignore`

**Step 1: Create .gitignore**

```
node_modules
dist
*.local
```

**Step 2: Commit**

```bash
git add .gitignore
git commit -m "chore: add .gitignore"
```
<!-- END_TASK_5 -->
