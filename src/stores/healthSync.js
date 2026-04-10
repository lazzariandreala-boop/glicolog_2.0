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
      // Health Connect gestisce già la deduplicazione tra sorgenti:
      // restituisce i record dal provider con priorità più alta.
      // Sommiamo direttamente tutti i record per giorno.
      try {
        const { records } = await HealthConnect.readRecords({ type: 'Steps', timeRangeFilter: tf })
        const recs = records ?? []
        debugInfo.value += ` steps:${recs.length}rec`

        // Log struttura primo record per debug
        if (recs.length > 0) {
          const sample = recs[0]
          debugInfo.value += ` [st:${typeof sample.startTime}|cnt:${sample.count ?? sample.steps ?? '?'}]`
        }

        for (const r of recs) {
          const startMs = toMs(r.startTime)
          if (!startMs) continue
          const dk    = toDateKey(startMs)
          // Il plugin può usare r.count oppure r.steps a seconda della versione
          const count = r.count ?? r.steps ?? 0
          stepsPerDay[dk] = (stepsPerDay[dk] || 0) + count
        }

        debugInfo.value += ` stTotal:${Object.values(stepsPerDay).reduce((a,b)=>a+b,0)|0}`
      } catch (e) {
        debugInfo.value += ` stepsErr:${e?.message}`
      }

      // ── Calorie attive ───────────────────────────────────────
      try {
        const { records } = await HealthConnect.readRecords({ type: 'ActiveCaloriesBurned', timeRangeFilter: tf })
        const recs = records ?? []
        debugInfo.value += ` kcal:${recs.length}rec`

        for (const r of recs) {
          const startMs = toMs(r.startTime)
          if (!startMs) continue
          const dk = toDateKey(startMs)
          kcalPerDay[dk] = (kcalPerDay[dk] || 0) + toKcal(r.energy)
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

      // Aggiorna anche lo store passi globale
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

  // Converte il timestamp del plugin in ms epoch.
  // Il plugin può restituire: string ISO, number (ms), number (secondi),
  // oppure oggetto { epochSecond, nano } come fa la SDK Java/Kotlin sottostante.
  function toMs(t) {
    if (!t) return 0
    if (typeof t === 'number') {
      // Se è in secondi (Unix timestamp < anno 2100 in ms ≈ 4e12)
      return t > 1e12 ? t : t * 1000
    }
    if (typeof t === 'string') {
      const ms = Date.parse(t)
      return isFinite(ms) ? ms : 0
    }
    // Oggetto { epochSecond, nano } — formato Kotlin Instant serializzato
    if (typeof t === 'object' && t.epochSecond != null) {
      return t.epochSecond * 1000 + Math.round((t.nano || 0) / 1_000_000)
    }
    return 0
  }

  // 'YYYY-MM-DD' in timezone locale
  function toDateKey(ms) {
    const d = new Date(ms)
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const g = String(d.getDate()).padStart(2, '0')
    return `${y}-${m}-${g}`
  }

  function toKcal(energy) {
    if (!energy) return 0
    // Formato v0.7: { value, unit } oppure { inKilocalories }
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

  load()

  return {
    available, hasPerms, lastSync, dailyData, syncing, debugInfo,
    checkAvailability, checkPermissions, requestPermissions, sync,
  }
})
