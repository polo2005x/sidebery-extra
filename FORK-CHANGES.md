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

## 4. "Shared parent" tab groups
- **What:** Right-click a tab → "Mark as shared parent" opens a submenu to assign the
  selected tab(s) to a shared-parent **group** — "New shared group", any existing group,
  or "Remove from shared group". New tabs opened from any member of a group become the
  last child of that group's last member. **Multiple groups coexist**: each group funnels
  independently, so you can have tabs #1/#2/#3 in group 1 and another set in group 2. Each
  group gets its own accent-bar color (left of the favicon). Groups persist across restarts
  and are per-window. Children of a shared parent are not auto-shared.
- **How to use:** Requires Tab Tree mode. The "Mark as shared parent" context-menu item
  must be enabled/added via Settings → Context Menu Editor → Tabs (Sidebery keeps a saved
  menu layout, so new default items don't appear automatically). Select the tabs, then pick
  a group from the submenu.
- **Data model:** `sharedParent` is a per-tab group id (`number`, >= 1; 0/undefined = not
  shared). Old boolean data is coerced to group 1 on load.
- **Files:** `sharedParent` group id in `src/types/tabs.ts` + persistence in
  `src/services/tabs.fg.ts`; group API (`setSharedParentGroup`, `clearSharedParent`,
  `getUsedSharedGroups`, `getNextSharedGroup`) in `src/services/tabs.fg.colors.ts`;
  placement in `src/services/tabs.fg.create.ts` (`getLastSharedSibling`, now matches on
  group id); submenu in `src/services/menu.fg.options.tabs.ts`, `src/defaults/menu.ts`,
  `src/page.setup/components/menu-editor.vue`; per-group color palette
  `SHARED_GROUP_COLORS` in `src/defaults.ts`; marker in `src/sidebar/components/tab.vue`
  + `src/styles/sidebar/tab.styl`; labels in `src/_locales/dict.common.ts`.

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
  Rendered as a compact two-column list of short rows (fav + title). The box is
  collapsible (click the header; state persisted in `localStorage`). Clicking a row
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

## 9. "Go to top of group"
- **What:** Jump from the active (or right-clicked) tab to the **group tab** that owns it —
  the top of its group — by walking up the tree (reuses `getGroupTab`). Two independent,
  opt-in entry points: a **context-menu item** ("Go to top of group") and a **keyboard
  shortcut** (`switch_to_group_tab`, "Go to top of group (group tab)"). Only active when the
  tab actually sits inside a group; the menu item greys out / hides otherwise. Requires Tab
  Tree mode (no tree = no group tab to go to).
- **How to enable:** The menu item must be added via Settings → Context Menu Editor → Tabs
  (Sidebery keeps a saved menu layout, so new default items don't appear automatically). The
  shortcut is unbound by default — assign a key in Settings → Keybindings → "Go to top of
  group (group tab)". Each is optional and enabled separately.
- **Setting:** Settings → Tabs → "'Go to top of group' switches to the group tab (off = just
  scroll to it)" (`groupTopActivate`, default on). On = activate the group tab; off = only
  scroll it into view without changing the active tab.
- **Files:** `Tabs.activateGroupTop` in `src/services/tabs.fg.ts` (uses `getGroupTab` +
  `scrollToTab`); menu option `goToGroupTop` in `src/services/menu.fg.options.tabs.ts`,
  `src/defaults/menu.ts`, `src/page.setup/components/menu-editor.vue`; keybinding handler in
  `src/services/keybindings.fg.ts`, command in `src/manifest.json`, list entry in
  `src/page.setup/components/keybindings.vue`; `groupTopActivate` in `src/defaults/settings.ts`,
  `src/types/settings.ts`, toggle in `src/page.setup/components/settings.tabs.vue`; labels in
  `src/_locales/dict.common.ts` (`menu.tab.go_to_group_top`), `dict.setup-page.ts`
  (`settings.group_top_activate`), and `dict.browser.json` (`KbSwitchToGroupTab`).

## 10. "Favourites" box on the group page
- **What:** A ⭐ button on each tab card (in the `.ctrls` row, next to discard/reload/close)
  marks that tab as a **favourite**. Favourites show in a collapsible **Favourites** box above
  the "Recently active tabs" box (compact two-column rows like Recent; click a row to activate).
  The favourite is a **flag on the tab itself** (`fav` in `TabSessionData`/`TabCache`, mirroring
  the `sharedParent` pattern), so it **follows the tab through URL changes** (favourite a forum
  post, navigate to a different page in the same tab — still favourited) and **survives a browser
  restart** (Firefox session-restore). It is dropped when the tab is closed or unfavourited — for
  permanent favourites, bookmark the page instead. Not a real bookmark.
- **Data flow:** the flag lives in the sidebar (`Tabs.byId`). The group page toggles it via
  `IPPC.bg('setTabFav', id, value)` → bg relay `Tabs.setTabFav` → `IPC.sidebar(win,'setTabFav')`
  → `Tabs.setTabFav` (sidebar) sets `tab.fav`, `saveTabData` + `cacheTabsData`. `getGroupedTabInfo`
  includes `fav` so the page shows the correct star on load / reopen.
- **Setting:** Settings → Group → "Show 'Favourites' box on the group page" (`groupFav`, default
  on). Passed via `getGroupPageInitData`; gates both the star buttons and the box.
- **Files:** `fav` in `src/types/tabs.ts` (`Tab`, `TabCache`, `TabSessionData`, `GroupedTabInfo`);
  persist/restore in `src/services/tabs.fg.ts` (`restoreTab`, `cacheTabsData`, `_saveTabData`);
  `getGroupedTabInfo` + `setTabFav` in `src/services/tabs.fg.groups.ts`; bg relay + `groupFav` +
  labels in `src/services/tabs.bg.ts`; action registration in `src/sidebar/sidebar.ts`,
  `src/bg/background.ts`, types in `src/types/ipc.ts`; group page `setupFav`/`renderFav`/
  `toggleFav` + star button in `src/page.group/group.ts`, box markup + `#icon_star` inject in
  `group.html`, `.fav-btn` styles in `src/styles/page.group/group.styl`; `groupFav` in
  `src/defaults/settings.ts`, `src/types/settings.ts`, toggle in
  `src/page.setup/components/settings.group.vue`; labels in `dict.setup-page.ts`
  (`settings.group_fav`) and `dict.browser.json` (`group_fav_title`, `group_tab_fav_tooltip`).

## 11. Confirm before closing a group
- **What:** Optional confirmation popup when closing a **group tab** (a tab whose removal set
  includes an `isGroup` tab). Reuses the existing `Popups.confirm` path in `removeTabs`; fires
  independently of the "Confirmation of multiple tabs closing" setting and shows a group-specific
  message. Off by default.
- **Setting:** Settings → Group → "Confirm before closing a group" (`warnOnCloseGroup`, default off).
- **Files:** `warnGroup` branch in `src/services/tabs.fg.rm.ts` (`removeTabs`); `warnOnCloseGroup`
  in `src/defaults/settings.ts`, `src/types/settings.ts`, toggle in
  `src/page.setup/components/settings.group.vue`; message `confirm.group_close` in
  `src/_locales/dict.sidebar.ts`, setting label `settings.warn_on_close_group` in
  `dict.setup-page.ts`.
