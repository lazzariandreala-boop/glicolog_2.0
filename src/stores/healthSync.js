import { defineStore } from 'pinia'
import { ref } from 'vue'
import { useStepsStore } from './index.js'
import { HealthConnect } from 'capacitor-health-connect'

const HS_KEY  = 'gl_healthsync_hc_v1'
const HC_READ = ['Steps', 'ActiveCaloriesBurned', 'HeartRateSeries']

export const useHealthSyncStore = defineStore('healthsync', () => {
  const available  = ref(false)
  const hasPerms   = ref(false)
  const lastSync   = ref(null)
  const dailyData  = ref({})
  const syncing    = ref(false)
  const debugInfo  = ref('')

  // ── Persistenza ──────────────────────────────────────────────
  function load() {
    try {
      const raw = JSON.parse(localStorage.getItem(HS_KEY)) || {}
      if (raw.lastSync) lastSync.value = raw.lastSync
      if (raw.daily)    Object.assign(dailyData.value, raw.daily)
    } catch {}
  }
  function persist() {
    localStorage.setItem(HS_KEY, JSON.stringify({ lastSync: lastSync.value, daily: dailyData.value }))
  }

  // ── Disponibilità / Permessi ──────────────────────────────────
  async function checkAvailability() {
    try {
      const r = await HealthConnect.checkAvailability()
      const s = r?.availability ?? 'unknown'
      debugInfo.value = `HC: ${s}`
      available.value = s === 'Available' || s === 'NotInstalled'
    } catch (e) {
      debugInfo.value = `avail error: ${e?.message ?? e}`
      available.value = false
    }
    return available.value
  }

  async function checkPermissions() {
    try {
      const r = await HealthConnect.checkHealthPermissions({ read: HC_READ, write: [] })
      hasPerms.value = r?.hasAllPermissions ?? false
      debugInfo.value += ` perms:${hasPerms.value}`
    } catch (e) {
      debugInfo.value += ` permErr:${e?.message}`
      hasPerms.value = false
    }
    return hasPerms.value
  }

  async function requestPermissions() {
    try {
      const r = await HealthConnect.requestHealthPermissions({ read: HC_READ, write: [] })
      hasPerms.value = r?.hasAllPermissions ?? false
      debugInfo.value = `reqPerms: ${JSON.stringify(r?.grantedPermissions)}`
      if (!hasPerms.value) throw new Error('Permessi non concessi — vai in Health Connect → App → GlicoLog')
    } catch (e) {
      debugInfo.value = `reqPermErr: ${e?.message}`
      throw e
    }
    return true
  }

  // ── Sync ──────────────────────────────────────────────────────
  async function sync(days = 30) {
    if (!available.value) throw new Error('Health Connect non disponibile')
    if (!hasPerms.value)  throw new Error('Permessi non concessi')

    syncing.value = true
    debugInfo.value = `Sync ${days}g...`
    const stepsStore = useStepsStore()

    const endTime   = new Date().toISOString()
    const _start    = new Date()
    _start.setDate(_start.getDate() - days)
    _start.setHours(0, 0, 0, 0)
    const startTime = _start.toISOString()
    const tf = { type: 'between', startTime, endTime }

    try {
      const stepsPerDay = {}
      const kcalPerDay  = {}
      const hrPerDay    = {}

      // ── Passi ────────────────────────────────────────────────
      // HC restituisce record da TUTTE le sorgenti (pedometro sistema,
      // Google Fit, Samsung Health, ecc.) che spesso si sovrappongono.
      // Usiamo deduplicazione per intervalli: ordiniamo per durata
      // DECRESCENTE così i record lunghi (sintesi giornaliera) coprono
      // per primi e quelli corti (campionamenti al minuto) non si sommano.
      try {
        const { records } = await HealthConnect.readRecords({ type: 'Steps', timeRangeFilter: tf })
        const recs = records ?? []
        debugInfo.value += ` steps:${recs.length}rec`

        // Mostra struttura raw del primo record per diagnostica
        if (recs.length > 0) {
          const s = recs[0]
          debugInfo.value += ` [st:${JSON.stringify(s.startTime).slice(0,20)} cnt:${s.count ?? s.steps ?? '?'}]`
        }

        // Raggruppa per giorno
        const byDay = {}
        for (const r of recs) {
          const startMs = toMs(r.startTime)
          const endMs   = toMs(r.endTime) || (startMs + 60_000)
          if (!startMs || endMs <= startMs) continue
          const dk = toDateKey(startMs)
          if (!byDay[dk]) byDay[dk] = []
          byDay[dk].push({ start: startMs, end: endMs, count: r.count ?? r.steps ?? 0 })
        }

        for (const [dk, dayRecs] of Object.entries(byDay)) {
          stepsPerDay[dk] = sumNonOverlapping(dayRecs)
        }

        const tot = Object.values(stepsPerDay).reduce((a, b) => a + b, 0)
        debugInfo.value += ` tot:${Math.round(tot)}`
      } catch (e) {
        debugInfo.value += ` stepsErr:${e?.message}`
      }

      // ── Calorie attive ───────────────────────────────────────
      try {
        const { records } = await HealthConnect.readRecords({ type: 'ActiveCaloriesBurned', timeRangeFilter: tf })
        const byDay = {}
        for (const r of records ?? []) {
          const startMs = toMs(r.startTime)
          const endMs   = toMs(r.endTime) || (startMs + 60_000)
          if (!startMs || endMs <= startMs) continue
          const dk = toDateKey(startMs)
          if (!byDay[dk]) byDay[dk] = []
          byDay[dk].push({ start: startMs, end: endMs, count: toKcal(r.energy) })
        }
        for (const [dk, dayRecs] of Object.entries(byDay)) {
          kcalPerDay[dk] = sumNonOverlapping(dayRecs)
        }
      } catch (e) {
        debugInfo.value += ` kcalErr:${e?.message}`
      }

      // ── Frequenza cardiaca ───────────────────────────────────
      try {
        const { records } = await HealthConnect.readRecords({ type: 'HeartRateSeries', timeRangeFilter: tf })
        const buckets = {}
        for (const r of records ?? []) {
          const startMs = toMs(r.startTime)
          if (!startMs) continue
          const dk = toDateKey(startMs)
          if (!buckets[dk]) buckets[dk] = []
          for (const s of r.samples ?? []) {
            const bpm = s.beatsPerMinute ?? s.bpm ?? 0
            if (bpm > 20 && bpm < 250) buckets[dk].push(bpm)
          }
        }
        for (const [dk, vals] of Object.entries(buckets)) {
          hrPerDay[dk] = vals.length
            ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length)
            : null
        }
      } catch (e) {
        debugInfo.value += ` hrErr:${e?.message}`
      }

      // ── Aggiorna store ───────────────────────────────────────
      const allDays = new Set([
        ...Object.keys(stepsPerDay),
        ...Object.keys(kcalPerDay),
        ...Object.keys(hrPerDay),
      ])

      for (const dk of allDays) {
        dailyData.value[dk] = {
          steps: Math.round(stepsPerDay[dk] || 0),
          kcal:  Math.round(kcalPerDay[dk]  || 0),
          hr:    hrPerDay[dk] ?? null,
        }
      }

      for (const [dk, steps] of Object.entries(stepsPerDay)) {
        if (steps > 10) stepsStore.setDay(dk, Math.round(steps))
      }

      debugInfo.value += ` → ${allDays.size}gg OK`
      lastSync.value = Date.now()
      persist()
      return { syncedDays: allDays.size }
    } finally {
      syncing.value = false
    }
  }

  // ── Utility ───────────────────────────────────────────────────

  // Converte timestamp del plugin in ms epoch.
  // Il plugin può restituire: string ISO, number ms, number secondi,
  // oppure oggetto Kotlin Instant { epochSecond, nano }.
  function toMs(t) {
    if (!t) return 0
    if (typeof t === 'number') {
      return t > 1e12 ? t : t * 1000  // secondi vs millisecondi
    }
    if (typeof t === 'string') {
      const ms = Date.parse(t)
      return isFinite(ms) ? ms : 0
    }
    if (typeof t === 'object' && t.epochSecond != null) {
      return t.epochSecond * 1000 + Math.round((t.nano || 0) / 1_000_000)
    }
    return 0
  }

  // 'YYYY-MM-DD' in timezone locale del dispositivo
  function toDateKey(ms) {
    const d = new Date(ms)
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const g = String(d.getDate()).padStart(2, '0')
    return `${y}-${m}-${g}`
  }

  function toKcal(energy) {
    if (!energy) return 0
    if (energy.inKilocalories != null) return energy.inKilocalories
    if (energy.value == null) return 0
    switch (energy.unit) {
      case 'kilocalories': return energy.value
      case 'calories':     return energy.value / 1000
      case 'kilojoules':   return energy.value / 4.184
      case 'joules':       return energy.value / 4184
      default:             return energy.value
    }
  }

  // Somma intervalli {start, end, count} senza doppio conteggio.
  //
  // ORDINAMENTO PER DURATA DECRESCENTE: i record lunghi (es. sintesi
  // giornaliera di Google Fit) coprono per primi l'intero arco temporale.
  // I record corti (es. campionamenti al minuto del pedometro) trovano
  // tutto già coperto e contribuiscono con 0 → nessun doppio conteggio.
  //
  // Se invece i record sono tutti della stessa granularità (es. tutti da
  // 1 minuto, senza overlap) la proporzione uncovered/total = 1 e somma
  // correttamente tutti i passi.
  function sumNonOverlapping(recs) {
    if (!recs.length) return 0

    // Ordina per durata DECRESCENTE (record più lunghi prima)
    recs.sort((a, b) => (b.end - b.start) - (a.end - a.start))

    let total = 0
    const covered = []   // lista di [start, end] già coperti (unione)

    for (const { start, end, count } of recs) {
      if (start >= end) continue

      // Calcola i ms di [start, end] NON ancora coperti
      let uncoveredMs = 0
      let cur = start
      for (const [cs, ce] of covered) {
        if (ce <= cur) continue
        if (cs >= end) break
        if (cs > cur) uncoveredMs += cs - cur
        cur = Math.max(cur, ce)
      }
      if (cur < end) uncoveredMs += end - cur

      const totalMs = end - start
      if (totalMs > 0 && uncoveredMs > 0) {
        total += count * (uncoveredMs / totalMs)
      }

      // Aggiunge [start, end] alla lista dei coperti (merge)
      addInterval(covered, start, end)
    }

    return Math.round(total)
  }

  function addInterval(covered, s, e) {
    let i = 0
    while (i < covered.length && covered[i][1] < s) i++
    const j = i
    while (i < covered.length && covered[i][0] <= e) i++
    if (j === i) {
      covered.splice(j, 0, [s, e])
    } else {
      const newStart = Math.min(covered[j][0], s)
      const newEnd   = Math.max(covered[i - 1][1], e)
      covered.splice(j, i - j, [newStart, newEnd])
    }
  }

  load()

  return {
    available, hasPerms, lastSync, dailyData, syncing, debugInfo,
    checkAvailability, checkPermissions, requestPermissions, sync,
  }
})
