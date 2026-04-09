<template>
  <div class="hs-sum">

    <!-- Header -->
    <div class="hs-sum-hd">
      <span class="hs-sum-title">📱 Attività & Salute</span>
      <div style="display:flex;gap:6px;align-items:center">
        <button v-if="hsStore.isConnected" class="hs-sum-btn" :disabled="syncing" @click="doSync"
                :title="syncing ? 'Sincronizzazione...' : 'Sincronizza Google Fit'">
          <span :class="{ 'hs-spinning': syncing }">🔄</span>
        </button>
        <button class="hs-sum-btn" @click="app.openPanelFor('healthsync')" title="Impostazioni">⚙️</button>
      </div>
    </div>

    <!-- CTA non connesso -->
    <div v-if="!hsStore.isConnected" class="hs-not-connected">
      <div class="hs-nc-ico">📱</div>
      <div class="hs-nc-title">Google Fit non connesso</div>
      <div class="hs-nc-sub">
        Connetti il tuo account per importare automaticamente passi, calorie bruciate e sessioni sport dal tuo Google Pixel.
      </div>
      <button class="bsave" style="background:#4285f4;color:#fff;margin-top:14px;width:100%"
              @click="app.openPanelFor('healthsync')">
        🔗 Configura Google Fit →
      </button>
    </div>

    <template v-else>
      <!-- Tabs periodo -->
      <div class="hs-tabs">
        <button v-for="p in PERIODS" :key="p.v"
                class="hs-tab" :class="{ on: period === p.v }"
                @click="period = p.v">{{ p.l }}</button>
      </div>

      <!-- Ultima sync -->
      <div v-if="lastSyncLabel" class="hs-sync-lbl">🕐 Ultima sync: {{ lastSyncLabel }}</div>

      <!-- Cards riepilogative -->
      <div class="hs-cards">
        <div class="hs-card">
          <span class="hs-card-val" :style="{ color: stepsColor }">
            {{ totalSteps > 0 ? totalSteps.toLocaleString('it') : '—' }}
          </span>
          <span class="hs-card-lbl">👟 Passi</span>
          <span class="hs-card-sub" v-if="period === '1' && totalSteps > 0">
            {{ stepsGoal }}
          </span>
        </div>
        <div class="hs-card">
          <span class="hs-card-val" style="color:var(--o)">
            {{ totalKcal > 0 ? totalKcal.toLocaleString('it') : '—' }}
          </span>
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

      <!-- Bar charts (multi-day) -->
      <template v-if="period !== '1' && periodData.length > 0">
        <div class="hs-chart-section">
          <div class="hs-chart-lbl">👟 Passi per giorno</div>
          <div class="hs-chart-wrap" ref="stepsWrap">
            <canvas ref="stepsCanvas" class="hs-canvas"></canvas>
          </div>
        </div>
        <div class="hs-chart-section">
          <div class="hs-chart-lbl">🔥 Calorie attive per giorno</div>
          <div class="hs-chart-wrap" ref="kcalWrap">
            <canvas ref="kcalCanvas" class="hs-canvas"></canvas>
          </div>
        </div>
      </template>

      <!-- Vista "Oggi" dettaglio -->
      <template v-else-if="period === '1'">
        <div class="hs-today-grid">
          <div class="hs-today-row" v-if="todayData.steps">
            <span class="hs-today-ico">👟</span>
            <div class="hs-today-body">
              <div class="hs-today-val" :style="{ color: stepsColor }">{{ todayData.steps.toLocaleString('it') }} passi</div>
              <div class="hs-today-bar-wrap">
                <div class="hs-today-bar" :style="{ width: Math.min(100, todayData.steps / 100) + '%', background: stepsColor }"></div>
              </div>
              <div class="hs-today-sub">Obiettivo: 10.000 passi</div>
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

      <!-- Lista sessioni sport -->
      <div v-if="periodSessions.length" class="hs-sessions">
        <div class="hs-sessions-lbl">Sessioni sport {{ period === '1' ? 'di oggi' : 'nel periodo' }}</div>
        <div class="hs-session-row" v-for="s in periodSessions" :key="s.id">
          <span class="hs-session-ico">🏃</span>
          <div class="hs-session-body">
            <div class="hs-session-name">{{ s.sport }}</div>
            <div class="hs-session-meta">{{ formatTs(s.ts) }} · {{ s.duration }}' · ~{{ s.kcal }} kcal</div>
          </div>
          <span v-if="s.gfitId" class="hs-session-badge">Fit</span>
        </div>
      </div>
      <div v-else-if="period !== '1' || (period === '1' && !todayData.steps)" class="hs-empty">
        Nessuna sessione nel periodo
      </div>

      <!-- Medie periodo (multi-day) -->
      <div v-if="period !== '1' && totalSteps > 0" class="hs-avgs">
        <div class="hs-avg-item">
          <span class="hs-avg-val">{{ Math.round(totalSteps / parseInt(period)).toLocaleString('it') }}</span>
          <span class="hs-avg-lbl">passi/giorno</span>
        </div>
        <div class="hs-avg-item">
          <span class="hs-avg-val">{{ Math.round(totalKcal / parseInt(period)) }}</span>
          <span class="hs-avg-lbl">kcal/giorno</span>
        </div>
        <div class="hs-avg-item">
          <span class="hs-avg-val" :style="{ color: stepsColor }">
            {{ Math.round(periodData.filter(d => d.steps >= 10000).length / parseInt(period) * 100) }}%
          </span>
          <span class="hs-avg-lbl">giorni ≥10k</span>
        </div>
      </div>
    </template>

  </div>
</template>

<script setup>
import { ref, computed, watch, nextTick, onMounted } from 'vue'
import { useAppStore } from '@/stores/app.js'
import { useHealthSyncStore } from '@/stores/healthSync.js'
import { useEntriesStore } from '@/stores/index.js'
import { DI, MI, p2 } from '@/data/constants.js'

const app      = useAppStore()
const hsStore  = useHealthSyncStore()
const entries  = useEntriesStore()

const period   = ref('7')
const syncing  = ref(false)

const stepsCanvas = ref(null)
const kcalCanvas  = ref(null)
const stepsWrap   = ref(null)
const kcalWrap    = ref(null)

const PERIODS = [
  { v: '1',   l: 'Oggi' },
  { v: '7',   l: '7 giorni' },
  { v: '30',  l: '30 giorni' },
  { v: '365', l: 'Anno' },
]

// ── Data ─────────────────────────────────────────────────────────
const periodData = computed(() => {
  const n    = parseInt(period.value)
  const days = []
  for (let i = n - 1; i >= 0; i--) {
    const d  = new Date()
    d.setDate(d.getDate() - i)
    const dk = `${d.getFullYear()}-${p2(d.getMonth()+1)}-${p2(d.getDate())}`
    days.push({
      dk,
      steps: hsStore.dailyData[dk]?.steps || 0,
      kcal:  hsStore.dailyData[dk]?.kcal  || 0,
      hr:    hsStore.dailyData[dk]?.hr    || null,
    })
  }
  return days
})

const todayData = computed(() => {
  const d  = new Date()
  const dk = `${d.getFullYear()}-${p2(d.getMonth()+1)}-${p2(d.getDate())}`
  return hsStore.dailyData[dk] || { steps: 0, kcal: 0, hr: null }
})

const totalSteps    = computed(() => periodData.value.reduce((s, d) => s + d.steps, 0))
const totalKcal     = computed(() => periodData.value.reduce((s, d) => s + d.kcal,  0))
const avgHr         = computed(() => {
  const days = periodData.value.filter(d => d.hr)
  if (!days.length) return null
  return Math.round(days.reduce((s, d) => s + d.hr, 0) / days.length)
})

const stepsColor = computed(() => {
  const n   = parseInt(period.value)
  const avg = totalSteps.value / n
  if (avg >= 10000) return 'var(--g)'
  if (avg >= 6000)  return 'var(--o)'
  return 'var(--txt)'
})

const stepsGoal = computed(() => {
  const s = todayData.value.steps
  if (!s) return ''
  if (s >= 10000) return '🎯 Obiettivo raggiunto!'
  return `Mancano ${(10000 - s).toLocaleString('it')} al goal`
})

// Sport sessions nel periodo
const periodSessions = computed(() => {
  const n       = parseInt(period.value)
  const startMs = Date.now() - n * 86_400_000
  return entries.entries
    .filter(e => e.type === 'sport' && e.ts >= startMs)
    .sort((a, b) => b.ts - a.ts)
    .slice(0, 50)
})
const totalSessions = computed(() => periodSessions.value.length)

// Ultima sync label
const lastSyncLabel = computed(() => {
  if (!hsStore.lastSync) return ''
  const diff = Math.round((Date.now() - hsStore.lastSync) / 60000)
  if (diff < 1)    return 'ora'
  if (diff < 60)   return `${diff} min fa`
  if (diff < 1440) return `${Math.round(diff / 60)} ore fa`
  return `${Math.round(diff / 1440)} giorni fa`
})

function formatTs(ts) {
  const d = new Date(ts)
  return `${DI[d.getDay()]} ${p2(d.getDate())} ${MI[d.getMonth()]} ${p2(d.getHours())}:${p2(d.getMinutes())}`
}

// ── Sync ─────────────────────────────────────────────────────────
async function doSync() {
  syncing.value = true
  try {
    const days = Math.min(365, parseInt(period.value) || 30)
    await hsStore.sync(days)
    app.toast('✅ Google Fit sincronizzato')
  } catch (e) {
    app.toast('❌ ' + e.message)
  } finally {
    syncing.value = false
  }
}

// ── Charts ────────────────────────────────────────────────────────
function drawBars(canvasEl, wrapEl, data, barColor, goalLine) {
  if (!canvasEl || !wrapEl || !data.length) return
  const DPR   = devicePixelRatio || 1
  const W     = wrapEl.clientWidth
  const H     = 100
  canvasEl.width        = W * DPR
  canvasEl.height       = H * DPR
  canvasEl.style.width  = W + 'px'
  canvasEl.style.height = H + 'px'

  const ctx  = canvasEl.getContext('2d')
  ctx.scale(DPR, DPR)
  ctx.clearRect(0, 0, W, H)

  const maxVal = Math.max(...data.map(d => d.v), goalLine || 1, 1)
  const pad    = { t: 6, b: 20, l: 2, r: 2 }
  const chartW = W - pad.l - pad.r
  const chartH = H - pad.t - pad.b
  const slot   = chartW / data.length
  const barW   = Math.max(3, slot * 0.7)

  // Goal dashed line
  if (goalLine) {
    const gy = pad.t + chartH - (goalLine / maxVal) * chartH
    ctx.save()
    ctx.strokeStyle = 'rgba(255,255,255,0.18)'
    ctx.setLineDash([3, 4])
    ctx.lineWidth = 1
    ctx.beginPath(); ctx.moveTo(pad.l, gy); ctx.lineTo(W - pad.r, gy); ctx.stroke()
    ctx.restore()
  }

  // Bars
  data.forEach((d, i) => {
    const x    = pad.l + slot * i + (slot - barW) / 2
    const barH = d.v > 0 ? Math.max(2, (d.v / maxVal) * chartH) : 0
    const y    = pad.t + chartH - barH
    const hit  = goalLine ? d.v >= goalLine : d.v > 0

    ctx.fillStyle = hit ? barColor : 'rgba(255,255,255,0.12)'
    // Rounded top
    const r = Math.min(3, barW / 2)
    ctx.beginPath()
    ctx.moveTo(x + r, y)
    ctx.lineTo(x + barW - r, y)
    ctx.quadraticCurveTo(x + barW, y, x + barW, y + r)
    ctx.lineTo(x + barW, y + barH)
    ctx.lineTo(x, y + barH)
    ctx.lineTo(x, y + r)
    ctx.quadraticCurveTo(x, y, x + r, y)
    ctx.closePath()
    ctx.fill()

    // X label (day number or month abbr)
    const skip = Math.ceil(data.length / 30)
    if (i % skip === 0) {
      const dt  = new Date(d.dk + 'T00:00:00')
      const lbl = data.length <= 31
        ? String(dt.getDate())
        : MI[dt.getMonth()]
      ctx.fillStyle = 'rgba(255,255,255,0.3)'
      ctx.font      = `${Math.max(8, 9 - Math.floor(data.length / 40))}px DM Mono, monospace`
      ctx.textAlign = 'center'
      ctx.fillText(lbl, x + barW / 2, H - 5)
    }
  })
}

function redrawCharts() {
  if (period.value === '1') return
  nextTick(() => {
    drawBars(stepsCanvas.value, stepsWrap.value, periodData.value.map(d => ({ dk: d.dk, v: d.steps })), '#00e676', 10000)
    drawBars(kcalCanvas.value,  kcalWrap.value,  periodData.value.map(d => ({ dk: d.dk, v: d.kcal  })), '#ffab40', 400)
  })
}

watch([period, () => Object.keys(hsStore.dailyData).length], redrawCharts)
onMounted(redrawCharts)
</script>
