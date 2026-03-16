<template>
  <div class="strip">
    <!-- Glicemia media -->
    <div v-if="glicAvg" class="chip" :class="glicClass">
      🩸 <b>{{ glicAvg }} mg/dL</b>
    </div>
    <!-- Insulina tot -->
    <div v-if="insulinTot > 0" class="chip hi">
      💉 <b>{{ insulinTot.toFixed(1) }}U</b>
    </div>
    <!-- Carbo tot -->
    <div v-if="carbsTot > 0" class="chip hi">
      🌾 <b>{{ Math.round(carbsTot) }}g</b> carbo
    </div>
    <!-- Kcal tot -->
    <div v-if="kcalTot > 0" class="chip hi">
      🔥 <b>{{ Math.round(kcalTot) }}</b> kcal
    </div>
    <!-- Alcool -->
    <div v-if="alcUnits > 0" class="chip" :class="alcClass">
      🍷 <b>{{ alcUnits.toFixed(1) }}U</b>
    </div>
    <!-- Sport -->
    <div v-if="sportCount > 0" class="chip hi">
      🏃 <b>{{ sportCount }}</b> attività
    </div>
    <!-- Vuoto -->
    <div v-if="entries.length === 0" class="chip">
      📋 Nessuna voce oggi
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useAppStore } from '@/stores/app.js'
import { useEntriesStore } from '@/stores/index.js'
import { useConfigStore } from '@/stores/index.js'
import { getDK } from '@/data/constants.js'

const app = useAppStore()
const entriesStore = useEntriesStore()
const cfgStore = useConfigStore()

const entries = computed(() => entriesStore.forDay(getDK(app.dayOffset)))

const glicReadings = computed(() => entries.value.filter(e => e.type === 'glicemia' || e.glic))
const glicAvg = computed(() => {
  const vals = glicReadings.value.map(e => e.glic || e.value).filter(Boolean)
  if (!vals.length) return null
  return Math.round(vals.reduce((s, v) => s + v, 0) / vals.length)
})
const glicClass = computed(() => {
  const cfg = cfgStore.cfg
  const v = glicAvg.value
  if (!v) return ''
  if (v < cfg.targetMin) return 'bad'
  if (v > cfg.targetMax) return 'warn'
  return 'ok'
})
const insulinTot = computed(() =>
  entries.value.filter(e => e.type === 'insulina').reduce((s, e) => s + (e.units || 0), 0)
)
const carbsTot = computed(() => {
  let c = 0
  entries.value.forEach(e => {
    if (e.type === 'pasto' || e.type === 'spuntino') c += e.carbs || e.mC || 0
    if (e.type === 'alcool') c += e.carbs || 0
    if (e.type === 'aperitivi') c += e.carbs || 0
  })
  return c
})
const kcalTot = computed(() => {
  let k = 0
  entries.value.forEach(e => {
    if (e.type === 'pasto' || e.type === 'spuntino') k += e.kcal || 0
    if (e.type === 'alcool') k += e.kcal || 0
    if (e.type === 'sport') k -= e.kcal || 0
  })
  return Math.max(0, k)
})
const alcUnits = computed(() =>
  entries.value.filter(e => e.type === 'alcool').reduce((s, e) => s + (e.units || 0), 0)
)
const alcClass = computed(() => {
  const max = cfgStore.cfg.alcMax
  return alcUnits.value > max ? 'bad' : alcUnits.value > max * 0.7 ? 'warn' : 'ok'
})
const sportCount = computed(() => entries.value.filter(e => e.type === 'sport').length)
</script>
