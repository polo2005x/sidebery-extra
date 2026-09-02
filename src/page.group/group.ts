import type * as T from 'src/types'
import { getFavPlaceholder } from 'src/services/favicons'
import { NOID, PAGE_HASH_RE, SETTINGS_OPTIONS } from 'src/defaults'
import { applyCustomCSS, applyThemeSrcVars } from './group.styles'
import * as Logs from './group.logs'
import * as IPPC from 'src/services/ippc.page'
import { DstTreePos, InstanceType } from 'src/enums'
import { getDomainOf } from 'src/utils'

let groupTitle = ''
let tabsBoxEl: HTMLElement | null = null
let newTabEl: HTMLDivElement | null = null
let groupWinId: ID = NOID
let groupTabId: ID = NOID
let groupLayout: (typeof SETTINGS_OPTIONS.groupLayout)[number] = 'grid'
let groupNewTabPos: 'first_child' | 'last_child' = 'last_child'
let pinTab: T.GroupPin | undefined
let tabs: T.GroupedTabInfo[] = []
let groupParentId: ID | undefined
let labels: Record<string, string>
let searchEnabled = false
let searchQuery = ''
let searchInputEl: HTMLInputElement | null = null
let searchCountEl: HTMLElement | null = null

const SORT_MODES = ['default', 'reverse', 'domain', 'title', 'url'] as const
type SortMode = (typeof SORT_MODES)[number]
let sortEnabled = false
let sortMode: SortMode = 'default'
let sortSelectEl: HTMLSelectElement | null = null

let recentEnabled = false
let recentCount = 5
let recentBoxEl: HTMLElement | null = null
let recentTabsEl: HTMLElement | null = null

let favEnabled = false
let favBoxEl: HTMLElement | null = null
let favTabsEl: HTMLElement | null = null
let favTitleTextEl: HTMLElement | null = null
let favCountEl: HTMLElement | null = null
let favFilterActive = false
let favFilterBtnEl: HTMLButtonElement | null = null

async function main() {
  try {
    parseUrl()
  } catch {
    Logs.err('Cannot parse url')
    const warnEl = document.getElementById('disconnected_warn')
    if (warnEl) warnEl.textContent = 'Cannot parse url'
    document.body.setAttribute('data-disconnected', 'true')
    const ldEl = document.getElementById('loading_dots')
    if (ldEl) ldEl.style.display = 'none'
    return
  }

  // Set title of group page
  const titleEl = document.getElementById('title') as HTMLInputElement
  titleEl.value = groupTitle
  document.title = groupTitle || '‎'

  // Initialize communication and get initial data
  const initData: T.GroupPageInitData = await IPPC.init(InstanceType.group, setHash, {
    update: onGroupUpdMsg,
  })
  const ldEl = document.getElementById('loading_dots')
  if (ldEl) ldEl.style.display = 'none'
  if (!initData) {
    Logs.err('Cannot initialize')
    const warnEl = document.getElementById('disconnected_warn')
    if (warnEl) warnEl.textContent = 'No initialization data'
    document.body.setAttribute('data-disconnected', 'true')
    return
  }

  groupWinId = initData.winId ?? NOID
  groupTabId = initData.tabId ?? NOID
  groupNewTabPos = initData.newTabPos ?? 'last_child'
  labels = initData.labels ?? {}

  Logs.setWinId(groupWinId)
  Logs.setTabId(groupTabId)

  if (initData.theme) document.body.setAttribute('data-theme', initData.theme)
  else Logs.warn('Cannot init sidebery theme')
  if (initData.frameColorScheme) {
    document.body.setAttribute('data-frame-color-scheme', initData.frameColorScheme)
  } else Logs.warn('Cannot set frame color scheme')
  if (initData.toolbarColorScheme) {
    document.body.setAttribute('data-toolbar-color-scheme', initData.toolbarColorScheme)
  } else Logs.warn('Cannot set toolbar color scheme')
  if (initData.parsedTheme) applyThemeSrcVars(initData.parsedTheme)
  else Logs.warn('Cannot apply firefox theme colors')
  if (initData.customCSS) applyCustomCSS(initData.customCSS)

  groupLayout = initData.groupLayout ?? 'grid'
  document.body.setAttribute('data-layout', groupLayout)
  document.body.setAttribute('data-animations', initData.animations ? 'fast' : 'none')

  if (!initData.groupInfo) {
    Logs.warn('No group info')
    const warnEl = document.getElementById('disconnected_warn')
    if (warnEl) warnEl.textContent = getLabel('group_disconnected_warn')
    document.body.setAttribute('data-disconnected', 'true')
    const ldEl = document.getElementById('loading_dots')
    if (ldEl) ldEl.style.display = 'none'
    return
  }

  tabs = initData.groupInfo.tabs || []
  groupParentId = initData.groupInfo.parentId
  pinTab = initData.groupInfo.pin

  // Listen chagnes of title
  titleEl.addEventListener('input', onTitleChange as (e: Event) => void)

  // Set favicons for each tab
  for (const tab of tabs) {
    if (tab.favIconUrl) continue
    const domain = getDomainOf(tab.url)
    const favicon = initData.groupInfo.favicons[domain]
    if (favicon) tab.favIconUrl = favicon
  }

  if (pinTab) {
    document.body.setAttribute('data-pin', 'true')
    document.title = pinTab.title
    updatePinnedTab(pinTab, (event: MouseEvent) => onTabClick(event, pinTab))
  }

  tabsBoxEl = document.getElementById('tabs')
  if (!tabsBoxEl) throw new Error('Cannot get tabs container element')

  while (tabsBoxEl.lastChild) {
    tabsBoxEl.removeChild(tabsBoxEl.lastChild)
  }

  // Must run before the tab loop so `favEnabled` is set when the cards (and
  // their star buttons) are built.
  if (initData.groupFav) setupFav()

  for (const tab of tabs) {
    createTabEl(tab, (event: MouseEvent) => onTabClick(event, tab))
    if (tab.el) tabsBoxEl.appendChild(tab.el)
  }

  createNewTabButton()

  // Default sort order for the group page. Applies whether or not the live sort
  // dropdown is shown; the dropdown (if enabled) starts from this value.
  if (initData.groupSortDefault && SORT_MODES.includes(initData.groupSortDefault as SortMode)) {
    sortMode = initData.groupSortDefault as SortMode
  }

  if (initData.groupSearch) setupSearch()
  if (initData.groupSort) setupSort()
  if (initData.groupFav) setupFavFilter()
  if (initData.groupRecent) setupRecent(initData.groupRecentCount)

  if (sortMode !== 'default') applySort()

  document.body.addEventListener('mousedown', e => {
    if (e.button === 2 && groupParentId !== undefined && groupParentId !== NOID) {
      e.preventDefault()
      IPPC.bg('tabsApiProxy', 'update', groupParentId, { active: true })
    }
  })

  document.body.addEventListener('contextmenu', e => e.preventDefault())
}

function setHash(h: string) {
  history.replaceState(undefined, '', `#${encodeURIComponent(groupTitle)}${h}`)
}

function parseUrl() {
  const reResult = PAGE_HASH_RE.exec(window.location.hash)
  const rawTitle = reResult?.groups?.prefix || ''

  groupTitle = decodeURIComponent(rawTitle).trim()
}

function getLabel(id: string) {
  return labels[id] ?? id
}

let onTitleChangeTimeout: number | undefined
function onTitleChange(e: DOMEvent<Event, HTMLInputElement>): void {
  clearTimeout(onTitleChangeTimeout)
  onTitleChangeTimeout = setTimeout(() => {
    const normTitle = e.target.value.trim()
    document.title = normTitle || '‎'
    history.replaceState(undefined, '', `#${encodeURIComponent(normTitle)}${IPPC.hashSuffix}`)
  }, 500)
}

/**
 * Handle group page update msg
 */
export function onGroupUpdMsg(upd: T.GroupUpdMsg) {
  if (!newTabEl) return

  let i
  if (upd.parentId !== undefined) groupParentId = upd.parentId
  if (upd.title !== undefined) {
    const normTitle = upd.title.trim()
    document.title = normTitle || '‎'
    const titleEl = document.getElementById('title') as HTMLInputElement | null
    if (titleEl) titleEl.value = normTitle
    history.replaceState(undefined, '', `#${encodeURIComponent(normTitle)}${IPPC.hashSuffix}`)
  }
  if (upd.windowId !== undefined) {
    groupWinId = upd.windowId
    Logs.setWinId(groupWinId)
  }

  if (upd.tabs !== undefined) {
    for (i = 0; i < upd.tabs.length; i++) {
      const newTab = upd.tabs[i]
      const oldTab = tabs[i]
      if (!oldTab) {
        createTabEl(newTab, (event: MouseEvent) => onTabClick(event, newTab))
        if (newTab.el) {
          newTabEl.before(newTab.el)
          tabs[i] = newTab
        }
      } else {
        updateTab(oldTab, newTab)
      }
    }

    for (; i < tabs.length; i++) {
      const tab = tabs[i]
      tab.el?.remove()
      tabs.splice(i, 1)
    }
  }

  if (upd.pin) {
    pinTab = upd.pin
    if (pinTab) {
      document.body.setAttribute('data-pin', 'true')
      document.title = pinTab.title
      updatePinnedTab(pinTab, (event: MouseEvent) => onTabClick(event, pinTab))
    }
  }

  if (upd.createdTab) onTabCreated(upd.createdTab)
  if (upd.updatedTab) onTabUpdated(upd.updatedTab)
  else if (upd.updatedTabs) upd.updatedTabs.forEach(t => onTabUpdated(t))
  if (upd.removedTab !== undefined) onTabRemoved(upd.removedTab)

  applySort()
  applyFilters()
  renderRecent()
  renderFav()
}

/**
 * Set up the group-page search bar (optional; controlled by the groupSearch setting)
 */
function setupSearch(): void {
  const boxEl = document.getElementById('search_box')
  searchInputEl = document.getElementById('search_input') as HTMLInputElement | null
  searchCountEl = document.getElementById('search_count')
  if (!boxEl || !searchInputEl) return

  searchEnabled = true
  searchInputEl.placeholder = getLabel('group_search_placeholder')
  boxEl.style.display = ''

  searchInputEl.addEventListener('input', () => {
    searchQuery = searchInputEl?.value ?? ''
    applyFilters()
  })
  searchInputEl.addEventListener('keydown', (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.stopPropagation()
      if (searchInputEl) searchInputEl.value = ''
      searchQuery = ''
      applyFilters()
    }
  })
  searchInputEl.addEventListener('mousedown', e => e.stopPropagation())

  // Focus so the user can start typing immediately
  setTimeout(() => searchInputEl?.focus(), 0)
}

const SEARCH_SPECIAL_RE = /[.*+?^${}()|[\]\\]/g

/**
 * Parse the query into terms (quote-aware). Each term is a case-insensitive regex;
 * if it isn't valid regex it's matched literally instead (never throws).
 */
function parseSearchTerms(query: string): RegExp[] {
  const terms: RegExp[] = []
  const re = /"([^"]+)"|(\S+)/g
  let m: RegExpExecArray | null
  while ((m = re.exec(query))) {
    const term = m[1] ?? m[2]
    if (!term) continue
    try {
      terms.push(new RegExp(term, 'i'))
    } catch {
      terms.push(new RegExp(term.replace(SEARCH_SPECIAL_RE, '\\$&'), 'i'))
    }
  }
  return terms
}

/**
 * Show only tabs matching every active filter: the search terms (title/url, AND-ed)
 * and, when the "favourites only" toggle is on, the favourite flag. Empty = show all.
 * Runs even when the search bar is disabled, so the fav filter works on its own.
 */
function applyFilters(): void {
  const query = searchEnabled ? searchQuery.trim() : ''
  const matchers = query ? parseSearchTerms(query) : []

  let shown = 0
  for (const tab of tabs) {
    if (!tab.el) continue
    let match = true
    if (matchers.length) {
      const hay = `${tab.title}\n${tab.url}`
      match = matchers.every(re => re.test(hay))
    }
    if (favFilterActive && !tab.fav) match = false
    // Inline style beats the stylesheet's per-layout .tab rules; '' restores default
    tab.el.style.display = match ? '' : 'none'
    if (match) shown++
  }

  if (searchCountEl) searchCountEl.textContent = query ? `${shown} / ${tabs.length}` : ''
}

/**
 * Set up the "favourites only" filter toggle (shown when the Favourites feature is on).
 */
function setupFavFilter(): void {
  favFilterBtnEl = document.getElementById('fav_filter') as HTMLButtonElement | null
  if (!favFilterBtnEl || !favEnabled) return

  favFilterBtnEl.title = getLabel('group_fav_filter_tooltip')
  favFilterBtnEl.style.display = ''
  favFilterBtnEl.setAttribute('data-active', 'false')

  favFilterBtnEl.addEventListener('mousedown', e => e.stopPropagation())
  favFilterBtnEl.addEventListener('click', () => {
    favFilterActive = !favFilterActive
    favFilterBtnEl?.setAttribute('data-active', String(favFilterActive))
    applyFilters()
  })
}

/**
 * Set up the group-page sort dropdown (optional; controlled by the groupSort setting)
 */
function setupSort(): void {
  const boxEl = document.getElementById('sort_box')
  sortSelectEl = document.getElementById('sort_select') as HTMLSelectElement | null
  if (!boxEl || !sortSelectEl) return

  sortEnabled = true
  for (const mode of SORT_MODES) {
    const optEl = document.createElement('option')
    optEl.value = mode
    optEl.textContent = getLabel('group_sort_' + mode)
    sortSelectEl.appendChild(optEl)
  }
  sortSelectEl.value = sortMode
  boxEl.style.display = ''

  sortSelectEl.addEventListener('change', () => {
    sortMode = (sortSelectEl?.value as SortMode) ?? 'default'
    applySort()
  })
  sortSelectEl.addEventListener('mousedown', e => e.stopPropagation())
}

/**
 * Reorder the displayed tab cards (view only; does not move the actual tabs)
 */
function applySort(): void {
  // Note: not gated on `sortEnabled` — a configured default order applies even
  // when the live sort dropdown is hidden.
  if (!tabsBoxEl || !newTabEl) return

  const sorted = tabs.slice()
  switch (sortMode) {
    case 'reverse':
      sorted.reverse()
      break
    case 'domain':
      sorted.sort((a, b) => getDomainOf(a.url).localeCompare(getDomainOf(b.url)) || a.index - b.index)
      break
    case 'title':
      sorted.sort((a, b) => a.title.localeCompare(b.title))
      break
    case 'url':
      sorted.sort((a, b) => a.url.localeCompare(b.url))
      break
    default:
      break // keep the original (tree/index) order
  }

  // Re-insert cards in the chosen order; keeps the new-tab button last
  for (const tab of sorted) {
    if (tab.el) tabsBoxEl.insertBefore(tab.el, newTabEl)
  }
}

/**
 * Set up the "Recently active tabs" box (optional; controlled by the groupRecent setting)
 */
function setupRecent(count?: number): void {
  recentBoxEl = document.getElementById('recent_box')
  recentTabsEl = document.getElementById('recent_tabs')
  const titleEl = document.getElementById('recent_title')
  if (!recentBoxEl || !recentTabsEl) return

  recentEnabled = true
  if (typeof count === 'number' && count > 0) recentCount = count
  if (titleEl) titleEl.textContent = getLabel('group_recent_title')

  // Collapsible; remember the state across sessions
  let collapsed = false
  try {
    collapsed = localStorage.getItem('groupRecentCollapsed') === '1'
  } catch {
    // localStorage may be unavailable; default to expanded
  }
  recentBoxEl.setAttribute('data-collapsed', String(collapsed))
  if (titleEl) {
    titleEl.addEventListener('mousedown', e => e.stopPropagation())
    titleEl.addEventListener('click', () => {
      const next = recentBoxEl?.getAttribute('data-collapsed') !== 'true'
      recentBoxEl?.setAttribute('data-collapsed', String(next))
      try {
        localStorage.setItem('groupRecentCollapsed', next ? '1' : '0')
      } catch {
        // ignore persistence failure
      }
    })
  }

  renderRecent()

  // Refresh the list whenever the group page becomes visible again (e.g. after
  // switching to another tab and back), by re-pulling fresh last-active times.
  document.addEventListener('visibilitychange', onGroupVisible)
}

async function onGroupVisible(): Promise<void> {
  if (!recentEnabled || document.visibilityState !== 'visible') return

  const fresh = await IPPC.bg('getGroupPageInitData', groupTabId).catch(() => undefined)
  const freshTabs = fresh?.groupInfo?.tabs
  if (!freshTabs) return

  const lastAccessedById = new Map<ID, number | undefined>()
  for (const t of freshTabs) lastAccessedById.set(t.id, t.lastAccessed)
  for (const tab of tabs) {
    const la = lastAccessedById.get(tab.id)
    if (la !== undefined) tab.lastAccessed = la
  }

  renderRecent()
}

/**
 * (Re)render the recent-tabs box: the N most-recently-active tabs in the group.
 * Reuses the .tab card classes so it follows the grid/list layout.
 */
function renderRecent(): void {
  if (!recentEnabled || !recentTabsEl) return

  const top = tabs
    .slice()
    .sort((a, b) => (b.lastAccessed ?? 0) - (a.lastAccessed ?? 0))
    .slice(0, recentCount)

  while (recentTabsEl.lastChild) recentTabsEl.removeChild(recentTabsEl.lastChild)
  for (const info of top) recentTabsEl.appendChild(createRecentCard(info))

  if (recentBoxEl) recentBoxEl.style.display = top.length ? '' : 'none'
}

/**
 * Build a compact standalone row for the recent box (separate element from the
 * main list, so it never disturbs the main list's tab elements).
 */
function createRecentCard(info: T.GroupedTabInfo): HTMLElement {
  let normURL
  try {
    normURL = decodeURI(info.url)
  } catch {
    normURL = info.url
  }

  const el = document.createElement('div')
  el.classList.add('recent-tab')
  el.title = normURL

  const favEl = document.createElement('div')
  favEl.classList.add('recent-tab-fav')
  if (info.favIconUrl) favEl.style.backgroundImage = `url(${info.favIconUrl})`
  else favEl.appendChild(createSvgIcon(getFavPlaceholder(info.url)))
  el.appendChild(favEl)

  const titleEl = document.createElement('span')
  titleEl.classList.add('recent-tab-title')
  titleEl.textContent = info.title || normURL
  el.appendChild(titleEl)

  el.addEventListener('mousedown', e => e.stopPropagation())
  el.addEventListener('click', (event: MouseEvent) => onTabClick(event, info))

  return el
}

// --- Favourites box -------------------------------------------------------
// A collapsible box (above Recent) listing the tabs the user has starred. The
// favourite flag lives on the tab itself (persisted via the sidebar), so it
// follows the tab through URL changes and survives a restart, and it's dropped
// when the tab is closed.

function setupFav(): void {
  favBoxEl = document.getElementById('fav_box')
  favTabsEl = document.getElementById('fav_tabs')
  const titleEl = document.getElementById('fav_title')
  favTitleTextEl = document.getElementById('fav_title_text')
  favCountEl = document.getElementById('fav_count')
  if (!favBoxEl || !favTabsEl) return

  favEnabled = true
  if (favTitleTextEl) favTitleTextEl.textContent = getLabel('group_fav_title')

  // Collapsible; remember the state across sessions
  let collapsed = false
  try {
    collapsed = localStorage.getItem('groupFavCollapsed') === '1'
  } catch {
    // localStorage may be unavailable; default to expanded
  }
  favBoxEl.setAttribute('data-collapsed', String(collapsed))
  if (titleEl) {
    titleEl.addEventListener('mousedown', e => e.stopPropagation())
    titleEl.addEventListener('click', () => {
      const next = favBoxEl?.getAttribute('data-collapsed') !== 'true'
      favBoxEl?.setAttribute('data-collapsed', String(next))
      try {
        localStorage.setItem('groupFavCollapsed', next ? '1' : '0')
      } catch {
        // ignore persistence failure
      }
    })
  }

  renderFav()
}

/** (Re)render the favourites box: the group's tabs whose `fav` flag is set. */
function renderFav(): void {
  if (!favEnabled || !favTabsEl) return

  const marked = tabs.filter(t => t.fav)

  while (favTabsEl.lastChild) favTabsEl.removeChild(favTabsEl.lastChild)
  for (const info of marked) favTabsEl.appendChild(createRecentCard(info))

  if (favCountEl) favCountEl.textContent = marked.length ? String(marked.length) : ''
  if (favBoxEl) favBoxEl.style.display = marked.length ? '' : 'none'
}

/**
 * Toggle the favourite flag on a tab: update the tab card, persist via the
 * background (which relays to the sidebar), and refresh the favourites box.
 */
function toggleFav(info: T.GroupedTabInfo): void {
  const next = !info.fav
  info.fav = next
  info.el?.setAttribute('data-favourite', String(next))
  renderFav()
  if (favFilterActive) applyFilters()
  IPPC.bg('setTabFav', info.id, next).catch(err => {
    // Roll back the optimistic change if persistence failed
    Logs.err('group: setTabFav failed', err)
    info.fav = !next
    info.el?.setAttribute('data-favourite', String(!next))
    renderFav()
    if (favFilterActive) applyFilters()
  })
}

/**
 * Handle creating tab
 */
async function onTabCreated(tab: T.GroupedTabInfo) {
  createTabEl(tab, (event: MouseEvent) => onTabClick(event, tab))
  if (!tab.el || !newTabEl) return

  const index = tab.index
  if (index === -1 || index === tabs.length) {
    newTabEl.before(tab.el)
    tabs.push(tab)
  } else if (index >= 0 && index < tabs.length) {
    tabs[index].el?.before(tab.el)
    tabs.splice(index, 0, tab)
  } else {
    Logs.warn('Cannot add new tab: Wrong index:', index)
    return
  }
}

/**
 * Handle tab update msg
 */
function onTabUpdated(upd: T.GroupedTabInfo) {
  const tab = tabs.find(t => t.id === upd.id)
  if (!tab?.el) return

  let normURL
  try {
    normURL = decodeURI(upd.url)
  } catch {
    normURL = upd.url
  }

  tab.el.title = normURL
  tab.el.setAttribute('data-fav', String(!!upd.favIconUrl))
  if (tab.favEl) tab.favEl.style.backgroundImage = `url(${upd.favIconUrl})`
  tab.favIconUrl = upd.favIconUrl

  if (tab.titleEl) tab.titleEl.textContent = upd.title
  tab.title = upd.title

  if (tab.urlEl) {
    if (upd.url.startsWith('moz-ext')) tab.urlEl.textContent = ''
    else tab.urlEl.textContent = normURL
  }
  tab.url = upd.url

  if (tab.favPlaceholderSvgEl) {
    setSvgId(tab.favPlaceholderSvgEl, getFavPlaceholder(upd.url))
  }

  tab.el.setAttribute('data-discarded', String(upd.discarded))
  tab.discarded = upd.discarded

  tab.el.setAttribute('data-lvl', String(upd.lvl))
  tab.lvl = upd.lvl

  tab.fav = upd.fav
  tab.el.setAttribute('data-favourite', String(!!upd.fav))
}

/**
 * Handle tab remove msg
 */
function onTabRemoved(id: ID) {
  const index = tabs.findIndex(t => t.id === id)
  if (index === -1) return
  tabs[index].el?.remove()
  tabs.splice(index, 1)

  if (tabs.length === 0 && window.location.search.includes('pin=')) {
    IPPC.bg('tabsApiProxy', 'remove', groupTabId)
  }
}

/**
 * Create new-tab button
 */
function createNewTabButton() {
  if (!tabsBoxEl) return

  newTabEl = document.createElement('div')
  newTabEl.classList.add('new-tab')
  newTabEl.title = getLabel('group_new_tab_tooltip')
  tabsBoxEl.appendChild(newTabEl)

  const plusIconEl = document.createElement('div')
  plusIconEl.classList.add('new-tab-plus')
  newTabEl.appendChild(plusIconEl)

  newTabEl.addEventListener('mousedown', (e: MouseEvent) => e.stopPropagation())
  newTabEl.addEventListener('mouseup', e => e.stopPropagation())
  newTabEl.addEventListener('click', () => {
    const pos = groupNewTabPos === 'last_child' ? DstTreePos.End : DstTreePos.Start
    const newTabConf = { id: 0, url: 'about:newtab', active: true }
    const dst: T.DstPlaceInfo = { windowId: groupWinId, parentId: groupTabId, pos }
    IPPC.bg('openTabs', [newTabConf], dst)
  })
}

/**
 * Create tab element
 */
function createTabEl(info: T.GroupedTabInfo, clickHandler: (e: MouseEvent) => void) {
  let normURL
  try {
    normURL = decodeURI(info.url)
  } catch {
    normURL = info.url
  }

  info.el = document.createElement('div')
  info.el.classList.add('tab')
  info.el.title = normURL
  info.el.setAttribute('data-lvl', String(info.lvl))
  info.el.setAttribute('data-discarded', String(info.discarded))
  info.el.setAttribute('data-fav', String(!!info.favIconUrl))

  info.bgEl = document.createElement('div')
  info.bgEl.classList.add('bg')
  info.el.appendChild(info.bgEl)

  info.favEl = document.createElement('div')
  info.favEl.classList.add('fav')
  info.favEl.style.backgroundImage = `url(${info.favIconUrl})`
  info.el.appendChild(info.favEl)

  info.favPlaceholderEl = document.createElement('div')
  info.favPlaceholderEl.classList.add('fav-placeholder')
  const iconId = getFavPlaceholder(info.url)
  info.favPlaceholderSvgEl = createSvgIcon(iconId)
  info.favPlaceholderEl.appendChild(info.favPlaceholderSvgEl)
  info.el.appendChild(info.favPlaceholderEl)

  const infoEl = document.createElement('div')
  infoEl.classList.add('info')
  info.el.appendChild(infoEl)

  info.titleEl = document.createElement('h3')
  info.titleEl.classList.add('tab-title')
  info.titleEl.textContent = info.title
  infoEl.appendChild(info.titleEl)

  info.urlEl = document.createElement('span')
  info.urlEl.classList.add('tab-url')
  info.urlEl.setAttribute('href', info.url)
  info.urlEl.addEventListener('click', e => e.preventDefault())
  if (info.url.startsWith('moz-ext')) info.urlEl.textContent = ''
  else info.urlEl.textContent = normURL
  infoEl.appendChild(info.urlEl)

  info.el.setAttribute('data-favourite', String(!!info.fav))

  const ctrlsEl = document.createElement('div')
  ctrlsEl.classList.add('ctrls')
  info.el.appendChild(ctrlsEl)

  if (favEnabled) {
    const favBtnEl = createTabButton('#icon_star', 'fav-btn', event => {
      event.stopPropagation()
      toggleFav(info)
    })
    favBtnEl.title = getLabel('group_tab_fav_tooltip')
    ctrlsEl.appendChild(favBtnEl)
  }

  const discardBtnEl = createTabButton('#icon_discard', 'discard-btn', event => {
    event.stopPropagation()
    IPPC.bg('tabsApiProxy', 'discard', info.id)
  })
  discardBtnEl.title = getLabel('group_tab_discard_tooltip')
  ctrlsEl.appendChild(discardBtnEl)

  const reloadBtnEl = createTabButton('#icon_reload', 'reload-btn', event => {
    event.stopPropagation()
    if (event.button === 0 || event.button === 1) {
      IPPC.bg('tabsApiProxy', 'reload', info.id)
    }
  })
  reloadBtnEl.title = getLabel('group_tab_reload_tooltip')
  ctrlsEl.appendChild(reloadBtnEl)

  const closeBtnEl = createTabButton('#icon_close', 'close-btn', event => {
    event.stopPropagation()
    IPPC.bg('tabsApiProxy', 'remove', info.id)
  })
  closeBtnEl.title = getLabel('group_tab_close_tooltip')
  ctrlsEl.appendChild(closeBtnEl)

  info.el.addEventListener('mousedown', e => e.stopPropagation())
  info.el.addEventListener('click', clickHandler)
}

let pinnedTabEventsListeners = false
/**
 * Create pinned tab element on the page
 */
function updatePinnedTab(info: T.GroupPin, clickHandler: (e: MouseEvent) => void) {
  info.el = document.getElementById('pinned_tab')
  if (!info.el) return
  info.el.title = info.url

  info.bgEl = document.getElementById('pinned_tab_bg')

  info.titleEl = document.getElementById('pinned_tab_title')
  if (info.titleEl) info.titleEl.textContent = info.title

  info.urlEl = document.getElementById('pinned_tab_url')
  if (info.urlEl) info.urlEl.textContent = info.url

  if (!pinnedTabEventsListeners) {
    info.el.addEventListener('mousedown', e => e.stopPropagation())
    info.el.addEventListener('click', clickHandler)
    pinnedTabEventsListeners = true
  }
}

function createTabButton(svgId: string, className: string, clickHandler: (e: MouseEvent) => void) {
  const btnEl = document.createElement('div')
  btnEl.classList.add('tab-btn', className)

  const svgEl = createSvgIcon(svgId)
  btnEl.appendChild(svgEl)

  btnEl.addEventListener('click', clickHandler)

  return btnEl
}

/**
 * Create svg element with use tag
 */
function createSvgIcon(svgId: string) {
  const svgEl = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
  svgEl.setAttributeNS(
    'http://www.w3.org/2000/xmlns/',
    'xmlns:xlink',
    'http://www.w3.org/1999/xlink'
  )

  const useEl = document.createElementNS('http://www.w3.org/2000/svg', 'use')
  useEl.setAttributeNS('http://www.w3.org/1999/xlink', 'href', svgId)
  svgEl.appendChild(useEl)

  return svgEl
}

/**
 * Set id for use tag
 */
function setSvgId(svgEl: SVGElement, svgId: string) {
  const useEl = svgEl.childNodes[0] as SVGElement
  if (!useEl) return
  useEl.setAttributeNS('http://www.w3.org/1999/xlink', 'href', svgId)
}

/**
 * Handle tab click
 */
function onTabClick(event: MouseEvent, tab?: { id: ID }) {
  if (!tab) return
  event.stopPropagation()
  IPPC.bg('tabsApiProxy', 'update', tab.id, { active: true })
}

/**
 * Update tab
 */
function updateTab(oldTab: T.GroupedTabInfo, newTab: T.GroupedTabInfo) {
  const titleChanged = oldTab.title !== newTab.title
  const urlChanged = oldTab.url !== newTab.url

  if (!oldTab.el) return Logs.warn('updateTab: no el')

  if (titleChanged && oldTab.titleEl) oldTab.titleEl.textContent = newTab.title
  if (urlChanged && oldTab.urlEl) {
    if (newTab.url.startsWith('moz-ext')) oldTab.urlEl.textContent = ''
    else oldTab.urlEl.textContent = newTab.url
    oldTab.urlEl.setAttribute('href', newTab.url)
    oldTab.el.title = newTab.url
    if (oldTab.favPlaceholderSvgEl) {
      setSvgId(oldTab.favPlaceholderSvgEl, getFavPlaceholder(newTab.url))
    }
  }
  if (oldTab.lvl !== newTab.lvl) oldTab.el.setAttribute('data-lvl', String(newTab.lvl))
  if (oldTab.discarded !== newTab.discarded) {
    oldTab.el.setAttribute('data-discarded', String(newTab.discarded))
  }
  if (oldTab.favIconUrl !== newTab.favIconUrl && oldTab.favEl) {
    oldTab.el.setAttribute('data-fav', String(!!newTab.favIconUrl))
    oldTab.favEl.style.backgroundImage = `url(${newTab.favIconUrl})`
  }

  Object.assign(oldTab, newTab)
}

void main()
