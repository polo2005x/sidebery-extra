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
- **Subgroup dedupe:** "Close duplicate tabs in subgroups" (`dedupeSubgroupTabs`) does the
  same but only closes duplicates that share the same parent (per subgroup), not across
  the whole branch. Separate context-menu item; also respects the reverse toggle.
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

## 5. Per-site pacing on bulk reload
- **What:** Sidebery reloads tabs with a global concurrency limit (`tabsReloadLimit`,
  default 5). This adds optional **per-domain** pacing: after every N reloads of the same
  site, that site cools down for a while, while other sites keep reloading. Gentler on
  rate-limited / anti-bot sites. Off by default; only paces sites above a tab-count
  threshold. `reloadTabs` was restructured to dispatch via a `fillSlots` helper that skips
  domains currently cooling down (applies to the first batch too).
- **Settings:** Settings → Tabs (under the reload limit): "Slow down bulk reloads per site"
  (`tabsReloadBatchDelay`) with sub-options — pause after every N same-site reloads
  (`tabsReloadBatchDelayEvery`), pause duration in ms (`tabsReloadBatchDelayMs`), and a
  per-site minimum tab count to activate (`tabsReloadBatchDelayMin`).
- **Files:** `src/services/tabs.fg.ts` (`reloadTabs`, `Utils.getDomainOf`),
  `src/defaults/settings.ts`, `src/types/settings.ts`,
  `src/page.setup/components/settings.tabs.vue`, `src/_locales/dict.setup-page.ts`.

## 6. Search bar on the group page
- **What:** Optional search bar at the top of the group page. Typing filters the group's
  tabs live by **title or URL**. Multiple space-separated terms are AND-ed, and each term
  is a **case-insensitive regex** (invalid regex falls back to a literal match, so it never
  breaks). Quotes group a term with spaces. Example: `youtube salmon|fish` shows YouTube
  tabs that also mention salmon or fish. Shows a match count, Esc clears, auto-focused.
- **Setting:** Settings → Group → "Show search bar on the group page" (`groupSearch`),
  default on. Passed to the group page via `getGroupPageInitData` like `groupLayout`.
- **Theming:** the search bar reads `--group-search-*` CSS vars (bg, fg, border,
  border-focus, radius, height) defined on `#root` in `group.styl`, so it's editable from
  the built-in Styles editor (Group target). Those vars appear under a new "Group page"
  group in `src/page.setup/components/styles-editor.vue`.
- **Files:** `src/page.group/group.ts` (setup/parse/apply search) + `group.html`;
  `src/styles/page.group/group.styl`; `groupSearch` in `src/defaults/settings.ts`,
  `src/types/settings.ts`, `GroupPageInitData` in `src/types/tabs.ts`,
  `src/services/tabs.bg.ts`; toggle in `src/page.setup/components/settings.group.vue`;
  labels in `src/_locales/dict.setup-page.ts` and `dict.browser.json`.

## 7. Sort dropdown on the group page
- **What:** Optional sort dropdown on the group page that reorders the displayed tab cards
  (view only — it does not move the actual tabs). Modes: default order, reverse, by domain,
  by title, by URL. Composes with the search filter, and sits to the right of the search bar.
- **Setting:** Settings → Group → "Show sort dropdown on the group page" (`groupSort`),
  default on. Passed via `getGroupPageInitData`. The chosen sort resets to default when the
  page is reopened.
- **Files:** `src/page.group/group.ts` (`setupSort`/`applySort`) + `group.html`;
  `src/styles/page.group/group.styl`; `groupSort` in `src/defaults/settings.ts`,
  `src/types/settings.ts`, `GroupPageInitData` in `src/types/tabs.ts`;
  `src/services/tabs.bg.ts`; toggle in `src/page.setup/components/settings.group.vue`;
  labels in `src/_locales/dict.setup-page.ts` and `dict.browser.json`.

## 8. "Recently active tabs" box on the group page
- **What:** Optional box between the group title and the search bar showing the N
  most-recently-active tabs in the group (by `lastAccessed`, added to `GroupedTabInfo`).
  Cards reuse the `.tab` styling so the box follows the grid/list layout. Clicking a card
  activates that tab. It refreshes when the group page becomes visible again (re-pulls fresh
  last-active times via `getGroupPageInitData`), so opening the group shows a current list.
- **Settings:** Settings → Group → "Show Recently active tabs box" (`groupRecent`, default
  on) and "How many recent tabs to show" (`groupRecentCount`, default 5).
- **Files:** `src/page.group/group.ts` (`setupRecent`/`renderRecent`/`createRecentCard`/
  `onGroupVisible`) + `group.html`; `src/styles/page.group/group.styl`; `groupRecent` +
  `groupRecentCount` in `src/defaults/settings.ts`, `src/types/settings.ts`,
  `GroupPageInitData` in `src/types/tabs.ts`; `src/services/tabs.bg.ts`; toggle + count in
  `src/page.setup/components/settings.group.vue`; labels in
  `src/_locales/dict.setup-page.ts` and `dict.browser.json`.
