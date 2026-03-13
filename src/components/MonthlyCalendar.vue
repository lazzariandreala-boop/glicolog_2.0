<template>
  <div class="gcal">
    <!-- Navigazione mese -->
    <div class="gcal-nav">
      <button class="gcal-nbtn" @click="prevMonth">‹</button>
      <span class="gcal-month">{{ monthLabel }}</span>
      <button class="gcal-nbtn" @click="nextMonth" :disabled="isCurrentMonth">›</button>
    </div>

    <!-- Griglia -->
    <div class="gcal-grid">
      <div class="gcal-dow" v-for="d in DOWS" :key="d">{{ d }}</div>
      <div v-for="n in firstDayPad" :key="'e' + n" class="gcal-day gcal-empty"></div>
      <div
        v-for="day in daysInMonth" :key="day"
        class="gcal-day"
        :class="dayClass(day)"
        @click="goToDay(day)"
      >
        <span class="gcal-num">{{ day }}</span>
        <div class="gcal-dots">
          <span v-if="dayStatus(day).low"  class="gcal-dot gcal-dot-r"></span>
          <span v-if="dayStatus(day).high" class="gcal-dot gcal-dot-o"></span>
          <span v-if="dayStatus(day).ok"   class="gcal-dot gcal-dot-g"></span>
        </div>
      </div>
    </div>

    <!-- Legenda -->
    <div class="gcal-leg">
      <span><span class="gcal-dot gcal-dot-r"></span> Ipoglicemia</span>
      <span><span class="gcal-dot gcal-dot-o"></span> Iperglicemia</span>
      <span><span class="gcal-dot gcal-dot-g"></span> In range</span>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useEntriesStore, useConfigStore } from '@/stores/index.js'
import { useAppStore } from '@/stores/app.js'
import { p2, MI } from '@/data/constants.js'

const entriesStore = useEntriesStore()
const configStore  = useConfigStore()
const appStore     = useAppStore()

const DOWS = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom']

// Mese visualizzato (0-based month)
const today = new Date()
const viewYear  = ref(today.getFullYear())
const viewMonth = ref(today.getMonth())  // 0-based

const isCurrentMonth = computed(() =>
  viewYear.value === today.getFullYear() && viewMonth.value === today.getMonth()
)

const monthLabel = computed(() => `${MI[viewMonth.value]} ${viewYear.value}`)

const daysInMonth = computed(() => new Date(viewYear.value, viewMonth.value + 1, 0).getDate())

// Celle vuote prima del primo giorno (settimana inizia da Lunedì)
const firstDayPad = computed(() => {
  const dow = new Date(viewYear.value, viewMonth.value, 1).getDay() // 0=Dom
  return (dow + 6) % 7  // Lun=0, Mar=1, ..., Dom=6
})

function prevMonth() {
  if (viewMonth.value === 0) { viewMonth.value = 11; viewYear.value-- }
  else viewMonth.value--
}
function nextMonth() {
  if (isCurrentMonth.value) return
  if (viewMonth.value === 11) { viewMonth.value = 0; viewYear.value++ }
  else viewMonth.value++
}

// Cache degli stati glicemici per giorno del mese visualizzato
const statusCache = computed(() => {
  const cfg  = configStore.cfg
  const tMin = cfg.targetMin || 100
  const tMax = cfg.targetMax || 160
  const cache = {}
  const yStr = String(viewYear.value)
  const mStr = p2(viewMonth.value + 1)
  entriesStore.entries.forEach(e => {
    if (e.type !== 'glicemia' || !e.glic) return
    const d = new Date(e.ts)
    if (d.getFullYear() !== viewYear.value || d.getMonth() !== viewMonth.value) return
    const dk = `${yStr}-${mStr}-${p2(d.getDate())}`
    if (!cache[dk]) cache[dk] = { low: false, high: false, ok: false }
    if (e.glic < tMin)      cache[dk].low  = true
    else if (e.glic > tMax) cache[dk].high = true
    else                    cache[dk].ok   = true
  })
  return cache
})

function dayStatus(day) {
  const dk = `${viewYear.value}-${p2(viewMonth.value + 1)}-${p2(day)}`
  return statusCache.value[dk] || { low: false, high: false, ok: false }
}

function dayClass(day) {
  const d = new Date(viewYear.value, viewMonth.value, day)
  d.setHours(0, 0, 0, 0)
  const todayMidnight = new Date(); todayMidnight.setHours(0, 0, 0, 0)
  const isFuture = d > todayMidnight

  // Giorno correntemente selezionato nel DayNavigation
  const selMidnight = new Date(); selMidnight.setDate(selMidnight.getDate() + appStore.dayOffset); selMidnight.setHours(0, 0, 0, 0)
  const isSelected = d.getTime() === selMidnight.getTime()

  const s = dayStatus(day)
  return {
    'gcal-today':    d.getTime() === todayMidnight.getTime(),
    'gcal-selected': isSelected,
    'gcal-future':   isFuture,
    'gcal-has-low':  s.low,
    'gcal-has-high': s.high,
    'gcal-has-ok':   s.ok && !s.low && !s.high,
  }
}

function goToDay(day) {
  const clicked = new Date(viewYear.value, viewMonth.value, day)
  clicked.setHours(0, 0, 0, 0)
  const todayMidnight = new Date(); todayMidnight.setHours(0, 0, 0, 0)
  const diff = Math.round((clicked - todayMidnight) / 86400000)
  if (diff > 0) return  // non navigare nel futuro
  appStore.dayOffset = diff
}
</script>

<style scoped>
.gcal {
  background: var(--card);
  border-radius: 14px;
  padding: 14px 12px 12px;
  border: 1px solid var(--bdr);
}

/* Navigazione mese */
.gcal-nav {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}
.gcal-month {
  font-size: .88rem;
  font-weight: 700;
  color: var(--txt);
  letter-spacing: .3px;
}
.gcal-nbtn {
  background: var(--card2);
  border: 1px solid var(--bdr);
  border-radius: 8px;
  color: var(--txt2);
  font-size: 1.1rem;
  width: 32px; height: 32px;
  cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  transition: background .15s;
  font-family: var(--sans);
}
.gcal-nbtn:active { background: var(--bdr2) }
.gcal-nbtn:disabled { opacity: .3; cursor: default }

/* Griglia giorni */
.gcal-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 3px;
}
.gcal-dow {
  text-align: center;
  font-size: .65rem;
  font-weight: 600;
  color: var(--txt2);
  padding: 3px 0 6px;
  letter-spacing: .3px;
  text-transform: uppercase;
}
.gcal-empty { min-height: 36px; }

.gcal-day {
  min-height: 36px;
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  cursor: pointer;
  border: 1px solid transparent;
  transition: background .12s;
  padding: 2px 0;
}
.gcal-day:active { background: var(--bdr) }
.gcal-future { opacity: .3; cursor: default; pointer-events: none; }

.gcal-num {
  font-size: .78rem;
  font-family: var(--mono);
  color: var(--txt2);
  line-height: 1;
}

/* Giorno con misurazioni */
.gcal-has-low   .gcal-num { color: var(--r); }
.gcal-has-high  .gcal-num { color: var(--o); }
.gcal-has-ok    .gcal-num { color: var(--g); }

/* Oggi */
.gcal-today {
  background: rgba(255,255,255,0.04);
  border-color: var(--bdr2);
}
.gcal-today .gcal-num { font-weight: 700; color: var(--txt); }

/* Giorno selezionato (DayNavigation) */
.gcal-selected {
  background: rgba(0,230,118,0.1);
  border-color: rgba(0,230,118,0.35);
}
.gcal-selected .gcal-num { color: var(--g); font-weight: 700; }

/* Pallini indicatori */
.gcal-dots {
  display: flex;
  gap: 2px;
  min-height: 5px;
}
.gcal-dot {
  display: block;
  width: 5px; height: 5px;
  border-radius: 50%;
  flex-shrink: 0;
}
.gcal-dot-r { background: var(--r); }
.gcal-dot-o { background: var(--o); }
.gcal-dot-g { background: var(--g); }

/* Legenda */
.gcal-leg {
  display: flex;
  gap: 12px;
  justify-content: center;
  margin-top: 10px;
  font-size: .7rem;
  color: var(--txt2);
}
.gcal-leg span {
  display: flex;
  align-items: center;
  gap: 4px;
}
</style>
