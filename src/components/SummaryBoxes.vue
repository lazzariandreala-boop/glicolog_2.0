<template>
  <div class="sum-sec">
    <div class="sum-grid">
      <!-- Glicemia -->
      <div class="sum-box glic" @click="app.openPanelFor('glicemia')">
        <div class="sum-ico">🩸</div>
        <div>
          <span class="sum-val" :style="{ color: glicColor }">{{ glicAvg || '—' }}</span>
          <span v-if="glicAvg" class="sum-unit">mg/dL</span>
        </div>
        <div class="sum-lbl">Glicemia media</div>
        <div v-if="glicAvg" class="sum-sub">Media: {{ glicAvg }} · Min: {{ glicMin }} · Max: {{ glicMax }}</div>
      </div>

      <!-- Settimana alcool -->
      <div class="sum-box week">
        <div class="sum-ico">🍷</div>
        <div>
          <span class="sum-val" :style="{ color: alcColor }">{{ weekAlc.toFixed(1) }}</span>
          <span class="sum-unit">U</span>
        </div>
        <div class="sum-lbl">Alcool questa settimana</div>
        <div class="sum-sub">Limite: {{ cfgStore.cfg.alcMax }}U · Rimanenti: {{ Math.max(0, cfgStore.cfg.alcMax - weekAlc).toFixed(1) }}U</div>
      </div>

      <!-- Sport -->
      <div class="sum-box sport" v-if="sportEntries.length > 0">
        <div class="sum-ico">🏃</div>
        <div class="sum-sport-grid">
          <div class="sum-sport-item">
            <span class="sum-sport-v">{{ sportEntries.length }}</span>
            <span class="sum-sport-l">Sessioni</span>
          </div>
          <div class="sum-sport-item">
            <span class="sum-sport-v">{{ sportMinutes }}'</span>
            <span class="sum-sport-l">Minuti</span>
          </div>
          <div class="sum-sport-item">
            <span class="sum-sport-v">{{ sportKcal }}</span>
            <span class="sum-sport-l">kcal</span>
          </div>
        </div>
        <div class="sum-lbl" style="margin-top:8px">Sport di oggi</div>
      </div>

      <!-- Passi -->
      <div class="sum-box steps sum-wide" style="cursor:pointer" @click="openSteps">
        <div class="sum-ico">👟</div>
        <template v-if="stepsToday">
          <div style="display:flex; align-items:baseline; gap:8px; flex-wrap:wrap">
            <span class="sum-val" :style="{ color: stepsColor }">{{ stepsToday.toLocaleString('it') }}</span>
            <span class="sum-unit">passi</span>
            <span style="color:var(--txt2); font-size:1rem; font-weight:300">/</span>
            <span class="sum-val" :style="{ color: stepsColor }">{{ stepsKm }}</span>
            <span class="sum-unit">km</span>
          </div>
          <div class="sum-lbl">Passi oggi</div>
          <div class="sum-sub">{{ stepsGoalText }}</div>
        </template>
        <template v-else>
          <span class="sum-val" style="color:var(--txt2)">—</span>
          <div class="sum-lbl">Passi oggi</div>
          <div class="sum-sub" style="color:var(--b);font-size:.7rem">Tocca per inserire →</div>
        </template>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useAppStore } from '@/stores/app.js'
import { useEntriesStore, useConfigStore, useStepsStore } from '@/stores/index.js'
import { getDK } from '@/data/constants.js'

const app = useAppStore()
const entriesStore = useEntriesStore()
const cfgStore = useConfigStore()
const stepsStore = useStepsStore()

const entries = computed(() => entriesStore.forDay(getDK(app.dayOffset)))
const glicEntries = computed(() => entries.value.filter(e => e.glic > 0))

const glicVals = computed(() => glicEntries.value.map(e => e.glic).filter(Boolean))
const glicAvg  = computed(() => glicVals.value.length ? Math.round(glicVals.value.reduce((s,v)=>s+v,0)/glicVals.value.length) : null)
const glicMin  = computed(() => glicVals.value.length ? Math.min(...glicVals.value) : null)
const glicMax  = computed(() => glicVals.value.length ? Math.max(...glicVals.value) : null)
const glicColor = computed(() => {
  const v = glicAvg.value; if (!v) return 'var(--txt)'
  const cfg = cfgStore.cfg
  if (v < cfg.targetMin) return 'var(--r)'
  if (v > cfg.targetMax) return 'var(--o)'
  return 'var(--g)'
})

const weekAlc = computed(() => entriesStore.weekAlcUnits())
const alcColor = computed(() => weekAlc.value > cfgStore.cfg.alcMax ? 'var(--r)' : weekAlc.value > cfgStore.cfg.alcMax * 0.7 ? 'var(--o)' : 'var(--g)')

const sportEntries = computed(() => entries.value.filter(e => e.type === 'sport'))
const sportMinutes = computed(() => sportEntries.value.reduce((s,e) => s + (e.duration||0), 0))
const sportKcal    = computed(() => sportEntries.value.reduce((s,e) => s + (e.kcal||0), 0))

const stepsData   = computed(() => stepsStore.forDay(getDK(app.dayOffset)))
const stepsToday  = computed(() => stepsData.value?.steps || null)
const stepsKm     = computed(() => {
  const s = stepsData.value
  if (!s) return '0'
  return ((s.steps * (s.stride||75)) / 100000).toFixed(2)
})
const stepsColor  = computed(() => {
  const s = stepsToday.value
  if (!s) return 'var(--txt2)'
  if (s >= 10000) return 'var(--g)'
  if (s >= 6000) return 'var(--o)'
  return 'var(--txt)'
})

const stepsGoalText = computed(() => {
  const s = stepsToday.value
  if (!s) return ''
  if (s >= 10000) return '🎯 Obiettivo raggiunto!'
  const remaining = (10000 - s).toLocaleString('it')
  return `Mancano ${remaining} passi al goal`
})

function openSteps() { app.showStepsModal = true }
</script>
