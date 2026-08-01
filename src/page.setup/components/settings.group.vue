<template lang="pug">
section(ref="el")
  h2 {{translate('settings.group_title')}}
  span.header-shadow
  SelectField(
    label="settings.group_layout"
    optLabel="settings.group_layout_"
    v-model:value="Settings.state.groupLayout"
    dbg="groupLayout"
    :default="DEFAULT_SETTINGS.groupLayout"
    :opts="Settings.getOpts('groupLayout')"
    @update:value="Settings.saveDebounced(150)")
  ToggleField(
    label="settings.group_search"
    dbg="groupSearch"
    v-model:value="Settings.state.groupSearch"
    :default="DEFAULT_SETTINGS.groupSearch"
    @update:value="Settings.saveDebounced(150)")
  ToggleField(
    label="settings.group_sort"
    dbg="groupSort"
    v-model:value="Settings.state.groupSort"
    :default="DEFAULT_SETTINGS.groupSort"
    @update:value="Settings.saveDebounced(150)")
  SelectField(
    label="settings.group_sort_default"
    optLabel="settings.group_sort_mode_"
    dbg="groupSortDefault"
    v-model:value="Settings.state.groupSortDefault"
    :default="DEFAULT_SETTINGS.groupSortDefault"
    :opts="Settings.getOpts('groupSortDefault')"
    @update:value="Settings.saveDebounced(150)")
  ToggleField(
    label="settings.group_recent"
    dbg="groupRecent"
    v-model:value="Settings.state.groupRecent"
    :default="DEFAULT_SETTINGS.groupRecent"
    @update:value="Settings.saveDebounced(150)")
  .sub-fields
    CountField.-inline(
      label="settings.group_recent_count"
      dbg="groupRecentCount"
      v-model:value="Settings.state.groupRecentCount"
      :default="DEFAULT_SETTINGS.groupRecentCount"
      :min="1"
      :inactive="!Settings.state.groupRecent"
      @update:value="Settings.saveDebounced(500)")
  ToggleField(
    label="settings.group_fav"
    dbg="groupFav"
    v-model:value="Settings.state.groupFav"
    :default="DEFAULT_SETTINGS.groupFav"
    @update:value="Settings.saveDebounced(150)")
  ToggleField(
    label="settings.warn_on_close_group"
    dbg="warnOnCloseGroup"
    v-model:value="Settings.state.warnOnCloseGroup"
    :default="DEFAULT_SETTINGS.warnOnCloseGroup"
    @update:value="Settings.saveDebounced(150)")
</template>

<script lang="ts" setup>
import { ref, onMounted } from 'vue'
import { translate } from 'src/dict'
import { DEFAULT_SETTINGS } from 'src/defaults'
import * as Settings from 'src/services/settings.fg'
import * as SetupPage from 'src/services/setup-page.fg'
import SelectField from '../../components/select-field.vue'
import ToggleField from '../../components/toggle-field.vue'
import CountField from '../../components/count-field.vue'

const el = ref<HTMLElement | null>(null)

onMounted(() => SetupPage.registerEl('settings_group', el.value))
</script>
