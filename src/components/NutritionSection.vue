<template>
  <div class="nut-sec">
    <button class="nut-tog" :class="{ open: open }" @click="open = !open">
      <span>🥗 Nutrizione di {{ app.dayOffset === 0 ? 'oggi' : 'questo giorno' }}</span>
      <span class="arr">▼</span>
    </button>
    <div class="nut-body" :class="{ show: open }">
      <!-- Calorie full-width -->
      <div class="nut-box nut-box-wide">
        <div class="nut-box-top">
          <span class="nut-box-lbl">🔥 Calorie</span>
          <span class="nut-box-val" :style="{ color: kcalColor }">{{ totKcal }} <span class="nut-box-unit">/ {{ cfg.kcal || 2000 }} kcal</span></span>
        </div>
        <div class="nut-bar-bg"><div class="nut-bar-fg" :style="{ width: pct(totKcal, cfg.kcal || 2000) + '%', background: kcalColor }"></div></div>
        <div class="nut-box-sub">{{ Math.max(0, (cfg.kcal || 2000) - totKcal) }} kcal rimanenti</div>
      </div>

      <!-- 2x2 grid -->
      <div class="nut-grid2">
        <div class="nut-box">
          <div class="nut-box-top">
            <span class="nut-box-lbl">🌾 Carbo</span>
            <span class="nut-box-val" style="color:var(--o)">{{ totCarbs }}<span class="nut-box-unit">g</span></span>
          </div>
          <div class="nut-bar-bg"><div class="nut-bar-fg" :style="{ width: pct(totCarbs, cfg.carbs || 130) + '%', background: 'var(--o)' }"></div></div>
          <div class="nut-box-sub">/ {{ cfg.carbs || 130 }}g</div>
        </div>
        <div class="nut-box">
          <div class="nut-box-top">
            <span class="nut-box-lbl">🥩 Proteine</span>
            <span class="nut-box-val" style="color:var(--r)">{{ totProtein }}<span class="nut-box-unit">g</span></span>
          </div>
          <div class="nut-bar-bg"><div class="nut-bar-fg" :style="{ width: pct(totProtein, cfg.protein || 180) + '%', background: 'var(--r)' }"></div></div>
          <div class="nut-box-sub">/ {{ cfg.protein || 180 }}g</div>
        </div>
        <div class="nut-box">
          <div class="nut-box-top">
            <span class="nut-box-lbl">🫙 Grassi</span>
            <span class="nut-box-val" style="color:var(--p)">{{ totFat }}<span class="nut-box-unit">g</span></span>
          </div>
          <div class="nut-bar-bg"><div class="nut-bar-fg" :style="{ width: pct(totFat, cfg.fat || 96) + '%', background: 'var(--p)' }"></div></div>
          <div class="nut-box-sub">/ {{ cfg.fat || 96 }}g</div>
        </div>
        <div class="nut-box">
          <div class="nut-box-top">
            <span class="nut-box-lbl">💧 Acqua</span>
            <span class="nut-box-val" style="color:#29b6f6">{{ waterTotal }}<span class="nut-box-unit">ml</span></span>
          </div>
          <div class="nut-bar-bg"><div class="nut-bar-fg" :style="{ width: pct(waterTotal, 2000) + '%', background: '#29b6f6' }"></div></div>
          <div class="nut-box-sub">/ 2000ml</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useAppStore } from '@/stores/app.js'
import { useEntriesStore, useConfigStore } from '@/stores/index.js'
import { getDK } from '@/data/constants.js'

const app = useAppStore()
const entriesStore = useEntriesStore()
const cfgStore = useConfigStore()
const open = ref(false)

const entries = computed(() => entriesStore.forDay(getDK(app.dayOffset)))
const cfg = computed(() => cfgStore.cfg)

function sumNut(key) {
  return entries.value.reduce((s, e) => s + (e[key] || 0), 0)
}

const totCarbs   = computed(() => Math.round(sumNut('carbs')))
const totProtein = computed(() => Math.round(sumNut('protein')))
const totFat     = computed(() => Math.round(sumNut('fat')))
const totKcal    = computed(() => Math.round(sumNut('kcal')))
const waterTotal = computed(() => Math.round(entries.value.filter(e=>e.type==='acqua').reduce((s,e)=>s+(e.ml||0),0)))

function pct(val, target) { return Math.min(Math.round(val / target * 100), 100) }

const kcalColor = computed(() => {
  const p = pct(totKcal.value, cfg.value.kcal || 2000)
  return p >= 100 ? 'var(--r)' : p >= 80 ? 'var(--o)' : 'var(--g)'
})
</script>
