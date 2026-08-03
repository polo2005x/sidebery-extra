<template lang="pug">
.FavSubPanel.ClosedTabsSubPanel
  ScrollBox
    .closed-tabs-container
      .closed-tab(
        v-for="tab in favTabs"
        :key="tab.id"
        data-lvl="0"
        :data-active="tab.id === activeId"
        :title="`${tab.customTitle ?? tab.title}\n---\n${tab.url}`"
        @click="activate(tab)")
        .body
          .fav(@dragstart.stop.prevent)
            img.fav-icon(v-if="tab.favIconUrl" :src="tab.favIconUrl" draggable="false")
            svg.fav-icon(v-else): use(:href="getFavPlaceholder(tab.url)")
          .t-box: .title {{tab.customTitle ?? tab.title}}
          .fav-unbtn(
            :title="translate('menu.tab.unfavourite')"
            @click.stop="unfav(tab)")
            svg: use(href="#icon_star_filled")
  .nothing-placeholder(v-if="!favTabs.length")
    .msg {{translate('panel.nothing')}}
</template>

<script lang="ts" setup>
import { computed } from 'vue'
import type * as T from 'src/types'
import { translate } from 'src/dict'
import { getFavPlaceholder } from 'src/services/favicons'
import * as Tabs from 'src/services/tabs.fg'
import * as Sidebar from 'src/services/sidebar.fg'

// Favourited tabs in the active panel (favourites are scoped per panel). `favRev`
// is a reactive counter bumped when any fav flag changes (or a fav tab is
// removed), so the list stays live while the panel is open.
const favTabs = computed<T.Tab[]>(() => {
  void Tabs.reactive.favRev
  const pid = Sidebar.reactive.activePanelId
  return Tabs.list.filter(t => t.fav && t.panelId === pid)
})

const activeId = computed<ID>(() => Tabs.activeId)

function activate(tab: T.Tab): void {
  browser.tabs.update(tab.id, { active: true }).catch(() => {})
  Sidebar.closeSubPanel()
}

function unfav(tab: T.Tab): void {
  Tabs.setTabFav(tab.id, false)
}
</script>
