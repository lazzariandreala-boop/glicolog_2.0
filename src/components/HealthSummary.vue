<template>
  <div class="hs-sum">

    <!-- Header -->
    <div class="hs-sum-hd">
      <span class="hs-sum-title">📱 Attività & Salute</span>
      <div style="display:flex;gap:6px;align-items:center">
        <button v-if="hsStore.hasPerms" class="hs-sum-btn" :disabled="hsStore.syncing" @click="doSync"
                :title="hsStore.syncing ? 'Sincronizzazione...' : 'Sincronizza Health Connect'">
          <svg :class="{ 'hs-spinning': hsStore.syncing }" xmlns="http://www.w3.org/2000/svg" width="25" height="25"
               viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8"/>
            <path d="M21 3v5h-5"/>
          </svg>
        </button>
        <button class="hs-sum-btn" @click="app.openPanelFor('healthsync')" title="Impostazioni" style="margin-top: -3px;">⚙️</button>
      </div>
    </div>

    <!-- CTA: solo su web -->
    <div v-if="!isCapacitor" class="hs-not-connected">
      <div class="hs-nc-ico">📱</div>
      <div class="hs-nc-title">Disponibile nell'app Android</div>
      <div class="hs-nc-sub">I dati vengono letti direttamente da Health Connect sul tuo Dispositivo.</div>
    </div>

    <!-- CTA: HC non disponibile -->
    <div v-else-if="!hsStore.available" class="hs-not-connected">
      <div class="hs-nc-ico">⚠️</div>
      <div class="hs-nc-title">Health Connect non supportato</div>
      <div class="hs-nc-sub">Il tuo dispositivo non supporta Health Connect (richiede Android 9+).</div>
    </div>

    <!-- CTA: permessi -->
    <div v-else-if="!hsStore.hasPerms" class="hs-not-connected">
      <div class="hs-nc-ico">🔒</div>
      <div class="hs-nc-title">Permessi non concessi</div>
      <div class="hs-nc-sub">Autorizza GlicoLog ad accedere ai dati di Health Connect.</div>
      <button class="bsave" style="background:var(--g);color:#000;margin-top:14px;width:100%"
              @click="app.openPanelFor('healthsync')">🔓 Richiedi permessi →</button>
    </div>

    <template v-else>
      <!-- Tabs -->
      <div class="hs-tabs">
        <button v-for="p in PERIODS" :key="p.v" class="hs-tab" :class="{ on: period === p.v }"
                @click="period = p.v">{{ p.l }}</button>
      </div>

      <div v-if="lastSyncLabel" class="hs-sync-lbl">🕐 {{ lastSyncLabel }}</div>

      <!-- Cards riepilogo -->
      <div class="hs-cards">
        <div class="hs-card">
          <span class="hs-card-val" :style="{ color: stepsColor }">
            {{ totalSteps > 0 ? totalSteps.toLocaleString('it') : '—' }}
          </span>
          <span class="hs-card-lbl">👟 Passi{{ period !== '1' ? ' tot.' : '' }}</span>
          <span class="hs-card-sub" v-if="period === '1' && totalSteps > 0">{{ stepsGoalLabel }}</span>
        </div>
        <div class="hs-card">
          <span class="hs-card-val" style="color:var(--o)">{{ totalKcal > 0 ? Math.round(totalKcal).toLocaleString('it') : '—' }}</span>
          <span class="hs-card-lbl">🔥 kcal attive</span>
        </div>
        <div class="hs-card">
          <span class="hs-card-val" style="color:var(--g)">{{ totalSessions }}</span>
          <span class="hs-card-lbl">🏃 Sessioni</span>
        </div>
        <div class="hs-card" v-if="avgHr">
          <span class="hs-card-val" style="color:var(--r)">{{ avgHr }}</span>
          <span class="hs-card-lbl">❤️ BPM</span>
        </div>
      </div>

      <!-- Grafici interattivi (multi-day) -->
      <template v-if="period !== '1' && periodData.length > 0">

        <div class="hs-chart-section">
          <div class="hs-chart-lbl">
            👟 Passi — obiettivo <strong>{{ stepsGoal.toLocaleString('it') }}/giorno</strong>
            <span class="hs-chart-legend">
              <span class="hs-leg-dot" style="background:#00e676"></span>≥goal
              <span class="hs-leg-dot" style="background:#ffab40"></span>≥60%
              <span class="hs-leg-dot" style="background:rgba(255,255,255,.18)"></span>&lt;60%
            </span>
          </div>
          <div class="hs-chart-wrap" ref="stepsWrap">
            <!-- Tooltip passi -->
            <div v-if="tooltip && tooltip.type === 'steps'" class="hs-tooltip"
                 :style="{ left: tooltip.x + 'px' }">
              <div class="hs-tooltip-date">{{ tooltip.date }}</div>
              <div class="hs-tooltip-val">{{ tooltip.val }}</div>
              <div v-if="tooltip.sub" class="hs-tooltip-sub">{{ tooltip.sub }}</div>
            </div>
            <canvas ref="stepsCanvas" class="hs-canvas"
                    @click="onChartClick($event, 'steps')"
                    @touchend.prevent="onChartTouch($event, 'steps')"></canvas>
          </div>
        </div>

        <div class="hs-chart-section">
          <div class="hs-chart-lbl">🔥 Calorie attive per giorno</div>
          <div class="hs-chart-wrap" ref="kcalWrap">
            <!-- Tooltip calorie -->
            <div v-if="tooltip && tooltip.type === 'kcal'" class="hs-tooltip"
                 :style="{ left: tooltip.x + 'px' }">
              <div class="hs-tooltip-date">{{ tooltip.date }}</div>
              <div class="hs-tooltip-val">{{ tooltip.val }}</div>
            </div>
            <canvas ref="kcalCanvas" class="hs-canvas"
                    @click="onChartClick($event, 'kcal')"
                    @touchend.prevent="onChartTouch($event, 'kcal')"></canvas>
          </div>
        </div>

        <!-- Medie -->
        <div v-if="totalSteps > 0" class="hs-avgs">
          <div class="hs-avg-item">
            <span class="hs-avg-val">{{ Math.round(totalSteps / periodData.length).toLocaleString('it') }}</span>
            <span class="hs-avg-lbl">passi/giorno</span>
          </div>
          <div class="hs-avg-item">
            <span class="hs-avg-val">{{ Math.round(totalKcal / periodData.length) }}</span>
            <span class="hs-avg-lbl">kcal/giorno</span>
          </div>
          <div class="hs-avg-item">
            <span class="hs-avg-val" :style="{ color: stepsColor }">
              {{ Math.round(periodData.filter(d => d.steps >= stepsGoal).length / periodData.length * 100) }}%
            </span>
            <span class="hs-avg-lbl">giorni ≥ goal</span>
          </div>
        </div>
      </template>

      <!-- Vista oggi -->
      <template v-else-if="period === '1'">
        <div class="hs-today-grid">
          <div class="hs-today-row" v-if="todayData.steps">
            <span class="hs-today-ico">👟</span>
            <div class="hs-today-body">
              <div class="hs-today-val" :style="{ color: stepsColor }">{{ todayData.steps.toLocaleString('it') }} passi</div>
              <div class="hs-today-bar-wrap">
                <div class="hs-today-bar" :style="{ width: Math.min(100, todayData.steps / stepsGoal * 100) + '%', background: stepsColor }"></div>
              </div>
              <div class="hs-today-sub">{{ stepsGoalLabel }} — obiettivo: {{ stepsGoal.toLocaleString('it') }}</div>
            </div>
          </div>
          <div class="hs-today-row" v-if="todayData.kcal">
            <span class="hs-today-ico">🔥</span>
            <div class="hs-today-body">
              <div class="hs-today-val" style="color:var(--o)">{{ todayData.kcal }} kcal attive</div>
              <div class="hs-today-bar-wrap">
                <div class="hs-today-bar" :style="{ width: Math.min(100, todayData.kcal / 4) + '%', background: 'var(--o)' }"></div>
              </div>
              <div class="hs-today-sub">Obiettivo: 400 kcal</div>
            </div>
          </div>
          <div class="hs-today-row" v-if="todayData.hr">
            <span class="hs-today-ico">❤️</span>
            <div class="hs-today-body">
              <div class="hs-today-val" style="color:var(--r)">{{ todayData.hr }} BPM (media)</div>
            </div>
          </div>
          <div v-if="!todayData.steps && !todayData.kcal" class="hs-empty">
            Nessun dato per oggi — sincronizza per aggiornare
          </div>
        </div>
      </template>

      <!-- Sessioni sport -->
      <div v-if="periodSessions.length" class="hs-sessions">
        <div class="hs-sessions-lbl">Sessioni sport {{ period === '1' ? 'di oggi' : 'nel periodo' }}</div>
        <div class="hs-session-row" v-for="s in periodSessions" :key="s.id">
          <span class="hs-session-ico">🏃</span>
          <div class="hs-session-body">
            <div class="hs-session-name">{{ s.sport }}</div>
            <div class="hs-session-meta">{{ formatTs(s.ts) }} · {{ s.duration }}' · ~{{ s.kcal }} kcal</div>
          </div>
          <span v-if="s.hcId" class="hs-session-badge">HC</span>
        </div>
      </div>

    </template>
  </div>
</template>

<script setup>
import { ref, computed, watch, nextTick, onMounted, onUnmounted } from 'vue'
import { useAppStore } from '@/stores/app.js'
import { useHealthSyncStore } from '@/stores/healthSync.js'
import { useEntriesStore, useConfigStore } from '@/stores/index.js'
import { DI, MI, p2, getDK } from '@/data/constants.js'

const app      = useAppStore()
const hsStore  = useHealthSyncStore()
const entries  = useEntriesStore()
const cfgStore = useConfigStore()

const isCapacitor = !!window.Capacitor
const period      = ref('7')

const stepsCanvas = ref(null)
const kcalCanvas  = ref(null)
const stepsWrap   = ref(null)
const kcalWrap    = ref(null)

const tooltip = ref(null)
let tooltipTimer = null

const PERIODS = [
  { v: '1',   l: 'Oggi' },
  { v: '7',   l: '7 giorni' },
  { v: '30',  l: '30 giorni' },
  { v: '365', l: 'Anno' },
]

const stepsGoal = computed(() => cfgStore.cfg.stepsGoal || 10000)

// ── Data — tutto centrato su app.dayOffset ─────────────────────────
// "Oggi" = giorno attualmente visualizzato (può essere ieri, l'altro ieri…)
const viewedDk = computed(() => getDK(app.dayOffset))

const periodData = computed(() => {
  const n    = parseInt(period.value)
  const base = app.dayOffset
  const days = []
  for (let i = n - 1; i >= 0; i--) {
    const dk = getDK(base - i)
    days.push({ dk, steps: hsStore.dailyData[dk]?.steps || 0, kcal: hsStore.dailyData[dk]?.kcal || 0, hr: hsStore.dailyData[dk]?.hr || null })
  }
  return days
})

// Dati del giorno visualizzato (usato per la tab "Oggi")
const todayData = computed(() => {
  return hsStore.dailyData[viewedDk.value] || { steps: 0, kcal: 0, hr: null }
})

const totalSteps = computed(() => periodData.value.reduce((s, d) => s + d.steps, 0))
const totalKcal  = computed(() => periodData.value.reduce((s, d) => s + d.kcal, 0))
const avgHr      = computed(() => {
  const days = periodData.value.filter(d => d.hr)
  return days.length ? Math.round(days.reduce((s, d) => s + d.hr, 0) / days.length) : null
})

const stepsColor = computed(() => {
  // In modalità "Oggi" usa i passi del giorno visualizzato, non la media del periodo
  const val = period.value === '1'
    ? todayData.value.steps
    : totalSteps.value / Math.max(1, parseInt(period.value))
  if (val >= stepsGoal.value)       return 'var(--g)'
  if (val >= stepsGoal.value * 0.6) return 'var(--o)'
  return 'var(--txt3)'
})

const stepsGoalLabel = computed(() => {
  const s = todayData.value.steps
  if (!s) return ''
  if (s >= stepsGoal.value) return '🎯 Obiettivo raggiunto!'
  return `Mancano ${(stepsGoal.value - s).toLocaleString('it')}`
})

const periodSessions = computed(() => {
  const base    = app.dayOffset
  const n       = parseInt(period.value)
  // Inizio del periodo: n giorni prima del giorno visualizzato, a mezzanotte
  const startDk = getDK(base - (n - 1))
  const startMs = new Date(startDk + 'T00:00:00').getTime()
  // Fine: fine del giorno visualizzato
  const endMs   = new Date(viewedDk.value + 'T23:59:59').getTime()
  return entries.entries
    .filter(e => e.type === 'sport' && e.ts >= startMs && e.ts <= endMs)
    .sort((a, b) => b.ts - a.ts)
    .slice(0, 50)
})
const totalSessions = computed(() => periodSessions.value.length)

const lastSyncLabel = computed(() => {
  if (!hsStore.lastSync) return ''
  const diff = Math.round((Date.now() - hsStore.lastSync) / 60000)
  if (diff < 1)    return 'Ultima sync: adesso'
  if (diff < 60)   return `Ultima sync: ${diff} min fa`
  if (diff < 1440) return `Ultima sync: ${Math.round(diff / 60)} ore fa`
  return `Ultima sync: ${Math.round(diff / 1440)} giorni fa`
})

function formatTs(ts) {
  const d = new Date(ts)
  return `${DI[d.getDay()]} ${p2(d.getDate())} ${MI[d.getMonth()]} ${p2(d.getHours())}:${p2(d.getMinutes())}`
}

// ── Sync ──────────────────────────────────────────────────────────
async function doSync() {
  try {
    const days = Math.max(30, parseInt(period.value))
    const res = await hsStore.sync(days)
    app.toast(`✅ ${res.syncedDays} giorni sincronizzati`)
  } catch (e) {
    app.toast('❌ ' + e.message)
  }
}

// ── Chart engine ──────────────────────────────────────────────────
const chartGeom = { steps: null, kcal: null }

function getBarColor(v, goal, type) {
  if (v <= 0) return 'rgba(255,255,255,0.06)'
  if (type === 'kcal') return '#ffab40'
  if (!goal) return 'rgba(255,255,255,0.22)'
  if (v >= goal)       return '#00e676'
  if (v >= goal * 0.6) return '#ffab40'
  return 'rgba(255,255,255,0.18)'
}

function drawBars(canvasEl, wrapEl, data, goalLine, type) {
  if (!canvasEl || !wrapEl || !data.length) return
  const DPR   = window.devicePixelRatio || 1
  const W     = wrapEl.clientWidth
  const H     = 120
  canvasEl.width        = W * DPR
  canvasEl.height       = H * DPR
  canvasEl.style.width  = W + 'px'
  canvasEl.style.height = H + 'px'

  const ctx = canvasEl.getContext('2d')
  ctx.scale(DPR, DPR)
  ctx.clearRect(0, 0, W, H)

  const maxVal = Math.max(...data.map(d => d.v), goalLine || 1, 1)
  const pad    = { t: 8, b: 22, l: 4, r: 4 }
  const chartW = W - pad.l - pad.r
  const chartH = H - pad.t - pad.b
  const slot   = chartW / data.length
  const barW   = Math.max(4, slot * 0.65)

  // Linea obiettivo
  if (goalLine && goalLine <= maxVal * 1.1) {
    const gy = pad.t + chartH - (goalLine / maxVal) * chartH
    ctx.save()
    ctx.strokeStyle = type === 'steps' ? 'rgba(0,230,118,0.4)' : 'rgba(255,171,64,0.4)'
    ctx.setLineDash([4, 5])
    ctx.lineWidth = 1.5
    ctx.beginPath(); ctx.moveTo(pad.l, gy); ctx.lineTo(W - pad.r, gy); ctx.stroke()
    ctx.restore()
  }

  const geom = []
  const selectedIdx = tooltip.value?.type === type ? tooltip.value?.idx : -1

  data.forEach((d, i) => {
    const x    = pad.l + slot * i + (slot - barW) / 2
    const barH = d.v > 0 ? Math.max(3, (d.v / maxVal) * chartH) : 0
    const y    = pad.t + chartH - barH
    const isSelected = i === selectedIdx

    let color = getBarColor(d.v, goalLine, type)
    if (isSelected) {
      // Barra selezionata: più luminosa
      ctx.fillStyle = color
      ctx.globalAlpha = 1
      ctx.shadowColor = color
      ctx.shadowBlur  = 8
    } else {
      ctx.globalAlpha = 0.85
      ctx.shadowBlur  = 0
    }
    ctx.fillStyle = color

    const r = Math.min(4, barW / 2)
    ctx.beginPath()
    if (barH > r) {
      ctx.moveTo(x + r, y); ctx.lineTo(x + barW - r, y)
      ctx.quadraticCurveTo(x + barW, y, x + barW, y + r)
      ctx.lineTo(x + barW, y + barH); ctx.lineTo(x, y + barH)
      ctx.lineTo(x, y + r); ctx.quadraticCurveTo(x, y, x + r, y)
    } else if (barH > 0) {
      ctx.rect(x, y, barW, barH)
    }
    ctx.closePath()
    ctx.fill()
    ctx.globalAlpha = 1
    ctx.shadowBlur  = 0

    // Label asse X
    const skip = Math.ceil(data.length / 28)
    if (i % skip === 0 || i === data.length - 1) {
      const dt  = new Date(d.dk + 'T00:00:00')
      const lbl = data.length <= 31 ? String(dt.getDate()) : MI[dt.getMonth()]
      ctx.fillStyle = isSelected ? 'rgba(255,255,255,0.7)' : 'rgba(255,255,255,0.28)'
      ctx.font      = `${isSelected ? 'bold ' : ''}${Math.max(8, 9 - Math.floor(data.length / 50))}px DM Mono, monospace`
      ctx.textAlign = 'center'
      ctx.fillText(lbl, x + barW / 2, H - 5)
    }

    geom.push({ x, y, w: barW, h: barH, data: d, idx: i })
  })

  chartGeom[type] = { geom, slot, pad, H }
}

function hitTest(event, type, isTouch) {
  const geomData = chartGeom[type]
  if (!geomData) return null
  const canvas  = type === 'steps' ? stepsCanvas.value : kcalCanvas.value
  if (!canvas) return null

  const rect    = canvas.getBoundingClientRect()
  const clientX = isTouch ? event.changedTouches[0].clientX : event.clientX
  const x       = clientX - rect.left

  let best = null, bestDist = Infinity
  for (const g of geomData.geom) {
    const dist = Math.abs(x - (g.x + g.w / 2))
    if (dist < bestDist && dist < geomData.slot) { bestDist = dist; best = g }
  }
  return best ? { item: best, clientX } : null
}

function showTooltip(hit, type) {
  if (!hit) return
  const { item, clientX } = hit
  const d  = item.data
  const dt = new Date(d.dk + 'T00:00:00')
  const dateStr = `${DI[dt.getDay()]} ${p2(dt.getDate())} ${MI[dt.getMonth()]}`

  let valStr, subStr
  if (type === 'steps') {
    valStr = d.v > 0 ? `${d.v.toLocaleString('it')} passi` : 'Nessun dato'
    if (d.v > 0) {
      const pct = Math.round(d.v / stepsGoal.value * 100)
      subStr = `${pct}% dell'obiettivo`
    }
  } else {
    valStr = d.v > 0 ? `${Math.round(d.v).toLocaleString('it')} kcal` : 'Nessun dato'
  }

  // Posizione relativa al wrap
  const wrapEl   = type === 'steps' ? stepsWrap.value : kcalWrap.value
  const wrapRect = wrapEl.getBoundingClientRect()
  let tx = clientX - wrapRect.left
  tx = Math.max(55, Math.min(wrapRect.width - 55, tx))

  tooltip.value = { type, idx: item.idx, date: dateStr, val: valStr, sub: subStr, x: tx }

  if (tooltipTimer) clearTimeout(tooltipTimer)
  tooltipTimer = setTimeout(() => { tooltip.value = null; redrawCharts() }, 2500)

  redrawCharts()
}

function onChartClick(e, type) {
  const hit = hitTest(e, type, false)
  if (hit) showTooltip(hit, type)
}
function onChartTouch(e, type) {
  const hit = hitTest(e, type, true)
  if (hit) showTooltip(hit, type)
}

function redrawCharts() {
  if (period.value === '1') return
  nextTick(() => {
    drawBars(stepsCanvas.value, stepsWrap.value, periodData.value.map(d => ({ dk: d.dk, v: d.steps })), stepsGoal.value, 'steps')
    drawBars(kcalCanvas.value,  kcalWrap.value,  periodData.value.map(d => ({ dk: d.dk, v: d.kcal  })), 400, 'kcal')
  })
}

watch([period, () => hsStore.lastSync, stepsGoal, () => app.dayOffset], redrawCharts)
watch(() => hsStore.dailyData, redrawCharts, { deep: true })
onMounted(redrawCharts)
onUnmounted(() => { if (tooltipTimer) clearTimeout(tooltipTimer) })
</script>
