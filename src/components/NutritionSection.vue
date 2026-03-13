<template>
  <div class="nut-sec">
    <button class="nut-tog" :class="{ open: open }" @click="open = !open">
      <span>🥗 Nutrizione di {{ app.dayOffset === 0 ? 'oggi' : 'questo giorno' }}</span>
      <span class="arr">▼</span>
    </button>
    <div class="nut-body" :class="{ show: open }">
      <!-- Barre macro -->
      <div v-for="macro in macros" :key="macro.key" class="nut-bar-wrap">
        <div class="nut-bar-hd">
          <span class="nut-bar-lbl">{{ macro.label }}</span>
          <span class="nut-bar-val" :style="{ color: macro.color }">
            {{ macro.val }}{{ macro.unit }}
            <span style="color:var(--txt2);font-size:.75rem"> / {{ macro.target }}{{ macro.unit }}</span>
          </span>
        </div>
        <div class="nut-bar-bg">
          <div class="nut-bar-fg" :style="{ width: macro.pct + '%', background: macro.color }"></div>
        </div>
        <div class="nut-bar-sub">{{ macro.sub }}</div>
      </div>

      <!-- Acqua -->
      <div class="nut-bar-wrap">
        <div class="nut-bar-hd">
          <span class="nut-bar-lbl">💧 Acqua</span>
          <span class="nut-bar-val" style="color:#29b6f6">{{ waterTotal }}ml <span style="color:var(--txt2);font-size:.75rem">/ 2000ml</span></span>
        </div>
        <div class="nut-bar-bg">
          <div class="nut-bar-fg" :style="{ width: Math.min(waterTotal/20, 100)+'%', background:'#29b6f6' }"></div>
        </div>
        <div class="nut-bar-sub">{{ waterTotal >= 2000 ? '✅ Idratazione raggiunta' : Math.max(0, 2000 - waterTotal) + 'ml ancora' }}</div>
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

function sumNut(key) {
  return entries.value.reduce((s, e) => s + (e[key] || 0), 0)
}

const totCarbs   = computed(() => Math.round(sumNut('carbs')))
const totProtein = computed(() => Math.round(sumNut('protein')))
const totFat     = computed(() => Math.round(sumNut('fat')))
const totKcal    = computed(() => Math.round(sumNut('kcal')))
const waterTotal = computed(() => Math.round(entries.value.filter(e=>e.type==='acqua').reduce((s,e)=>s+(e.ml||0),0)))

const macros = computed(() => {
  const cfg = cfgStore.cfg
  const mk = v => Math.min(Math.round(v), 100)
  return [
    { key:'carbs',   label:'🌾 Carboidrati', val: totCarbs.value,   unit:'g', target: cfg.carbs||130,   color:'var(--o)',  pct: mk(totCarbs.value   / (cfg.carbs||130)   * 100), sub: `${Math.max(0, (cfg.carbs||130) - totCarbs.value)}g rimasti` },
    { key:'protein', label:'🥩 Proteine',    val: totProtein.value, unit:'g', target: cfg.protein||180, color:'var(--r)',  pct: mk(totProtein.value / (cfg.protein||180) * 100), sub: `Target: ${cfg.protein||180}g` },
    { key:'fat',     label:'🫙 Grassi',      val: totFat.value,     unit:'g', target: cfg.fat||96,      color:'var(--p)',  pct: mk(totFat.value     / (cfg.fat||96)      * 100), sub: `Target: ${cfg.fat||96}g` },
    { key:'kcal',    label:'🔥 Calorie',     val: totKcal.value,    unit:'kcal', target: cfg.kcal||2000, color:'var(--g)', pct: mk(totKcal.value    / (cfg.kcal||2000)   * 100), sub: `${Math.max(0, (cfg.kcal||2000) - totKcal.value)} kcal rimanenti` },
  ]
})
</script>
