import { NOID } from 'src/defaults'
import * as Utils from 'src/utils'
import * as Containers from 'src/services/containers'
import * as Settings from 'src/services/settings'
import * as Tabs from 'src/services/tabs.fg'

const CONTAINER_COLORS: Record<string, string> = {
  blue: '#37adff',
  turquoise: '#00c79a',
  cyan: '#00c79a',
  green: '#51cd00',
  yellow: '#ffcb00',
  orange: '#ff9f00',
  red: '#ff613d',
  pink: '#ff4bda',
  purple: '#af51f5',
}

export function colorizeTabs(): void {
  for (const tab of Tabs.list) {
    colorizeTab(tab.id)
  }
}

const colorizeTabTimeouts: Record<ID, number> = {}
export function colorizeTabDebounced(tabId: ID, delayMS = 500): void {
  clearTimeout(colorizeTabTimeouts[tabId])
  colorizeTabTimeouts[tabId] = setTimeout(() => {
    delete colorizeTabTimeouts[tabId]
    colorizeTab(tabId)
  }, delayMS)
}

export function colorizeTab(tabId: ID): void {
  const tab = Tabs.byId[tabId]
  if (!tab) return

  let srcStr, color
  if (Settings.state.colorizeTabsSrc === 'domain') {
    srcStr = Utils.getDomainOf(tab.url)
    color = Utils.colorFromString(srcStr, 60)
  } else {
    const container = Containers.reactive.byId[tab.cookieStoreId]
    if (container) {
      color = CONTAINER_COLORS[container.color]
    } else {
      color = null
    }
  }

  tab.reactive.color = color
}

export function colorizeBranches(): void {
  for (const tab of Tabs.list) {
    if (tab.isParent && tab.lvl === 0) colorizeBranch(tab.id)
  }
}

export function colorizeBranch(rootId: ID): void {
  const rootTab = Tabs.byId[rootId]
  if (!rootTab || rootTab.lvl > 0) return

  let srcStr
  if (Settings.state.colorizeTabsBranchesSrc === 'url') {
    srcStr = rootTab.url
  } else {
    srcStr = Utils.getDomainOf(rootTab.url)
  }

  const color = Utils.colorFromString(srcStr, 60)
  rootTab.reactive.branchColor = color

  for (let i = rootTab.index + 1; i < Tabs.list.length; i++) {
    const tab = Tabs.list[i]
    if (tab.lvl === 0) break

    tab.reactive.branchColor = color
  }
}

export function setBranchColor(tabId: ID): void {
  const tab = Tabs.byId[tabId]
  if (!tab) return
  if (tab.parentId === NOID) {
    if (tab.isParent) Tabs.colorizeBranch(tab.id)
    else {
      if (tab.reactive.branchColor) tab.reactive.branchColor = null
    }
    return
  }

  let parent = Tabs.byId[tab.parentId]
  while (parent && parent.lvl > 0) {
    parent = Tabs.byId[parent.parentId]
  }
  if (!parent) return

  if (parent.reactive.branchColor) {
    tab.reactive.branchColor = parent.reactive.branchColor
  } else {
    Tabs.colorizeBranch(parent.id)
  }
}

export function setCustomColor(tabIds: ID[], color: string): void {
  Tabs.sortTabIds(tabIds)

  for (const id of tabIds) {
    const tab = Tabs.byId[id]
    if (!tab) continue

    tab.customColor = color !== 'toolbar' ? color : undefined
    tab.reactive.customColor = tab.customColor ?? null

    Tabs.saveTabData(tab.id)
  }

  Tabs.cacheTabsData()
}

/**
 * Assign the given tabs to a shared-parent group. Tabs opened from any member
 * of a group funnel to become a child of that group's last member at its level
 * (see Tabs.getIndexForNewTab / getParentForNewTab). Multiple groups coexist,
 * each identified by its own positive id.
 */
export function setSharedParentGroup(tabIds: ID[], group: number): void {
  if (!tabIds.length || group <= 0) return

  for (const id of tabIds) {
    const tab = Tabs.byId[id]
    if (!tab) continue

    tab.sharedParent = group
    tab.reactive.sharedParent = group

    Tabs.saveTabData(tab.id)
  }

  Tabs.cacheTabsData()
}

/**
 * Remove the given tabs from any shared-parent group.
 */
export function clearSharedParent(tabIds: ID[]): void {
  if (!tabIds.length) return

  for (const id of tabIds) {
    const tab = Tabs.byId[id]
    if (!tab) continue

    tab.sharedParent = undefined
    tab.reactive.sharedParent = 0

    Tabs.saveTabData(tab.id)
  }

  Tabs.cacheTabsData()
}

/**
 * All shared-parent group ids currently in use, sorted ascending.
 */
export function getUsedSharedGroups(): number[] {
  const set = new Set<number>()
  for (const tab of Tabs.list) {
    if (tab.sharedParent) set.add(tab.sharedParent)
  }
  return [...set].sort((a, b) => a - b)
}

/**
 * Smallest positive group id not currently in use (reuses freed ids).
 */
export function getNextSharedGroup(): number {
  const used = getUsedSharedGroups()
  let n = 1
  for (const g of used) {
    if (g < n) continue
    if (g === n) n++
    else break
  }
  return n
}
