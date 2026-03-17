<template>
  <div class="tl">
    <div v-if="groups.length === 0" class="tl-empty">
      <div style="font-size:2rem;margin-bottom:8px">📋</div>
      Nessuna voce registrata per questo giorno.<br>
      <!-- <span style="color:var(--g)">Usa i pulsanti sopra</span> per aggiungere qualcosa. -->
    </div>

    <template v-for="(group, gi) in groups" :key="gi">
      <div class="tl-dg">{{ group.label }}</div>
      <div
        v-for="entry in group.items"
        :key="entry.id"
        class="tlc-wrap"
        @touchstart.passive="onTouchStart($event, entry.id)"
        @touchmove.passive="onTouchMove($event, entry.id)"
        @touchend.passive="onTouchEnd(entry.id)"
        :class="{ swiped: swiped === entry.id }"
      >
        <div class="tlc" :class="'tlc-' + entry.type">
          <div class="tli">{{ entryIcon(entry) }}</div>
          <div class="tlb">
            <div class="tlt">{{ entryTitle(entry) }}</div>
            <div class="tls">{{ entrySubtitle(entry) }}</div>
            <div class="tla">
              <span>{{ entryTime(entry) }}</span>
              <button class="teb" @click="edit(entry)">✏️ Modifica</button>
              <button class="teb-del" @click="del(entry)">🗑️</button>
            </div>
          </div>
          <div class="tlv">
            <template v-if="(entry.type === 'pasto' || entry.type === 'spuntino') && (entry.glic > 0 || entry.bolo > 0)">
              <div v-if="entry.glic > 0" class="tlv-line" :style="{ color: glicColor(entry.glic) }">{{ entry.glic }}<span class="tlv-unit"> mg/dL</span><span v-if="entry.trend"> {{ entry.trend }}</span></div>
              <div v-if="entry.bolo > 0" class="tlv-line tlv-bolo">{{ entry.bolo }}U 💉</div>
            </template>
            <template v-else-if="entry.type === 'glicemia' && (entry.glic || entry.value)">
              <div class="tlv-line" :style="{ color: glicColor(entry.glic || entry.value) }">{{ entry.glic || entry.value }}<span class="tlv-unit"> mg/dL</span><span v-if="entry.trend"> {{ entry.trend }}</span></div>
            </template>
            <template v-else>
              <span :style="{ color: entryColor(entry) }">{{ entryValue(entry) }}</span>
            </template>
          </div>
        </div>
        <div class="tlc-del-bg" @click="del(entry)">🗑️</div>
      </div>
    </template>

    <!-- Padding bottom per la bottom nav -->
    <div style="height:20px"></div>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import { useAppStore } from '@/stores/app.js'
import { useEntriesStore, useConfigStore } from '@/stores/index.js'
import { getDK, p2 } from '@/data/constants.js'

const app = useAppStore()
const entriesStore = useEntriesStore()
const cfgStore = useConfigStore()

const entries = computed(() => entriesStore.forDay(getDK(app.dayOffset)))

// Raggruppamento per ora del giorno
// notte_alba = 00:00–06:59 → sopra Mattina
// notte_sera = 22:00–23:59 → sotto Sera
const SLOT_LABELS = { notte_alba: 'Notte 🌙', Mattina: 'Mattina', Pranzo: 'Pranzo', Pomeriggio: 'Pomeriggio', Sera: 'Sera', notte_sera: 'Notte 🌙' }
const SLOT_ORDER  = ['notte_alba', 'Mattina', 'Pranzo', 'Pomeriggio', 'Sera', 'notte_sera']

const groups = computed(() => {
  const sorted = [...entries.value].sort((a, b) => a.ts - b.ts)
  const map = {}
  sorted.forEach(e => {
    const h = new Date(e.ts).getHours()
    const key = h < 7 ? 'notte_alba' : h < 12 ? 'Mattina' : h < 14 ? 'Pranzo' : h < 18 ? 'Pomeriggio' : h < 22 ? 'Sera' : 'notte_sera'
    if (!map[key]) map[key] = []
    map[key].push(e)
  })
  return SLOT_ORDER.filter(k => map[k]).map(k => ({ label: SLOT_LABELS[k], items: map[k] }))
})

function entryIcon(e) {
  const icons = { pasto:'🍽️', spuntino:'🍎', glicemia:'🩸', insulina:'💉', alcool:'🍷', sport:'🏃', aperitivi:'🥂', acqua:'💧', correzione: '🍬' }
  return icons[e.type] || '📋'
}

function entryTitle(e) {
  if (e.type === 'pasto') return e.mealType || 'Pasto'
  if (e.type === 'spuntino') return 'Spuntino'
  if (e.type === 'glicemia') return 'Glicemia'
  if (e.type === 'insulina') return e.insulinType || 'Insulina'
  if (e.type === 'alcool') return e.label || 'Alcool'
  if (e.type === 'sport') return e.sport || 'Sport'
  if (e.type === 'aperitivi') return 'Aperitivo'
  if (e.type === 'correzione') return 'Correzione'
  if (e.type === 'acqua') return 'Acqua'
  return e.type
}

function glicColor(val) {
  if (!val) return 'var(--txt2)'
  const cfg = cfgStore.cfg
  if (val < (cfg.targetMin || 70)) return 'var(--r)'
  if (val > (cfg.targetMax || 180)) return 'var(--o)'
  return 'var(--g)'
}

function entrySubtitle(e) {
  const parts = []
  if (e.type === 'pasto' || e.type === 'spuntino' || e.type === 'correzione') {
    // Mostra cibi
    if (e.foodRows?.length) {
      parts.push(e.foodRows.map(r => r.name).filter(Boolean).join(', '))
    } else if (e.food) {
      parts.push(e.food)
    }
    if (e.carbs > 0) parts.push(`${Math.round(e.carbs)}g C`)
    if (e.kcal > 0) parts.push(`${Math.round(e.kcal)} kcal`)
  }
  if (e.type === 'glicemia') {
    if (e.note) parts.push(e.note)
  }
  if (e.type === 'insulina') {
    parts.push(e.insulinSubtype || '')
    if (e.note) parts.push(e.note)
  }
  if (e.type === 'sport') {
    if (e.duration) parts.push(`${e.duration} min`)
    if (e.kcal) parts.push(`~${e.kcal} kcal`)
    if (e.note) parts.push(e.note)
  }
  if (e.type === 'acqua') {
    parts.push(`${e.ml} ml`)
  }
  return parts.filter(Boolean).join(' · ')
}

function entryValue(e) {
  if (e.type === 'glicemia') return `${e.glic || e.value} mg/dL`
  if (e.type === 'insulina') return `${e.units}U`
  if (e.type === 'alcool') return `${e.units?.toFixed(1)}U`
  if (e.type === 'sport') return `${e.duration}'`
  if (e.type === 'correzione') return `${Math.round(e.carbs)}g C`
  if (e.type === 'acqua') return `${e.ml}ml`
  if (e.type === 'pasto' || e.type === 'spuntino') return ''
  return ''
}

function entryColor(e) {
  if (e.type === 'glicemia') return glicColor(e.glic || e.value)
  if ((e.type === 'pasto' || e.type === 'spuntino') && e.glic > 0) return glicColor(e.glic)
  if (e.type === 'insulina') return 'var(--p)'
  if (e.type === 'alcool') return 'var(--alc)'
  if (e.type === 'sport') return '#29b6f6'
  if (e.type === 'correzione') return 'var(--o)'
  if (e.type === 'pasto') return 'var(--g)'
  return 'var(--txt2)'
}

function entryTime(e) {
  const d = new Date(e.ts)
  return `${p2(d.getHours())}:${p2(d.getMinutes())}`
}

function edit(entry) {
  app.openPanelFor(entry.type, entry)
}

function del(entry) {
  swiped.value = null
  app.confirmDelete(entry.id, `Eliminare "${entryTitle(entry)}" delle ${entryTime(entry)}?`)
}

// Swipe to delete
const swiped = ref(null)
const touchStartX = ref(0)

function onTouchStart(e, id) {
  touchStartX.value = e.touches[0].clientX
}
function onTouchMove(e, id) {
  const dx = touchStartX.value - e.touches[0].clientX
  if (dx > 50) swiped.value = id
  else if (dx < -10) swiped.value = null
}
function onTouchEnd(id) {
  if (swiped.value !== id) return
  setTimeout(() => { if (swiped.value === id) swiped.value = null }, 3000)
}
</script>
