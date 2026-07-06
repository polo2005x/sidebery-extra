# Fork changes

Custom features added on top of upstream Sidebery (branch `v5`). Keep this list
updated when adding features — it makes pulling upstream updates much easier.

## 1. Deduplicate: keep newest instead of oldest (toggle)
- **What:** The "Deduplicate" action normally keeps the oldest copy of a duplicate
  URL and closes the rest. A new setting reverses the tab order so the newest copy
  is kept instead. Off by default (matches upstream).
- **Setting:** Settings → Tabs → "Reverse tab priority for 'Close duplicate tabs'" (`dedupKeepNewest`).
- **Group dedupe:** right-click a group/parent tab → "Close duplicate tabs in group"
  deduplicates only that tab's nested tabs (branch), and respects the reverse toggle.
  Context-menu item `dedupeBranchTabs`; must be enabled via the Context Menu Editor.
- **Files:** `src/services/tabs.fg.ts` (`dedupeTabs`, `getBranch`), `src/defaults/settings.ts`,
  `src/types/settings.ts`, `src/page.setup/components/settings.tabs.vue`,
  `src/_locales/dict.setup-page.ts`; menu in `src/services/menu.fg.options.tabs.ts`,
  `src/defaults/menu.ts`, `src/page.setup/components/menu-editor.vue`,
  `src/_locales/dict.common.ts`.

## 2. New-tab position: "after last tab at same level"
- **What:** A new position option for tabs opened from another tab / the New Tab
  button. Places the new tab after the last tab sharing the active tab's indent
  level (skips the subtree and following siblings).
- **Setting:** value `after_last_sibling` in "Place new tab opened from another tab",
  "Place new tab", and the New Tab button position dropdowns.
- **Files:** `src/services/tabs.fg.create.ts` (`getIndexForNewTab`,
  `getParentForNewTab`), `src/defaults/settings.ts`, `src/_locales/dict.setup-page.ts`.

## 3. New-tab position rule for opener at the tree depth limit
- **What:** A second placement rule that applies only when the opener tab is already
  at the tree depth limit (`tabsTreeLimit`). Lets shallow tabs open children while the
  deepest tabs use a different placement. Defaults to "inherit the normal rule".
- **Setting:** Settings → Tabs → "...but when opener is at the tree depth limit"
  (`moveNewTabParentLimited`), shown under "Place new tab opened from another tab".
- **Files:** `src/services/tabs.fg.create.ts` (`getParentPlacementSetting`),
  `src/defaults/settings.ts`, `src/types/settings.ts`,
  `src/page.setup/components/settings.tabs.vue`, `src/_locales/dict.setup-page.ts`.

## 4. "Shared parent" tabs
- **What:** Right-click a tab → "Mark as shared parent". New tabs opened from a shared
  parent (or any of its shared siblings at the same level) become the last child of the
  last shared parent at that level. A left accent bar marks shared-parent tabs. The flag
  persists across restarts. Children of a shared parent are not auto-shared.
- **How to use:** Requires Tab Tree mode. The "Mark as shared parent" context-menu item
  must be enabled/added via Settings → Context Menu Editor → Tabs (Sidebery keeps a saved
  menu layout, so new default items don't appear automatically).
- **Files:** per-tab `sharedParent` flag in `src/types/tabs.ts` + persistence in
  `src/services/tabs.fg.ts`; `toggleSharedParent` in `src/services/tabs.fg.colors.ts`;
  placement in `src/services/tabs.fg.create.ts` (`getLastSharedSibling`); menu in
  `src/services/menu.fg.options.tabs.ts`, `src/defaults/menu.ts`,
  `src/page.setup/components/menu-editor.vue`; marker in
  `src/sidebar/components/tab.vue` + `src/styles/sidebar/tab.styl`; labels in
  `src/_locales/dict.common.ts`.
