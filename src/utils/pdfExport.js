import { getDK, p2 } from '@/data/constants.js'

function drawChartForPdf(pts, tMin, tMax, days) {
  const W = 720, H = 180
  const canvas = document.createElement('canvas')
  canvas.width = W; canvas.height = H
  const ctx = canvas.getContext('2d')

  const PL = 42, PR = 10, PT = 14, PB = 28
  const plotW = W - PL - PR
  const plotH = H - PT - PB

  const vals = pts.map(p => p.v)
  const yMin = vals.length ? Math.floor(Math.min(...vals, tMin - 10, 50) / 20) * 20 : 40
  const yMax = vals.length ? Math.ceil(Math.max(...vals, tMax + 20, 200) / 20) * 20 : 300

  let xMin, xMax
  if (pts.length >= 2) {
    xMin = Math.min(...pts.map(p => p.ts))
    const d = new Date(); d.setHours(23,59,59,999); xMax = d.getTime()
  } else {
    const sd = new Date(); sd.setDate(sd.getDate() - (days - 1)); sd.setHours(0,0,0,0); xMin = sd.getTime()
    const ed = new Date(); ed.setHours(23,59,59,999); xMax = ed.getTime()
  }

  const toX = ts  => PL + ((ts - xMin) / (xMax - xMin)) * plotW
  const toY = val => PT + (1 - (val - yMin) / (yMax - yMin)) * plotH

  ctx.fillStyle = '#f8fafc'; ctx.fillRect(0, 0, W, H)

  // Zones
  ctx.fillStyle = 'rgba(239,68,68,0.07)'; ctx.fillRect(PL, toY(tMin), plotW, toY(yMin) - toY(tMin))
  ctx.fillStyle = 'rgba(34,197,94,0.07)'; ctx.fillRect(PL, toY(tMax), plotW, toY(tMin) - toY(tMax))
  if (200 > tMax) { ctx.fillStyle = 'rgba(249,115,22,0.07)'; ctx.fillRect(PL, toY(200), plotW, toY(tMax) - toY(200)) }
  if (yMax > 200) { ctx.fillStyle = 'rgba(239,68,68,0.10)'; ctx.fillRect(PL, toY(yMax), plotW, toY(200) - toY(yMax)) }

  // Target lines
  ctx.setLineDash([3,4]); ctx.strokeStyle = 'rgba(34,197,94,0.5)'; ctx.lineWidth = 1
  ;[tMin, tMax].forEach(v => { ctx.beginPath(); ctx.moveTo(PL, toY(v)); ctx.lineTo(PL+plotW, toY(v)); ctx.stroke() })
  ctx.setLineDash([])

  // Grid + Y labels
  ctx.font = '10px monospace'; ctx.textAlign = 'right'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#8090a0'
  const gridStep = (yMax - yMin) <= 160 ? 40 : 50
  for (let v = yMin; v <= yMax; v += gridStep) {
    ctx.strokeStyle = 'rgba(0,0,0,0.05)'; ctx.lineWidth = 1
    ctx.beginPath(); ctx.moveTo(PL, toY(v)); ctx.lineTo(PL+plotW, toY(v)); ctx.stroke()
    ctx.fillStyle = '#8090a0'; ctx.fillText(v, PL - 4, toY(v))
  }

  // X labels
  ctx.textAlign = 'center'; ctx.textBaseline = 'bottom'; ctx.font = '9px sans-serif'; ctx.fillStyle = '#8090a0'
  const numDays = Math.round((xMax - xMin) / 86400000)
  const labelEvery = numDays <= 7 ? 1 : numDays <= 14 ? 2 : numDays <= 30 ? 5 : 10
  for (let i = 0; i < numDays; i += labelEvery) {
    const d = new Date(xMin); d.setDate(d.getDate() + i); d.setHours(12)
    ctx.fillText(`${p2(d.getDate())}/${p2(d.getMonth()+1)}`, toX(d.getTime()), H - 4)
  }

  if (pts.length < 2) return canvas

  // Line
  ctx.strokeStyle = 'rgba(59,130,246,0.7)'; ctx.lineWidth = 1.5; ctx.lineJoin = 'round'
  ctx.beginPath()
  pts.forEach((pt, i) => { const x = toX(pt.ts), y = toY(pt.v); i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y) })
  ctx.stroke()

  // Dots
  pts.forEach(pt => {
    const col = pt.v < tMin ? '#ef4444' : pt.v > tMax ? '#f97316' : '#22c55e'
    ctx.beginPath(); ctx.arc(toX(pt.ts), toY(pt.v), 2.5, 0, Math.PI * 2)
    ctx.fillStyle = col; ctx.fill()
  })

  return canvas
}

export function exportPdfReport(entriesStore, configStore, days) {
  const cfg = configStore.cfg
  const tMin = cfg.targetMin || 80
  const tMax = cfg.targetMax || 180

  const endDate = new Date()
  const startDate = new Date(); startDate.setDate(startDate.getDate() - (days - 1)); startDate.setHours(0,0,0,0)

  // Collect data
  const allPts = []
  const dayRows = []

  for (let i = -(days - 1); i <= 0; i++) {
    const d = new Date(); d.setDate(d.getDate() + i); d.setHours(0,0,0,0)
    const dayEntries = entriesStore.forDay(getDK(i))
    const glicEntries = dayEntries.filter(e => e.glic > 0)
    glicEntries.forEach(e => allPts.push({ ts: e.ts, v: e.glic }))

    if (glicEntries.length) {
      const dVals = glicEntries.map(e => e.glic)
      const dAvg = Math.round(dVals.reduce((s,v) => s+v,0)/dVals.length)
      const insulinEntries = dayEntries.filter(e => e.type === 'insulina')
      const totalBolo = insulinEntries.filter(e => e.insulinSubtype === 'Bolo' || e.insulinSubtype === 'Correzione').reduce((s,e) => s+(e.units||0), 0)
      const totalBasale = insulinEntries.filter(e => e.insulinSubtype === 'Basale').reduce((s,e) => s+(e.units||0), 0)
      const totalCarbs = Math.round(dayEntries.reduce((s,e) => s+(e.carbs||0), 0))
      const totalKcal  = Math.round(dayEntries.reduce((s,e) => s+(e.kcal||0), 0))
      const boloFromPasto = dayEntries.filter(e => e.type === 'pasto' || e.type === 'spuntino').reduce((s,e) => s+(e.bolo||0), 0)
      const avgColor = dAvg < tMin ? '#dc2626' : dAvg > tMax ? '#ea580c' : '#16a34a'
      dayRows.push({
        dateStr: `${p2(d.getDate())}/${p2(d.getMonth()+1)}`,
        n: glicEntries.length,
        avg: dAvg, avgColor,
        min: Math.min(...dVals), max: Math.max(...dVals),
        carbs: totalCarbs, kcal: totalKcal,
        bolo: (totalBolo + boloFromPasto).toFixed(1),
        basale: totalBasale > 0 ? totalBasale.toFixed(1) : '—'
      })
    }
  }
  allPts.sort((a,b) => a.ts - b.ts)

  // Stats
  const vals = allPts.map(p => p.v)
  const avg = vals.length ? Math.round(vals.reduce((s,v) => s+v,0)/vals.length) : 0
  const inRange = vals.length ? Math.round(vals.filter(v => v >= tMin && v <= tMax).length / vals.length * 100) : 0
  const peakVal = vals.length ? Math.max(...vals) : 0
  const minVal  = vals.length ? Math.min(...vals) : 0
  const highCnt = vals.filter(v => v > tMax).length
  const lowCnt  = vals.filter(v => v < tMin).length

  const avgColor   = avg < tMin ? '#dc2626' : avg > tMax ? '#ea580c' : '#16a34a'
  const rangeColor = inRange >= 70 ? '#16a34a' : inRange >= 50 ? '#ea580c' : '#dc2626'

  // Chart image
  const chartCanvas = drawChartForPdf(allPts, tMin, tMax, days)
  const chartUrl = chartCanvas.toDataURL('image/png')

  // Time-slot averages
  const mat = [], pom = [], ser = [], not = []
  allPts.forEach(pt => {
    const d = new Date(pt.ts)
    const mins = d.getHours() * 60 + d.getMinutes()
    if      (mins >= 7*60 && mins < 12*60+30) mat.push(pt.v)
    else if (mins >= 12*60+30 && mins < 18*60) pom.push(pt.v)
    else if (mins >= 18*60 && mins < 22*60)    ser.push(pt.v)
    else                                        not.push(pt.v)
  })
  const slotAvg = arr => arr.length ? Math.round(arr.reduce((s,v) => s+v,0)/arr.length) : null
  const slotCol = v => !v ? '#8090a0' : v < tMin ? '#dc2626' : v > tMax ? '#ea580c' : '#16a34a'
  const slots = [
    { l: 'Mattina', sub: '7–12:30', v: slotAvg(mat) },
    { l: 'Pomeriggio', sub: '12:30–18', v: slotAvg(pom) },
    { l: 'Sera', sub: '18–22', v: slotAvg(ser) },
    { l: 'Notte', sub: '22–7', v: slotAvg(not) },
  ]

  const tableRows = dayRows.reverse().map(r => `
    <tr>
      <td>${r.dateStr}</td>
      <td style="text-align:center">${r.n}</td>
      <td style="text-align:center;color:${r.avgColor};font-weight:700">${r.avg}</td>
      <td style="text-align:center">${r.min}</td>
      <td style="text-align:center">${r.max}</td>
      <td style="text-align:center">${r.carbs ? r.carbs+'g' : '—'}</td>
      <td style="text-align:center">${r.kcal || '—'}</td>
      <td style="text-align:center;color:#9333ea">${r.bolo !== '0.0' ? r.bolo+'U' : '—'}</td>
      <td style="text-align:center;color:#0284c7">${r.basale !== '—' ? r.basale+'U' : '—'}</td>
    </tr>`).join('')

  const slotsHtml = slots.map(s => `
    <div class="slot-box">
      <div class="slot-v" style="color:${slotCol(s.v)}">${s.v ?? '—'}</div>
      <div class="slot-l">${s.l}</div>
      <div class="slot-sub">${s.sub}</div>
    </div>`).join('')

  const dateLabel = `${p2(startDate.getDate())}/${p2(startDate.getMonth()+1)}/${startDate.getFullYear()} – ${p2(endDate.getDate())}/${p2(endDate.getMonth()+1)}/${endDate.getFullYear()}`

  const html = `<!DOCTYPE html>
<html lang="it">
<head>
<meta charset="UTF-8">
<title>GlicoLog Report – ${days} giorni</title>
<style>
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0 }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, sans-serif; font-size: 13px; color: #1a2433; background: #fff; padding: 24px 28px; max-width: 820px; margin: 0 auto }
  .hdr { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 20px; border-bottom: 2px solid #e8edf4; padding-bottom: 14px }
  .hdr-title { font-size: 22px; font-weight: 800; color: #1a2433 }
  .hdr-sub { font-size: 12px; color: #556070; margin-top: 3px }
  .hdr-target { font-size: 11px; color: #556070; text-align: right; line-height: 1.5 }
  .stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-bottom: 18px }
  .stat-box { background: #f2f5f9; border-radius: 10px; padding: 13px 10px; text-align: center }
  .stat-v { font-size: 24px; font-weight: 800; display: block; font-family: 'Courier New', monospace; line-height: 1 }
  .stat-l { font-size: 10px; color: #556070; text-transform: uppercase; letter-spacing: .5px; margin-top: 5px; display: block }
  .stat-sub { font-size: 10px; color: #8090a0; margin-top: 2px; display: block }
  .slots-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin-bottom: 18px }
  .slot-box { background: #f8fafc; border: 1px solid #e8edf4; border-radius: 8px; padding: 10px 6px; text-align: center }
  .slot-v { font-size: 20px; font-weight: 700; font-family: 'Courier New', monospace; line-height: 1 }
  .slot-l { font-size: 10px; font-weight: 700; color: #556070; text-transform: uppercase; letter-spacing: .4px; margin-top: 4px }
  .slot-sub { font-size: 10px; color: #8090a0; margin-top: 1px }
  .chart-img { width: 100%; height: auto; border-radius: 8px; border: 1px solid #e8edf4; margin-bottom: 6px; display: block }
  h2 { font-size: 13px; font-weight: 700; color: #1a2433; margin: 18px 0 10px; border-bottom: 1px solid #e8edf4; padding-bottom: 6px; text-transform: uppercase; letter-spacing: .4px }
  .chart-legend { font-size: 11px; color: #8090a0; margin-bottom: 16px; display: flex; gap: 14px }
  .chart-legend span { display: flex; align-items: center; gap: 4px }
  .dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0 }
  table { width: 100%; border-collapse: collapse; font-size: 12px }
  th { background: #f2f5f9; padding: 8px 6px; text-align: center; font-size: 10px; text-transform: uppercase; letter-spacing: .4px; color: #556070; font-weight: 600; border-bottom: 2px solid #e8edf4 }
  th:first-child { text-align: left }
  td { padding: 7px 6px; border-bottom: 1px solid #f0f4fa; font-family: 'Courier New', monospace }
  td:first-child { font-family: inherit; font-weight: 600 }
  tr:last-child td { border-bottom: none }
  tr:hover td { background: #fafcff }
  .episodes { display: flex; gap: 10px; margin-bottom: 16px }
  .ep-box { background: #f8fafc; border-radius: 8px; padding: 10px 14px; flex: 1 }
  .ep-v { font-size: 20px; font-weight: 700; font-family: 'Courier New', monospace }
  .ep-l { font-size: 10px; color: #556070; text-transform: uppercase; letter-spacing: .4px; margin-top: 2px }
  .footer { margin-top: 24px; font-size: 11px; color: #8090a0; text-align: center; border-top: 1px solid #e8edf4; padding-top: 12px }
  @media print {
    body { padding: 10px 14px }
    .no-print { display: none }
    h2 { margin-top: 14px }
  }
</style>
</head>
<body>
  <div class="hdr">
    <div>
      <div class="hdr-title">📊 GlicoLog — Report glicemico</div>
      <div class="hdr-sub">${dateLabel} · ${vals.length} misurazioni totali</div>
    </div>
    <div class="hdr-target">
      Target: ${tMin}–${tMax} mg/dL<br>
      <span style="color:#dc2626">Bassa &lt;${tMin}</span> · <span style="color:#ea580c">Alta &gt;${tMax}</span>
    </div>
  </div>

  <h2>Riepilogo del periodo</h2>
  <div class="stats-grid">
    <div class="stat-box">
      <span class="stat-v" style="color:${avgColor}">${avg || '—'}</span>
      <span class="stat-l">Media mg/dL</span>
    </div>
    <div class="stat-box">
      <span class="stat-v" style="color:${rangeColor}">${vals.length ? inRange + '%' : '—'}</span>
      <span class="stat-l">In range</span>
    </div>
    <div class="stat-box">
      <span class="stat-v" style="color:#ea580c">${peakVal || '—'}</span>
      <span class="stat-l">Picco massimo</span>
    </div>
    <div class="stat-box">
      <span class="stat-v" style="color:#2563eb">${minVal || '—'}</span>
      <span class="stat-l">Minimo</span>
    </div>
  </div>

  <div class="episodes">
    <div class="ep-box"><div class="ep-v" style="color:#dc2626">${lowCnt}</div><div class="ep-l">Episodi ipoglicemia (&lt;${tMin})</div></div>
    <div class="ep-box"><div class="ep-v" style="color:#ea580c">${highCnt}</div><div class="ep-l">Episodi iperglicemia (&gt;${tMax})</div></div>
    <div class="ep-box"><div class="ep-v" style="color:#16a34a">${vals.length ? Math.round(vals.filter(v => v >= tMin && v <= tMax).length) : 0}</div><div class="ep-l">Misurazioni in range</div></div>
  </div>

  <h2>Medie per fascia oraria</h2>
  <div class="slots-grid">${slotsHtml}</div>

  <h2>Andamento glicemico</h2>
  <img src="${chartUrl}" class="chart-img" />
  <div class="chart-legend">
    <span><span class="dot" style="background:#16a34a"></span>In range</span>
    <span><span class="dot" style="background:#ea580c"></span>Elevata (&gt;${tMax})</span>
    <span><span class="dot" style="background:#dc2626"></span>Bassa/Alta</span>
  </div>

  <h2>Dettaglio giornaliero</h2>
  <table>
    <thead>
      <tr>
        <th>Data</th>
        <th>Mis.</th>
        <th>Media</th>
        <th>Min</th>
        <th>Max</th>
        <th>Carbo</th>
        <th>Kcal</th>
        <th>Bolo</th>
        <th>Basale</th>
      </tr>
    </thead>
    <tbody>
      ${tableRows || '<tr><td colspan="9" style="text-align:center;color:#8090a0;padding:20px">Nessun dato registrato nel periodo selezionato</td></tr>'}
    </tbody>
  </table>

  <div class="footer">
    Generato da GlicoLog il ${new Date().toLocaleDateString('it-IT', { dateStyle: 'long' })} · Questo report è a scopo informativo e non sostituisce il parere medico
  </div>

  <script>setTimeout(() => { window.focus(); window.print() }, 600)<\/script>
</body>
</html>`

  const win = window.open('', '_blank', 'width=900,height=700')
  if (win) { win.document.write(html); win.document.close() }
}
