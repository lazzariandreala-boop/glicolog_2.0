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
        <span v-if="dayStatus(day).avg != null" class="gcal-avg" :class="avgColorClass(day)">{{ dayStatus(day).avg }}</span>
        <div class="gcal-badges" v-if="dayStatus(day).lowCount || dayStatus(day).highCount">
          <span v-if="dayStatus(day).lowCount"  class="gcal-badge gcal-badge-r">↓{{ dayStatus(day).lowCount }}</span>
          <span v-if="dayStatus(day).highCount" class="gcal-badge gcal-badge-o">↑{{ dayStatus(day).highCount }}</span>
        </div>
      </div>
    </div>

    <!-- Statistiche mensili -->
    <div class="gcal-monthly-stats">
      <div class="gcal-mstat">
        <span class="gcal-mstat-v" :style="{ color: monthAvgColor }">{{ monthStats.avg ?? '—' }}<span v-if="monthStats.avg" style="font-size:.65rem;font-weight:400"> mg/dL</span></span>
        <span class="gcal-mstat-l">Media mese</span>
      </div>
      <div class="gcal-mstat">
        <span class="gcal-mstat-v" style="color:var(--b)">{{ monthStats.activeDays }}</span>
        <span class="gcal-mstat-l">Giorni attivi</span>
      </div>
      <div class="gcal-mstat">
        <span class="gcal-mstat-v" style="color:var(--r)">{{ monthStats.lowCount }}</span>
        <span class="gcal-mstat-l">Episodi bassi</span>
      </div>
      <div class="gcal-mstat">
        <span class="gcal-mstat-v" style="color:var(--o)">{{ monthStats.highCount }}</span>
        <span class="gcal-mstat-l">Episodi alti</span>
      </div>
    </div>

    <!-- Legenda -->
    <div class="gcal-leg">
      <span style="color:var(--r)">↓ bassa</span>
      <span style="color:var(--g)">◆ media</span>
      <span style="color:var(--o)">↑ alta</span>
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
    if (!cache[dk]) cache[dk] = { low: false, high: false, ok: false, lowCount: 0, highCount: 0, _sum: 0, _n: 0, avg: null }
    cache[dk]._sum += e.glic
    cache[dk]._n++
    if (e.glic < tMin)      { cache[dk].low = true;  cache[dk].lowCount++ }
    else if (e.glic > tMax) { cache[dk].high = true; cache[dk].highCount++ }
    else                      cache[dk].ok = true
  })
  Object.values(cache).forEach(v => { v.avg = v._n ? Math.round(v._sum / v._n) : null })
  return cache
})

const monthStats = computed(() => {
  const cache = statusCache.value
  let sum = 0, n = 0, lowCount = 0, highCount = 0, activeDays = 0
  Object.values(cache).forEach(v => {
    if (v._n > 0) {
      activeDays++
      sum += v._sum
      n += v._n
      lowCount  += v.lowCount
      highCount += v.highCount
    }
  })
  return { avg: n ? Math.round(sum / n) : null, activeDays, lowCount, highCount }
})

const monthAvgColor = computed(() => {
  const v = monthStats.value.avg
  if (!v) return 'var(--txt2)'
  const tMin = configStore.cfg.targetMin || 100
  const tMax = configStore.cfg.targetMax || 160
  if (v < tMin) return 'var(--r)'
  if (v > tMax) return 'var(--o)'
  return 'var(--g)'
})

function dayStatus(day) {
  const dk = `${viewYear.value}-${p2(viewMonth.value + 1)}-${p2(day)}`
  return statusCache.value[dk] || { low: false, high: false, ok: false, lowCount: 0, highCount: 0, avg: null }
}

function avgColorClass(day) {
  const s = dayStatus(day)
  const cfg = configStore.cfg
  const tMin = cfg.targetMin || 100
  const tMax = cfg.targetMax || 160
  if (s.avg == null) return ''
  if (s.avg < tMin) return 'gcal-avg-r'
  if (s.avg > tMax) return 'gcal-avg-o'
  return 'gcal-avg-g'
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
  min-height: 58px;
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  gap: 1px;
  cursor: pointer;
  border: 1px solid transparent;
  transition: background .12s;
  padding: 4px 1px 3px;
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

/* Media glicemica */
.gcal-avg {
  font-size: .68rem;
  font-family: var(--mono);
  font-weight: 700;
  line-height: 1;
  color: var(--txt2);
}
.gcal-avg-r { color: var(--r); }
.gcal-avg-o { color: var(--o); }
.gcal-avg-g { color: var(--g); }

/* Badge episodi bassi/alti */
.gcal-badges {
  display: flex;
  gap: 1px;
  margin-top: 2px;
  flex-wrap: wrap;
  justify-content: center;
}
.gcal-badge {
  font-size: .55rem;
  font-family: var(--mono);
  font-weight: 700;
  line-height: 1;
  padding: 1px 2px;
  border-radius: 3px;
}
.gcal-badge-r { color: var(--r); background: rgba(255,82,82,.1); }
.gcal-badge-o { color: var(--o); background: rgba(255,171,64,.1); }

/* Statistiche mensili */
.gcal-monthly-stats {
  display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px;
  margin-top: 10px; margin-bottom: 6px;
}
.gcal-mstat {
  background: var(--card2); border: 1px solid var(--bdr); border-radius: 9px;
  padding: 8px 4px; text-align: center;
}
.gcal-mstat-v { display: block; font-size: 1.15rem; font-weight: 800; font-family: var(--mono); line-height: 1.1; color: var(--txt); }
.gcal-mstat-l { display: block; font-size: .56rem; font-weight: 600; color: var(--txt2); text-transform: uppercase; letter-spacing: .3px; margin-top: 3px; }

/* Legenda */
.gcal-leg {
  display: flex;
  gap: 14px;
  justify-content: center;
  margin-top: 10px;
  font-size: .68rem;
  font-weight: 600;
  color: var(--txt2);
}
.gcal-leg span { display: flex; align-items: center; gap: 3px; }
</style>
