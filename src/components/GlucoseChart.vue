<template>
  <div class="gchart" ref="wrapEl">
    <div class="gchart-hd">
      <span class="gchart-title">Andamento glicemia</span>
      <div class="gchart-tabs">
        <button
          v-for="p in PERIODS" :key="p.v"
          class="gchart-tab" :class="{ on: days === p.v }"
          @click="days = p.v"
        >{{ p.l }}</button>
      </div>
    </div>
    <canvas ref="canvasEl" class="gchart-canvas"></canvas>
    <p v-if="!hasData" class="gchart-empty">Nessuna misurazione nel periodo selezionato</p>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue'
import { useEntriesStore, useConfigStore } from '@/stores/index.js'
import { getDK, p2 } from '@/data/constants.js'

const entriesStore = useEntriesStore()
const configStore = useConfigStore()

const PERIODS = [{ v: 7, l: '7g' }, { v: 14, l: '14g' }, { v: 30, l: '30g' }]
const days = ref(14)
const canvasEl = ref(null)
const wrapEl = ref(null)

const points = computed(() => {
  const arr = []
  for (let i = -(days.value - 1); i <= 0; i++) {
    entriesStore.forDay(getDK(i))
      .filter(e => e.type === 'glicemia' && e.glic > 0)
      .forEach(e => arr.push({ ts: e.ts, v: e.glic }))
  }
  return arr.sort((a, b) => a.ts - b.ts)
})

const hasData = computed(() => points.value.length > 0)

function draw() {
  const canvas = canvasEl.value
  if (!canvas || !wrapEl.value) return
  const W = wrapEl.value.clientWidth
  if (!W) return
  const H = 200
  const dpr = window.devicePixelRatio || 1
  canvas.width = W * dpr
  canvas.height = H * dpr
  canvas.style.width = W + 'px'
  canvas.style.height = H + 'px'
  const ctx = canvas.getContext('2d')
  ctx.scale(dpr, dpr)

  const cfg = configStore.cfg
  const tMin = cfg.targetMin || 100
  const tMax = cfg.targetMax || 160
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

  // Y range
  const vals = points.value.map(p => p.v)
  const dataMin = vals.length ? Math.min(...vals) : tMin
  const dataMax = vals.length ? Math.max(...vals) : tMax
  const yMin = Math.floor(Math.min(dataMin, tMin - 10, 60) / 20) * 20
  const yMax = Math.ceil(Math.max(dataMax, tMax + 10, 200) / 20) * 20

  // X range: full day span
  const startDay = new Date(); startDay.setDate(startDay.getDate() - (days.value - 1)); startDay.setHours(0, 0, 0, 0)
  const endDay   = new Date(); endDay.setHours(23, 59, 59, 999)
  const xMin = startDay.getTime()
  const xMax = endDay.getTime()

  const toX = ts  => PL + ((ts - xMin) / (xMax - xMin)) * plotW
  const toY = val => PT + (1 - (val - yMin) / (yMax - yMin)) * plotH

  // Clear
  ctx.clearRect(0, 0, W, H)

  // Background
  ctx.fillStyle = C.bg
  if (ctx.roundRect) { ctx.beginPath(); ctx.roundRect(0, 0, W, H, 12); ctx.fill() }
  else ctx.fillRect(0, 0, W, H)

  // Target range band
  ctx.fillStyle = isLight ? 'rgba(5,150,105,0.08)' : 'rgba(0,230,118,0.07)'
  ctx.fillRect(PL, toY(tMax), plotW, toY(tMin) - toY(tMax))

  // Target dashed lines
  ctx.setLineDash([3, 4])
  ctx.strokeStyle = C.g
  ctx.globalAlpha = 0.4
  ctx.lineWidth = 1
  ;[tMin, tMax].forEach(v => {
    ctx.beginPath(); ctx.moveTo(PL, toY(v)); ctx.lineTo(PL + plotW, toY(v)); ctx.stroke()
  })
  ctx.setLineDash([])
  ctx.globalAlpha = 1

  // Horizontal grid lines + Y axis labels
  ctx.font = '10px DM Mono, monospace'
  ctx.textAlign = 'right'
  ctx.textBaseline = 'middle'
  const gridStep = (yMax - yMin) <= 160 ? 40 : 50
  for (let v = yMin; v <= yMax; v += gridStep) {
    const y = toY(v)
    ctx.strokeStyle = C.grid; ctx.lineWidth = 1
    ctx.beginPath(); ctx.moveTo(PL, y); ctx.lineTo(PL + plotW, y); ctx.stroke()
    ctx.fillStyle = C.txt
    ctx.fillText(v, PL - 4, y)
  }

  // X axis date labels
  ctx.textAlign = 'center'
  ctx.textBaseline = 'bottom'
  ctx.font = '9px DM Sans, sans-serif'
  ctx.fillStyle = C.txt
  const labelEvery = days.value <= 7 ? 1 : days.value <= 14 ? 2 : 5
  for (let i = 0; i < days.value; i += labelEvery) {
    const d = new Date(startDay)
    d.setDate(d.getDate() + i)
    d.setHours(12)
    ctx.fillText(`${p2(d.getDate())}/${p2(d.getMonth() + 1)}`, toX(d.getTime()), H - 4)
  }

  if (!hasData.value) return

  // Glucose line
  ctx.strokeStyle = C.line
  ctx.lineWidth = 1.5
  ctx.lineJoin = 'round'
  ctx.beginPath()
  points.value.forEach((pt, i) => {
    const x = toX(pt.ts), y = toY(pt.v)
    i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)
  })
  ctx.stroke()

  // Dots + hypoglycemia labels
  points.value.forEach(pt => {
    const x = toX(pt.ts), y = toY(pt.v)
    const col = pt.v < tMin ? C.r : pt.v > tMax ? C.o : C.g
    ctx.beginPath()
    ctx.arc(x, y, 3.5, 0, Math.PI * 2)
    ctx.fillStyle = C.bg; ctx.fill()
    ctx.strokeStyle = col; ctx.lineWidth = 2; ctx.stroke()
    if (pt.v < tMin || (pt.v > tMax && days.value <= 14)) {
      ctx.fillStyle = col
      ctx.font = 'bold 9px DM Mono, monospace'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'bottom'
      ctx.fillText(pt.v, x, y - 6)
    }
  })
}

let ro = null
onMounted(() => {
  nextTick(draw)
  ro = new ResizeObserver(() => nextTick(draw))
  if (wrapEl.value) ro.observe(wrapEl.value)
})
onUnmounted(() => ro?.disconnect())
watch([points, () => configStore.cfg.targetMin, () => configStore.cfg.targetMax], () => nextTick(draw))
// Ridisegna quando cambia il tema
const themeObserver = typeof MutationObserver !== 'undefined' ? new MutationObserver(() => nextTick(draw)) : null
onMounted(() => themeObserver?.observe(document.body, { attributes: true, attributeFilter: ['class'] }))
onUnmounted(() => themeObserver?.disconnect())
</script>

<style scoped>
.gchart { padding: 0; }
.gchart-hd { display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px; }
.gchart-title { font-size: .82rem; font-weight: 600; color: var(--txt2); }
.gchart-tabs { display: flex; gap: 4px; }
.gchart-tab {
  background: var(--card2); border: 1px solid var(--bdr);
  border-radius: 7px; color: var(--txt2); font-size: .72rem;
  font-family: var(--sans); padding: 3px 27px; cursor: pointer; transition: background .15s;
}
.gchart-tab.on { background: rgba(0,230,118,.1); border-color: var(--g); color: var(--g); font-weight: 600; }
.gchart-canvas { display: block; width: 100%; border-radius: 12px; }
.gchart-empty { text-align: center; color: var(--txt2); font-size: .8rem; padding: 32px 0; margin: 0; }
</style>
