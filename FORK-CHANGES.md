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
  default on. Passed via `getGroupPageInitData`. When the page is reopened the dropdown resets
  to the configured default order (see below).
- **Default order (`groupSortDefault`):** Settings → Group → "Default sort order on the group
  page" — a select (default / reverse / by domain / by title / by URL), default `default`
  (tree order). This is the order the group page uses on load, and it applies **even when the
  sort dropdown is hidden** (`applySort` is no longer gated on the dropdown being enabled); when
  the dropdown is shown it starts from this value. Passed via `getGroupPageInitData`.
- **Files:** `src/page.group/group.ts` (`setupSort`/`applySort`, initial `sortMode` from
  `groupSortDefault` + apply on load) + `group.html`; `src/styles/page.group/group.styl`;
  `groupSort` + `groupSortDefault` (and `SETTINGS_OPTIONS.groupSortDefault`) in
  `src/defaults/settings.ts`, `src/types/settings.ts`, `GroupPageInitData` in `src/types/tabs.ts`;
  `src/services/tabs.bg.ts`; toggle + select in `src/page.setup/components/settings.group.vue`;
  labels in `src/_locales/dict.setup-page.ts` (`settings.group_sort_default`,
  `settings.group_sort_mode_*`) and `dict.browser.json`.

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
  shortcut** (`switch_to_group_tab`, "Go to top of group (group tab)"). The menu item is only
  shown when the tab actually sits inside a group (`getGroupTab` gate — returns `undefined` to
  fully hide otherwise). Requires Tab Tree mode (no tree = no group tab to go to).
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
- **Sidebar tree marker:** a favourited tab also shows a small solid gold ⭐ badge flush in the
  tab's bottom-left corner in the main tab tree. Driven by a reactive `fav` prop
  (`ReactiveTabProps`), set in the reactive builder, on restore (`restoreTab` sets
  `tab.reactive.fav = tab.fav = true`, else the marker misses a browser restart), and live by
  `setTabFav`. Uses a dedicated solid star icon `#icon_star_filled` (`src/assets/star-filled.svg`,
  injected in `sidebar.html`). Files: `fav` in `ReactiveTabProps` (`src/types/tabs.ts`) + mock in
  `src/defaults/mocks.tabs.fg.ts`; reactive set/restore in `src/services/tabs.fg.ts`; `.fav-mark`
  in `src/sidebar/components/tab.vue` and `src/styles/sidebar/tab.styl`.
- **Favourite from the tree:** right-click a tab → **"Favourite" / "Unfavourite"** (dynamic
  label like pin/mute). Multi-select aware; only shown when the tab is **inside a group**
  (`getGroupTab` gate — returns `undefined` to fully hide otherwise). Also a keybinding
  `toggle_fav` ("Favourite / unfavourite tab (in a group)", unbound by default). Both use
  `Tabs.setFavOfTabs`/`Tabs.toggleFav` (sidebar-side, no bg relay needed). Menu item must be
  added via Context Menu Editor → Tabs. Files: `favTab` option + `setFavOfTabs`/`toggleFav` in
  `src/services/menu.fg.options.tabs.ts` + `src/services/tabs.fg.groups.ts`; `src/defaults/menu.ts`,
  `src/page.setup/components/menu-editor.vue`; keybinding in `src/services/keybindings.fg.ts`,
  `src/manifest.json`, `src/page.setup/components/keybindings.vue`; labels
  `menu.tab.favourite`/`unfavourite` in `dict.common.ts`, `KbToggleFav` in `dict.browser.json`.
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

## 12. "Favourites" sub-panel (per panel)
- **What:** A sidebar sub-panel (like the recently-closed / bookmarks sub-panels) that lists the
  favourited tabs **in the active panel** — surfacing the favourites (#10) beyond a single group
  page, scoped to the current workspace. Click a row to activate that tab; click the gold star on
  the right to unfavourite it in place. Highlights the active tab's row.
- **Trigger:** a bottom-bar tool button (solid `#icon_star_filled`), gated by a new setting
  Settings → Navigation bar → "Favourites sub-panel" (`subPanelFav`, default **off**). The button
  (and, when it's the only enabled sub-panel, the whole bottom bar + its reserved space) is
  **hidden unless the active panel has at least one favourite** — so it never shows an empty panel.
  Opens via `Sidebar.openSubPanel(SubPanelType.Favourites, activePanel)`; the data is live, no
  open-handling needed.
- **Reactivity:** the list is `Tabs.list.filter(t => t.fav && t.panelId === activePanelId)`, kept
  live by a reactive counter `Tabs.reactive.favRev` bumped in `setTabFav` (toggle) and in the
  tab-removed handler when a favourited tab closes. `bottomBar` (`sidebar.vue`) and
  `bottomBarSpaceNeeded` (`panel.tabs.vue`) became computeds that include `subPanelFav && <panel
  has a favourite>`, so the bar/space appear and disappear with the active panel's favourites.
- **Files:** `SubPanelType.Favourites` in `src/enums.ts`; `favRev` in `TabsReactiveState`
  (`src/services/tabs.fg.ts`) + bumps in `src/services/tabs.fg.groups.ts` (`setTabFav`) and
  `src/services/tabs.fg.handlers.ts` (removal); component `src/sidebar/components/sub-panel.favourites.vue`
  (reuses `.ClosedTabsSubPanel` row styles) + registration/title/`isFav` in
  `src/sidebar/components/sub-panel.vue`; bottom-bar button + `bottomBar`/`favInActivePanel`
  computeds in `src/sidebar/sidebar.vue`; per-panel `bottomBarSpaceNeeded` in
  `src/sidebar/components/panel.tabs.vue`; extra styles
  `src/styles/sidebar/sub-panel.favourites.styl` (imported in `sidebar.styl`); `subPanelFav` in
  `src/defaults/settings.ts`, `src/types/settings.ts`, toggle in
  `src/page.setup/components/settings.navbar.vue`; labels `settings.sub_panel.fav` in
  `dict.setup-page.ts` and `sub_panel.fav_panel.title` in `dict.sidebar.ts`.

## 14. Protect favourites from bulk close & auto-unload
- **What:** When enabled, favourited (⭐, feature #10) tabs are excluded from *sweep*
  operations — the ones that act on tabs you didn't individually pick — turning the
  favourite flag into active protection, not just a marker. Covered:
  - **Bulk close:** "Close other tabs", "Close tabs above", "Close tabs below"
    (`removeOtherTabs`/`removeTabsAbove`/`removeTabsBelow`) skip ⭐ tabs.
  - **Auto/bulk unload:** non-explicit `discardTabs` (unload all / others / folded /
    all-in-inactive-panels keybindings and the panel "Unload tabs" menu item) and the
    fold auto-discard (`autoDiscardFolded`, both immediate and delayed) skip ⭐ tabs.
- **Not affected (deliberate):** explicitly closing a ⭐ tab (its own Close button/menu,
  or selecting it and pressing close) and the per-tab "Unload" menu item
  (`discardTabs(..., explicit=true)`) still work — protection only applies to sweeps where
  the tab wasn't individually chosen.
- **Setting:** Settings → Tabs → "Protect favourite tabs from bulk close & auto-unload"
  (`favProtect`, default **off**). Single toggle covering both behaviours.
- **Files:** fav skips in `src/services/tabs.fg.rm.ts` (`removeTabsAbove`/`removeTabsBelow`/
  `removeOtherTabs`) and `src/services/tabs.fg.ts` (`discardTabs` non-explicit filter,
  `autoDiscardFolded`); `favProtect` in `src/defaults/settings.ts`, `src/types/settings.ts`,
  toggle in `src/page.setup/components/settings.tabs.vue`; label `settings.fav_protect` in
  `src/_locales/dict.setup-page.ts`.

## 13. Close button in the sub-panel header
- **What:** A close (✕) button on the left of every sub-panel's header (`sub-panel.vue`), calling
  `Sidebar.closeSubPanel()`. Previously a sub-panel could only be dismissed by clicking the dimmed
  overlay, which isn't obvious. Applies to all sub-panels (recently-closed, bookmarks, history,
  sync, favourites). The Sync panel's reload button moved from the header's left to its right to
  keep the title centred.
- **Files:** header markup in `src/sidebar/components/sub-panel.vue` (reuses existing `.header-btn`
  styles + `#icon_close`); tooltip label `sub_panel.close_tooltip` in `src/_locales/dict.sidebar.ts`.
