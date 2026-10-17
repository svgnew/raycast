# Raycast Store launch checklist

Prepared 17 Oct 2026. The extension is committed locally in `svgnew/raycast`. Nothing has been pushed and no PR has been opened.

## Recommendation: open a new PR

Open a new PR with `npm run publish`. Don't reopen #26716.

- #26716 was closed by the stale bot on 18 Apr 2026. Only bots looked at it (Greptile's code review and the CI checks, which all passed). No Raycast reviewer commented, so there is no human review to keep.
- `npm run publish` only updates a PR that is still open. With #26716 closed, it opens a new draft PR from the same branch (`svgnew/extensions:ext/svg-new`).
- A new PR gets a fresh description and bot review, and enters the queue as a new extension.

If you still want to reuse #26716, reopen it on GitHub as **svgnew** before step 6. `npm run publish` then pushes to it, and you replace its description with the text below.

## Steps

1. **Check the build.**
   ```sh
   cd ~/Develop/gologo/raycast
   npm ci && npm run lint && npm run build
   ```
2. **Test it in Raycast** (this uses real credits: about 6 in total).
   - `npm run dev`, then enter an API key from svg.new/account when Raycast asks.
   - Convert Image to SVG on a PNG selected in Finder. Expect `name.svg` next to it, opened, and a HUD with credits left.
   - Convert Image to SVG on an iPhone HEIC photo (it is converted to PNG first).
   - Take a screenshot to the clipboard (Ctrl-Shift-Cmd-4) and run Convert Clipboard Image to SVG. Expect `Clipboard Image.svg` in Downloads and the SVG text on the clipboard.
   - Copy an image file in Finder (Cmd-C) and run Convert Clipboard Image to SVG.
   - Remove Background on a photo. Expect `name-no-bg.png` and `name-no-bg.svg` next to it (2 credits).
   - Enter a wrong API key. Expect a failure toast with an "Open Extension Preferences" action.
3. **Take screenshots** (recommended; the Store shows up to six).
   - In Raycast Settings → Advanced, set a Window Capture hotkey.
   - With `npm run dev` running, open Raycast, press the hotkey and tick **Save to Metadata**. This writes a 2000×1250 PNG to `metadata/`.
   - Suggested shots: the root search after typing "svg" with the three commands listed; Convert Image to SVG running with the "Vectorizing… 45%" toast; Remove Background running.
   - Use the same wallpaper and the same appearance (all light or all dark) for every shot. Show no personal files. CI rejects screenshots with a different size, a different background or appearance, or the local development icon in the bottom bar.
   - `git add metadata && git commit -m "Add Store screenshots"`.
4. **Push the source repo** (optional; svg.new/raycast tells people to clone it): `git push origin main`.
5. **Make sure the publish runs as GitHub user svgnew, not dber1.**
   - Run `gh auth status` and check that **svgnew** is listed. If it isn't, run `gh auth login` and sign in as svgnew.
   - Then publish with svgnew's token:
     ```sh
     GITHUB_ACCESS_TOKEN="$(gh auth token --user svgnew)" npm run publish
     ```
     The Ray CLI (in @raycast/api 2.8.2) uses `GITHUB_ACCESS_TOKEN` in place of its own saved token, so this pins the account.
   - Don't add `--verbose`: it prints git remote URLs that contain the token.
   - Without the variable, the CLI reuses the GitHub token it saved last time. If it asks you to authorize in the browser, check that github.com shows svgnew before entering the code.
6. **What `npm run publish` does.** It checks the manifest and refuses to run with uncommitted changes. It reuses the svgnew/extensions fork, pushes branch `ext/svg-new`, and opens a **draft** PR named "Add svg-new extension". It copies every file in this folder except `.git`, `node_modules` and `raycast-env.d.ts`. The `docs/` folder is gitignored, so it stays out of the PR.
7. **Finish the PR.** Check that the PR author is svgnew. Replace the description with the text below and attach a short screencast (a GIF of step 2 is enough). Then click **Ready for review**.
8. **Stay responsive.** The stale bot marks a PR after 25 days without activity and closes it 7 days later, which is how #26716 closed. When a reviewer asks for changes, they convert the PR to a draft. Fix the code here, commit, run step 5's command again, then click Ready for review.
9. **After the merge**, point svg.new/raycast at `https://www.raycast.com/svgnew/svg-new` in place of the "install from source" steps.

## PR description (paste-ready)

```markdown
## Description

SVG.new converts images to SVG vectors and removes backgrounds. This extension adds three no-view commands:

- **Convert Image to SVG** vectorizes the image selected in Finder and saves the SVG next to it.
- **Convert Clipboard Image to SVG** vectorizes a copied image file, screenshot or browser image. The SVG is saved to Downloads and copied to the clipboard.
- **Remove Background** removes the background from the image selected in Finder and saves a transparent PNG and an SVG next to it.

How it works:

- It needs an SVG.new API key, stored as a required password preference. Free accounts get 3 credits a day. Vectorizing uses 1 credit; Remove Background uses 2 (vectorize, then remove the background).
- It calls `POST https://svg.new/api/agent/vectorize` (with SSE progress in the toast) and `POST https://svg.new/api/agent/edit/remove-background`. API docs: https://svg.new/developers
- PNG, JPG and WebP are sent as they are. HEIC, TIFF, AVIF, GIF and BMP are converted to PNG with the system `sips` tool first, and images over 3 MB are scaled down with `sips`.
- Screenshots and "Copy Image" data are read from the pasteboard with AppleScript, since `Clipboard.read()` only returns file paths.
- Existing files are never overwritten. No analytics.

This replaces #26716, which was closed for inactivity. Greptile's comments there are addressed: the generated `Preferences` type is used, TIFF is handled the same way in both commands, the clipboard command checks the file type, file URLs are decoded with `fileURLToPath`, and the CHANGELOG uses `{PR_MERGE_DATE}`.

## Screencast

<!-- attach the screencast -->

## Checklist

- [x] I read the [extension guidelines](https://developers.raycast.com/basics/prepare-an-extension-for-store)
- [x] I read the [documentation about publishing](https://developers.raycast.com/basics/publish-an-extension)
- [x] I ran `npm run build` and [tested this distribution build in Raycast](https://developers.raycast.com/basics/prepare-an-extension-for-store#metadata-and-configuration)
- [x] I checked that files in the `assets` folder are used by the extension itself
- [x] I checked that assets used by the `README` are placed outside of the `metadata` folder
```

Tick "tested this distribution build" only after step 2.

## What reviewers will check

- **CI checks.** `ray lint` (manifest, icon, ESLint, Prettier) and `ray build -e dist` (TypeScript). Both pass locally. Also the changelog check (`{PR_MERGE_DATE}`), the metadata image check (PNG, 2000×1250, at most six, consistent background and appearance), npm-check, and a Socket Security scan of the dependencies.
- **Bot reviews.** Greptile and Cursor Bugbot comment on the code. Fix or answer each comment; human reviewers read them too.
- **The Raycast reviewer** checks:
  - Apple-style title case: "SVG.new", "Convert Image to SVG", "Remove Background".
  - A one-sentence description and valid categories (Design Tools, Productivity).
  - A 512×512 PNG icon that works in light and dark themes.
  - A README, because setup needs an API key.
  - The CHANGELOG format, US English, and a placeholder on the preference.
  - Failures shown as toasts, no analytics, no Keychain access.
  - Only system binaries: `sips` and `osascript`.
  - `package-lock.json` from npm, and the latest `@raycast/api` (2.8.2).
- **Likely questions**:
  - Why Remove Background costs 2 credits.
  - What happens to uploaded images. The README says they are sent to SVG.new and kept in the account's history.
  - Why `Clipboard Image.svg` goes to Downloads.

## Open items

- svg.new/developers says "API access is included with the Pro plan", but the API accepts keys from free accounts (3 credits a day), and this README says so. Make the two agree.
- Remove Background costs 2 credits because the API only removes backgrounds from an SVG. A raster-only endpoint that returns the transparent PNG for 1 credit would make this command cheaper and faster.
- The live API was not called while preparing this (no credits spent). The API client was tested against a mocked API, and the image conversion with real files and `sips`.
