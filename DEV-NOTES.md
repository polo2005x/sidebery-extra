# Dev notes

Quick reference for building, testing, and installing this Sidebery fork.
Run all commands from the project root in PowerShell.

## First time only
```
npm install
```

## Build
```
npm run build
```
Outputs the loadable extension to the `addon/` folder. No red "error" text = success.

## Type-check (catches mistakes before committing)
```
npm run lint.types
```
No output = all good.

## Test in Firefox
Two options:

**A. Quick reload (temporary, resets on restart)**
1. `npm run build`
2. In Firefox: `about:debugging` → **This Firefox** → **Load Temporary Add-on** → pick `addon/manifest.json`
   (or click **Reload** if it's already loaded).

**B. Live-reload while editing (two terminals)**
- Terminal 1: `npm run dev`  (builds + watches for changes — keep it open)
- Terminal 2: `npm run dev.run -- "C:\Program Files\Mozilla Firefox\firefox.exe"`
  (launches a separate dev Firefox with the extension auto-loaded and auto-reloading)

## Save changes to GitHub
```
git push origin v5
```
(Auth is handled by the GitHub CLI — no username/password prompt.)

## Install permanently for personal use
Regular Firefox only installs Mozilla-signed extensions, so use **Firefox Developer Edition**:
1. Package it: `npm run build.ext`  → creates a `.zip` in `dist/`.
2. In Developer Edition: `about:config` → set `xpinstall.signatures.required` to **false**.
3. `about:addons` → gear icon → **Install Add-on From File** → pick the file from `dist/`.

## Gotchas
- **New context-menu items don't appear automatically.** Sidebery saves its own menu
  layout, so after adding a menu feature you must enable it in
  **Settings → Context Menu Editor → Tabs** (or reset that menu to default).
- Tree-related menu items (shared parent, group/subgroup dedupe) only show when
  **Tab Tree** mode is enabled and you right-click a non-pinned tab.

See `FORK-CHANGES.md` for the list of custom features added on top of upstream Sidebery.
