<template>
  <div class="gchart" ref="wrapEl">
    <!-- Avg per tipo pasto -->
    <div class="gchart-avgs">
      <div v-for="m in mealAvgs" :key="m.label" class="gchart-avg-box">
        <span class="gchart-avg-val" :style="{ color: m.color }">{{ m.val ?? '—' }}</span>
        <span class="gchart-avg-lbl">{{ m.label }}</span>
      </div>
    </div>

    <!-- Tabs periodo -->
    <div class="gchart-tabs">
      <button v-for="p in PERIODS" :key="p.v" class="gchart-tab" :class="{ on: period === p.v }" @click="period = p.v">{{ p.l }}</button>
    </div>

    <!-- Canvas -->
    <div class="gchart-wrap" ref="wrapEl">
      <canvas ref="canvasEl" class="gchart-canvas"></canvas>
      <p v-if="!hasData" class="gchart-empty">Nessuna misurazione nel periodo</p>
    </div>

    <!-- Legenda zone -->
    <div class="gchart-legend">
      <span class="gchart-leg-item"><span class="gchart-leg-dot" style="background:#ff5252"></span>Alta (&gt;200)</span>
      <span class="gchart-leg-item"><span class="gchart-leg-dot" style="background:#ffab40"></span>Elevata (&gt;{{ cfgMax }})</span>
      <span class="gchart-leg-item"><span class="gchart-leg-dot" style="background:#00e676"></span>Range</span>
      <span class="gchart-leg-item"><span class="gchart-leg-dot" style="background:#ff5252"></span>Bassa (&lt;{{ cfgMin }})</span>
    </div>

    <!-- Pulsanti azioni -->
    <div class="gchart-actions">
      <button class="gchart-act-btn" @click="app.showPdfModal = true">📄 Esporta PDF</button>
      <button class="gchart-act-btn gchart-act-storico" @click="showStorico = true">📊 Storico</button>
    </div>
  </div>

  <!-- Storico Modal -->
  <Teleport to="body">
    <div class="storico-overlay" :class="{ on: showStorico }">
      <div class="storico-card">
        <div class="storico-hd">
          <span class="storico-title">📊 Andamento glicemia</span>
          <div class="storico-tabs">
            <button v-for="p in STORICO_PERIODS" :key="p.v" class="gchart-tab" :class="{ on: storicoDays === p.v }" @click="storicoDays = p.v">{{ p.l }}</button>
          </div>
        </div>
        <div ref="storicoWrapEl">
          <canvas ref="storicoCanvasEl" class="gchart-canvas"></canvas>
        </div>
        <p class="storico-sub">Ultimi {{ storicoDays }} giorni ({{ storicoPoints.length }} valori)</p>
        <div class="storico-stats">
          <div class="storico-stat">
            <span class="storico-stat-v" :style="{ color: avgColor(storicoStats.avg) }">{{ storicoStats.avg ?? '—' }}</span>
            <span class="storico-stat-l">Media mg/dL</span>
          </div>
          <div class="storico-stat">
            <span class="storico-stat-v" :style="{ color: storicoStats.inRange >= 70 ? 'var(--g)' : storicoStats.inRange >= 50 ? 'var(--o)' : 'var(--r)' }">{{ storicoStats.inRange != null ? storicoStats.inRange + '%' : '—' }}</span>
            <span class="storico-stat-l">In range</span>
          </div>
          <div class="storico-stat">
            <span class="storico-stat-v" style="color:var(--o)">{{ storicoStats.max ?? '—' }}</span>
            <span class="storico-stat-l">Picco</span>
          </div>
          <div class="storico-stat">
            <span class="storico-stat-v" style="color:var(--b)">{{ storicoStats.min ?? '—' }}</span>
            <span class="storico-stat-l">Minimo</span>
          </div>
        </div>
        <div class="storico-counts">
          <span class="storico-count-item">{{ storicoPoints.length }} Misurazioni</span>
          <span class="storico-count-item" style="color:var(--o)">↑ {{ storicoStats.highCount }} episodi alti</span>
          <span class="storico-count-item" style="color:var(--r)">↓ {{ storicoStats.lowCount }} episodi bassi</span>
        </div>
        <button class="storico-close" @click="showStorico = false">Chiudi</button>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue'
import { useEntriesStore, useConfigStore } from '@/stores/index.js'
import { useAppStore } from '@/stores/app.js'
import { getDK, p2 } from '@/data/constants.js'

const entriesStore = useEntriesStore()
const configStore  = useConfigStore()
const app          = useAppStore()

const PERIODS        = [{ v: 'oggi', l: 'Oggi' }, { v: 7, l: '7 giorni' }, { v: 30, l: '30 giorni' }]
const STORICO_PERIODS = [{ v: 7, l: '7g' }, { v: 14, l: '14g' }, { v: 30, l: '30g' }]
const period      = ref('oggi')
const storicoDays = ref(14)
const showStorico = ref(false)

const canvasEl      = ref(null)
const wrapEl        = ref(null)
const storicoCanvasEl = ref(null)
const storicoWrapEl   = ref(null)

const cfgMin = computed(() => configStore.cfg.targetMin || 80)
const cfgMax = computed(() => configStore.cfg.targetMax || 180)

// --- punti principali ---
const points = computed(() => {
  if (period.value === 'oggi') {
    return entriesStore.forDay(getDK(0))
      .filter(e => e.glic > 0)
      .map(e => ({ ts: e.ts, v: e.glic }))
      .sort((a, b) => a.ts - b.ts)
  }
  const arr = []
  for (let i = -(period.value - 1); i <= 0; i++) {
    entriesStore.forDay(getDK(i)).filter(e => e.glic > 0).forEach(e => arr.push({ ts: e.ts, v: e.glic }))
  }
  return arr.sort((a, b) => a.ts - b.ts)
})
const hasData = computed(() => points.value.length > 0)

// --- avg per tipo pasto ---
const mealAvgs = computed(() => {
  const days = period.value === 'oggi' ? [0] : Array.from({ length: period.value }, (_, i) => -(period.value - 1) + i)
  const col = [], pra = [], cen = []
  days.forEach(offset => {
    entriesStore.forDay(getDK(offset)).forEach(e => {
      if (e.type === 'pasto' && e.glic > 0) {
        if (e.mealType === 'Colazione') col.push(e.glic)
        else if (e.mealType === 'Pranzo') pra.push(e.glic)
        else if (e.mealType === 'Cena')   cen.push(e.glic)
      }
    })
  })
  const avg = arr => arr.length ? Math.round(arr.reduce((s, v) => s + v, 0) / arr.length) : null
  const color = v => !v ? 'var(--txt2)' : v < cfgMin.value ? 'var(--r)' : v > cfgMax.value ? 'var(--o)' : 'var(--g)'
  return [
    { label: 'COLAZIONE AVG', val: avg(col), color: color(avg(col)) },
    { label: 'PRANZO AVG',    val: avg(pra), color: color(avg(pra)) },
    { label: 'CENA AVG',      val: avg(cen), color: color(avg(cen)) },
  ]
})

// --- punti storico ---
const storicoPoints = computed(() => {
  const arr = []
  for (let i = -(storicoDays.value - 1); i <= 0; i++) {
    entriesStore.forDay(getDK(i)).filter(e => e.glic > 0).forEach(e => arr.push({ ts: e.ts, v: e.glic }))
  }
  return arr.sort((a, b) => a.ts - b.ts)
})

const storicoStats = computed(() => {
  const pts = storicoPoints.value
  if (!pts.length) return { avg: null, inRange: null, max: null, min: null, highCount: 0, lowCount: 0 }
  const vals = pts.map(p => p.v)
  const avg = Math.round(vals.reduce((s, v) => s + v, 0) / vals.length)
  const inRange = Math.round(vals.filter(v => v >= cfgMin.value && v <= cfgMax.value).length / vals.length * 100)
  const highCount = vals.filter(v => v > cfgMax.value).length
  const lowCount  = vals.filter(v => v < cfgMin.value).length
  return { avg, inRange, max: Math.max(...vals), min: Math.min(...vals), highCount, lowCount }
})

function avgColor(v) {
  if (!v) return 'var(--txt2)'
  if (v < cfgMin.value) return 'var(--r)'
  if (v > cfgMax.value) return 'var(--o)'
  return 'var(--g)'
}

// --- canvas drawing ---
function drawChart(canvasRef, wrapRef, pts, todayMode, numDaysParam = 14) {
  const canvas = canvasRef.value
  const wrap   = wrapRef.value
  if (!canvas || !wrap) return
  const W = wrap.clientWidth || 300
  if (!W) return
  const H = 200
  const dpr = window.devicePixelRatio || 1
  canvas.width  = W * dpr
  canvas.height = H * dpr
  canvas.style.width  = W + 'px'
  canvas.style.height = H + 'px'
  const ctx = canvas.getContext('2d')
  ctx.scale(dpr, dpr)

  const tMin = cfgMin.value
  const tMax = cfgMax.value
  const isLight = document.body.classList.contains('light-mode')
  const C = {
    bg:   isLight ? '#ffffff'              : '#111620',
    grid: isLight ? 'rgba(0,0,0,0.06)'    : 'rgba(255,255,255,0.06)',
    txt:  isLight ? '#556070'              : '#7a8899',
    g:    isLight ? '#059669'              : '#00e676',
    r:    isLight ? '#dc2626'              : '#ff5252',
    o:    isLight ? '#c2810a'              : '#ffab40',
    line: isLight ? 'rgba(2,132,199,0.65)' : 'rgba(64,196,255,0.65)',
  }

  const PL = 42, PR = 10, PT = 14, PB = 28
  const plotW = W - PL - PR
  const plotH = H - PT - PB

  const vals   = pts.map(p => p.v)
  const dataMin = vals.length ? Math.min(...vals) : tMin
  const dataMax = vals.length ? Math.max(...vals) : tMax
  const yMin = Math.floor(Math.min(dataMin, tMin - 10, 50) / 20) * 20
  const yMax = Math.ceil(Math.max(dataMax, tMax + 20, 200) / 20) * 20

  let xMin, xMax
  if (todayMode) {
    const d = new Date(); d.setHours(0, 0, 0, 0)
    xMin = d.getTime()
    xMax = xMin + 86400000 - 1
  } else {
    const startDay = new Date(); startDay.setDate(startDay.getDate() - (pts.length > 0 ? Math.ceil((Date.now() - Math.min(...pts.map(p => p.ts))) / 86400000) : 6)); startDay.setHours(0, 0, 0, 0)
    const startFixed = new Date(); startFixed.setDate(startFixed.getDate() - (numDaysParam - 1)); startFixed.setHours(0, 0, 0, 0)
    xMin = Math.min(startDay.getTime(), startFixed.getTime())
    const endDay = new Date(); endDay.setHours(23, 59, 59, 999)
    xMax = endDay.getTime()
  }

  const toX = ts  => PL + ((ts - xMin) / (xMax - xMin)) * plotW
  const toY = val => PT + (1 - (val - yMin) / (yMax - yMin)) * plotH

  ctx.clearRect(0, 0, W, H)
  ctx.fillStyle = C.bg
  if (ctx.roundRect) { ctx.beginPath(); ctx.roundRect(0, 0, W, H, 12); ctx.fill() }
  else ctx.fillRect(0, 0, W, H)

  // Zone colorate
  const zoneAlpha = isLight ? 0.06 : 0.08
  // Bassa: <tMin
  const yBassaTop = toY(tMin), yBassaBot = toY(yMin)
  ctx.fillStyle = `rgba(255,82,82,${zoneAlpha})`
  ctx.fillRect(PL, yBassaTop, plotW, yBassaBot - yBassaTop)
  // Range
  const yRangeTop = toY(tMax), yRangeBot = toY(tMin)
  ctx.fillStyle = `rgba(0,230,118,${zoneAlpha})`
  ctx.fillRect(PL, yRangeTop, plotW, yRangeBot - yRangeTop)
  // Elevata: tMax → 200
  if (200 > tMax && toY(200) < toY(tMax)) {
    ctx.fillStyle = `rgba(255,171,64,${zoneAlpha})`
    ctx.fillRect(PL, toY(200), plotW, toY(tMax) - toY(200))
  }
  // Alta: >200
  if (yMax > 200) {
    ctx.fillStyle = `rgba(255,82,82,${zoneAlpha * 1.3})`
    ctx.fillRect(PL, toY(yMax), plotW, toY(200) - toY(yMax))
  }

  // Dashed target lines
  ctx.setLineDash([3, 4])
  ctx.strokeStyle = C.g; ctx.globalAlpha = 0.4; ctx.lineWidth = 1
  ;[tMin, tMax].forEach(v => {
    ctx.beginPath(); ctx.moveTo(PL, toY(v)); ctx.lineTo(PL + plotW, toY(v)); ctx.stroke()
  })
  ctx.setLineDash([]); ctx.globalAlpha = 1

  // Grid + Y labels
  ctx.font = '10px DM Mono, monospace'; ctx.textAlign = 'right'; ctx.textBaseline = 'middle'
  const gridStep = (yMax - yMin) <= 160 ? 40 : 50
  for (let v = yMin; v <= yMax; v += gridStep) {
    const y = toY(v)
    ctx.strokeStyle = C.grid; ctx.lineWidth = 1
    ctx.beginPath(); ctx.moveTo(PL, y); ctx.lineTo(PL + plotW, y); ctx.stroke()
    ctx.fillStyle = C.txt; ctx.fillText(v, PL - 4, y)
  }

  // X axis labels
  ctx.textAlign = 'center'; ctx.textBaseline = 'bottom'; ctx.font = '9px DM Sans, sans-serif'; ctx.fillStyle = C.txt
  if (todayMode) {
    [0, 6, 12, 18, 23].forEach(h => {
      const d = new Date(); d.setHours(h, 0, 0, 0)
      ctx.fillText(h + 'h', toX(d.getTime()), H - 4)
    })
  } else {
    const numDays = Math.round((xMax - xMin) / 86400000)
    const labelEvery = numDays <= 7 ? 1 : numDays <= 14 ? 2 : 5
    for (let i = 0; i < numDays; i += labelEvery) {
      const d = new Date(xMin)
      d.setDate(d.getDate() + i)
      d.setHours(12)
      ctx.fillText(`${p2(d.getDate())}/${p2(d.getMonth() + 1)}`, toX(d.getTime()), H - 4)
    }
  }

  if (!pts.length) return

  // Line
  ctx.strokeStyle = C.line; ctx.lineWidth = 1.5; ctx.lineJoin = 'round'
  ctx.beginPath()
  pts.forEach((pt, i) => { const x = toX(pt.ts), y = toY(pt.v); i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y) })
  ctx.stroke()

  // Dots
  pts.forEach(pt => {
    const x = toX(pt.ts), y = toY(pt.v)
    const col = pt.v < tMin ? C.r : pt.v > tMax ? C.o : C.g
    ctx.beginPath(); ctx.arc(x, y, 3.5, 0, Math.PI * 2)
    ctx.fillStyle = C.bg; ctx.fill()
    ctx.strokeStyle = col; ctx.lineWidth = 2; ctx.stroke()
    if (pt.v < tMin || pt.v > 200 || (pt.v > tMax && pts.length <= 20)) {
      ctx.fillStyle = col; ctx.font = 'bold 9px DM Mono, monospace'
      ctx.textAlign = 'center'; ctx.textBaseline = 'bottom'
      ctx.fillText(pt.v, x, y - 6)
    }
  })
}

function draw() {
  const days = typeof period.value === 'number' ? period.value : 1
  drawChart(canvasEl, wrapEl, points.value, period.value === 'oggi', days)
}

let ro = null
onMounted(() => {
  nextTick(draw)
  ro = new ResizeObserver(() => nextTick(draw))
  if (wrapEl.value) ro.observe(wrapEl.value)
})
onUnmounted(() => ro?.disconnect())

watch([points, () => configStore.cfg.targetMin, () => configStore.cfg.targetMax], () => nextTick(draw))
watch([storicoPoints, showStorico, storicoDays], () => { if (showStorico.value) nextTick(() => drawChart(storicoCanvasEl, storicoWrapEl, storicoPoints.value, false, storicoDays.value)) })

const themeObserver = typeof MutationObserver !== 'undefined' ? new MutationObserver(() => { nextTick(draw); if (showStorico.value) nextTick(() => drawChart(storicoCanvasEl, storicoWrapEl, storicoPoints.value, false, storicoDays.value)) }) : null
onMounted(() => themeObserver?.observe(document.body, { attributes: true, attributeFilter: ['class'] }))
onUnmounted(() => themeObserver?.disconnect())
</script>

<style scoped>
/* Avg per pasto */
.gchart-avgs { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin-bottom: 12px; }
.gchart-avg-box { background: var(--card2); border: 1px solid var(--bdr); border-radius: 10px; padding: 10px 8px; text-align: center; }
.gchart-avg-val { display: block; font-size: 1.4rem; font-weight: 800; font-family: var(--mono); line-height: 1.1; }
.gchart-avg-lbl { display: block; font-size: .6rem; font-weight: 600; color: var(--txt2); text-transform: uppercase; letter-spacing: .4px; margin-top: 3px; }

/* Tabs */
.gchart-tabs { display: flex; gap: 6px; margin-bottom: 10px; }
.gchart-tab {
  flex: 1; background: var(--card2); border: 1px solid var(--bdr);
  border-radius: 8px; color: var(--txt2); font-size: .78rem;
  font-family: var(--sans); padding: 7px 4px; cursor: pointer; transition: background .15s;
}
.gchart-tab.on { background: rgba(0,230,118,.1); border-color: var(--g); color: var(--g); font-weight: 700; }

/* Wrap + canvas */
.gchart-wrap { position: relative; }
.gchart-canvas { display: block; width: 100%; border-radius: 12px; }
.gchart-empty { text-align: center; color: var(--txt2); font-size: .8rem; padding: 32px 0; margin: 0; }

/* Legenda */
.gchart-legend { display: flex; gap: 10px; flex-wrap: wrap; margin-top: 8px; justify-content: center; }
.gchart-leg-item { display: flex; align-items: center; gap: 4px; font-size: .68rem; color: var(--txt2); }
.gchart-leg-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }

/* Pulsanti azioni */
.gchart-actions { display: flex; gap: 8px; margin-top: 12px; }
.gchart-act-btn {
  flex: 1; background: var(--card2); border: 1px solid var(--bdr);
  border-radius: 11px; color: var(--txt2); font-family: var(--sans);
  font-size: .82rem; font-weight: 600; padding: 11px 8px; cursor: pointer; transition: background .15s;
}
.gchart-act-btn:active { background: var(--bdr) }
.gchart-act-storico { border-color: rgba(0,230,118,.35); color: var(--g); background: rgba(0,230,118,.06); }
.gchart-act-storico:active { background: rgba(0,230,118,.12) }

/* Storico overlay */
.storico-overlay {
  position: fixed; inset: 0; background: rgba(0,0,0,.7); z-index: 9000;
  display: flex; align-items: flex-end; justify-content: center;
  opacity: 0; pointer-events: none; transition: opacity .22s;
}
.storico-overlay.on { opacity: 1; pointer-events: all; }
.storico-card {
  background: var(--bg2); border: 1px solid var(--bdr2); border-radius: 20px 20px 0 0;
  padding: 20px 16px 32px; width: 100%; max-width: 520px; max-height: 92vh; overflow-y: auto;
}
.storico-hd { display: flex; align-items: center; justify-content: space-between; margin-bottom: 14px; flex-wrap: wrap; gap: 8px; }
.storico-title { font-size: .95rem; font-weight: 700; color: var(--txt); }
.storico-tabs { display: flex; gap: 5px; }
.storico-sub { font-size: .72rem; color: var(--txt2); text-align: center; margin: 6px 0 14px; }
.storico-stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin-bottom: 12px; }
.storico-stat { background: var(--card); border: 1px solid var(--bdr); border-radius: 10px; padding: 10px 6px; text-align: center; }
.storico-stat-v { display: block; font-size: 1.3rem; font-weight: 800; font-family: var(--mono); }
.storico-stat-l { display: block; font-size: .58rem; color: var(--txt2); text-transform: uppercase; letter-spacing: .3px; margin-top: 3px; }
.storico-counts { display: flex; gap: 12px; justify-content: center; flex-wrap: wrap; margin-bottom: 16px; }
.storico-count-item { font-size: .78rem; font-weight: 600; color: var(--txt2); }
.storico-close {
  width: 100%; background: var(--card2); border: 1px solid var(--bdr2);
  border-radius: 12px; color: var(--txt); font-family: var(--sans);
  font-size: .9rem; padding: 13px; cursor: pointer;
}
</style>
