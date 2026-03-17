<template>
  <div class="panel" :class="[{ on: visible }, panelClass]">
    <div class="ph"></div>

    <!-- Banner giorno selezionato -->
    <div class="panel-day-banner" :class="{ on: dayOffset !== 0 }">
      <span>📅 Stai aggiungendo per: <b>{{ dayLabel }}</b></span>
    </div>

    <slot />
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useAppStore } from '@/stores/app.js'
import { getDF } from '@/data/constants.js'

const props = defineProps({
  visible: { type: Boolean, default: false },
  panelClass: { type: String, default: '' }
})

const app = useAppStore()
const dayOffset = computed(() => app.dayOffset)
const dayLabel = computed(() => getDF(app.dayOffset))
</script>
