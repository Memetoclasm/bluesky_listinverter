# Bluesky List Converter Implementation Plan

**Goal:** Responsive styling, final UX polish, and live deployment to GitHub Pages.

**Architecture:** CSS styling applied via a single stylesheet linked from index.html. Card-based layout with mobile-first responsive design. Production OAuth client metadata updated with real GitHub Pages URLs. README provides documentation for users and developers.

**Tech Stack:** CSS, GitHub Actions, GitHub Pages

**Scope:** 5 phases from original design (phases 1-5)

**Codebase verified:** 2026-03-19 -- builds on Phases 1-4

---

## Acceptance Criteria Coverage

This phase implements and tests:

### bsky-list-converter.AC5: Deployment and Shareability
- **bsky-list-converter.AC5.1 Success:** App is live on GitHub Pages at a shareable URL
- **bsky-list-converter.AC5.2 Success:** OAuth flow works with production GitHub Pages URLs
- **bsky-list-converter.AC5.3 Success:** UI is usable on mobile (responsive layout)
- **bsky-list-converter.AC5.4 Success:** README documents what the tool does, links to the live app, and explains development setup

---

<!-- START_TASK_1 -->
### Task 1: Add CSS styling

**Files:**
- Create: `src/style.css`
- Modify: `src/main.ts` (add CSS import)

**Step 1: Create src/style.css**

Create a stylesheet with responsive, mobile-first styling. Key design decisions:
- Max-width container (600px) centered on page for readability
- Card-based sections with subtle borders and padding
- System font stack (no web fonts to load)
- Responsive: full-width on mobile (<640px), centered card on desktop
- Accessible contrast (WCAG AA minimum)
- Progress bar styled to match the overall theme
- Buttons with clear affordance (solid background, hover state)
- Error messages in a distinct color (red/warning)
- Success results in a distinct color (green/positive)
- Hidden sections use the `hidden` attribute (already in HTML from Phase 1)

CSS structure:
```css
/* Reset and base */
*, *::before, *::after { box-sizing: border-box; }
body { font-family: system-ui, -apple-system, sans-serif; margin: 0; padding: 1rem; background: #f5f5f5; color: #1a1a1a; }

/* Container */
#app { max-width: 600px; margin: 0 auto; }

/* Sections as cards */
#input-section, #preview-section, #auth-section, #progress-section, #result-section, #error-section {
  background: white; border-radius: 8px; padding: 1.5rem; margin-bottom: 1rem; border: 1px solid #e0e0e0;
}

/* Form elements */
input[type="url"], input[type="text"] { width: 100%; padding: 0.75rem; border: 1px solid #ccc; border-radius: 4px; font-size: 1rem; }
button { padding: 0.75rem 1.5rem; border: none; border-radius: 4px; font-size: 1rem; cursor: pointer; background: #0085ff; color: white; }
button:hover { background: #0070d6; }
button:disabled { background: #999; cursor: not-allowed; }

/* Progress */
progress { width: 100%; height: 1.5rem; }

/* Error / Success */
.error { color: #cc0000; }
.success { color: #008800; }

/* Links */
a { color: #0085ff; }

/* Responsive */
@media (max-width: 640px) {
  body { padding: 0.5rem; }
  #app > * { border-radius: 4px; padding: 1rem; }
}
```

Adapt and refine these styles as needed for visual coherence. The above is a starting point -- the implementor should make it look clean and professional.

**Step 2: Import stylesheet from main.ts**

In `src/main.ts`, add as the first line:
```typescript
import './style.css'
```

Vite will bundle and fingerprint the CSS automatically. Do not use a `<link>` tag in `index.html` -- the import approach ensures the CSS goes through Vite's asset pipeline.

**Step 3: Verify build includes CSS**

Run: `npm run build`
Expected: `dist/` contains a hashed CSS file (e.g., `assets/index-abc123.css`) and the HTML references it.

**Step 4: Commit**

```bash
git add src/style.css src/main.ts
git commit -m "feat: add responsive CSS styling"
```
<!-- END_TASK_1 -->

<!-- START_TASK_2 -->
### Task 2: Update client-metadata.json for production

**Files:**
- Modify: `public/client-metadata.json`

**Step 1: Update placeholder URLs**

The user must replace `{USERNAME}` in `public/client-metadata.json` with their actual GitHub username before deploying. This cannot be automated because the username varies per fork.

Update the file to include a comment-like approach or update the README to document this step clearly. Since JSON doesn't support comments, add a note in the README (Task 3) explaining this required step.

Alternatively, if the GitHub username is known at this point, replace `{USERNAME}` with the actual value.

**Step 2: Verify the file is valid JSON**

Run: `node -e "JSON.parse(require('fs').readFileSync('public/client-metadata.json', 'utf8')); console.log('valid')"`
Expected: Prints "valid"

**Step 3: Commit**

```bash
git add public/client-metadata.json
git commit -m "chore: update OAuth client metadata for production"
```
<!-- END_TASK_2 -->

<!-- START_TASK_3 -->
### Task 3: Create README.md

**Files:**
- Create: `README.md`

**Step 1: Write README**

Create `README.md` with:

1. **Title and description:** "Bluesky List Converter" -- one-sentence description of what it does (converts moderation lists to curatelists)

2. **Live link:** Link to the deployed app (e.g., `https://{USERNAME}.github.io/bsky-list-converter/`)

3. **How it works:** Brief explanation of the conversion process:
   - Paste a moderation list URL
   - Preview the list members
   - Log in with your Bluesky account (OAuth)
   - Create a curatelist with the same members
   - Pin the new list as a feed in Bluesky

4. **Development setup:**
   ```
   git clone https://github.com/{USERNAME}/bsky-list-converter
   cd bsky-list-converter
   npm install
   npm run dev
   ```

5. **Deployment setup:** Note about updating `client-metadata.json` with the correct GitHub Pages URL, and enabling GitHub Pages with "GitHub Actions" as the source.

6. **Tech stack:** Vite, TypeScript, AT Protocol (`@atproto/api`, `@atproto/oauth-client-browser`)

**Step 2: Commit**

```bash
git add README.md
git commit -m "docs: add README with usage and development instructions"
```
<!-- END_TASK_3 -->

<!-- START_TASK_4 -->
### Task 4: Verify build and deployment readiness

**Step 1: Run full build**

Run: `npm run build`
Expected: `dist/` contains index.html, bundled JS, bundled CSS, and client-metadata.json.

**Step 2: Run all tests**

Run: `npm test`
Expected: All tests pass.

**Step 3: Preview the built output**

Run: `npx vite preview --host 0.0.0.0 &` then `curl -s http://localhost:4173/bsky-list-converter/ | head -10`
Expected: Returns the production HTML with correct asset paths.

Verify client-metadata.json is served:
Run: `curl -s http://localhost:4173/bsky-list-converter/client-metadata.json | head -5`
Expected: Returns the OAuth metadata JSON.

Kill the preview server after verification.

**Step 4: Commit any remaining changes**

If any adjustments were made during verification:
```bash
git add -A
git commit -m "chore: final polish and build verification"
```
<!-- END_TASK_4 -->
