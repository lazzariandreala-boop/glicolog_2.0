import { defineStore } from 'pinia'
import { ref } from 'vue'
import { useStepsStore } from './index.js'

// Import statico — Vite lo bundlerà correttamente nell'APK
// In un browser normale l'import funziona ma il plugin nativo non risponde
import { HealthConnect } from 'capacitor-health-connect'

const HS_KEY  = 'gl_healthsync_hc_v1'
const HC_READ = ['Steps', 'ActiveCaloriesBurned', 'HeartRateSeries']

export const useHealthSyncStore = defineStore('healthsync', () => {
  const available  = ref(false)
  const hasPerms   = ref(false)
  const lastSync   = ref(null)
  const dailyData  = ref({})      // { 'YYYY-MM-DD': { steps, kcal, hr } }
  const syncing    = ref(false)
  const debugInfo  = ref('')      // visibile nell'UI per diagnostica

  // ── Persistenza ──────────────────────────────────────────────
  function load() {
    try {
      const raw = JSON.parse(localStorage.getItem(HS_KEY)) || {}
      if (raw.lastSync) lastSync.value = raw.lastSync
      if (raw.daily)    Object.assign(dailyData.value, raw.daily)
    } catch {}
  }

  function persist() {
    localStorage.setItem(HS_KEY, JSON.stringify({
      lastSync: lastSync.value,
      daily:    dailyData.value,
    }))
  }

  // ── Disponibilità ─────────────────────────────────────────────
  async function checkAvailability() {
    try {
      const r = await HealthConnect.checkAvailability()
      const status = r?.availability ?? 'unknown'
      debugInfo.value = `HC status: ${status}`
      // Available   → pronto
      // NotInstalled → Android 14+ con provider outdated ma funziona lo stesso
      // NotSupported → Android <9, non supportato
      available.value = status === 'Available' || status === 'NotInstalled'
    } catch (e) {
      debugInfo.value = `checkAvailability error: ${e?.message ?? e}`
      available.value = false
    }
    return available.value
  }

  // ── Permessi ──────────────────────────────────────────────────
  async function checkPermissions() {
    try {
      const r = await HealthConnect.checkHealthPermissions({ read: HC_READ, write: [] })
      hasPerms.value  = r?.hasAllPermissions ?? false
      debugInfo.value += ` | perms: ${JSON.stringify(r?.grantedPermissions)}`
    } catch (e) {
      debugInfo.value += ` | checkPerms error: ${e?.message ?? e}`
      hasPerms.value = false
    }
    return hasPerms.value
  }

  async function requestPermissions() {
    try {
      const r = await HealthConnect.requestHealthPermissions({ read: HC_READ, write: [] })
      hasPerms.value  = r?.hasAllPermissions ?? false
      debugInfo.value = `requestPerms: hasAll=${r?.hasAllPermissions} granted=${JSON.stringify(r?.grantedPermissions)}`
      if (!hasPerms.value) {
        throw new Error('Permessi non concessi — vai in Health Connect → App → GlicoLog')
      }
    } catch (e) {
      debugInfo.value = `requestPerms error: ${e?.message ?? e}`
      throw e
    }
    return true
  }

  // ── Sync ──────────────────────────────────────────────────────
  async function sync(days = 30) {
    if (!available.value) throw new Error('Health Connect non disponibile')
    if (!hasPerms.value)  throw new Error('Permessi non concessi — richiedili prima')

    syncing.value = true
    const stepsStore = useStepsStore()

    const endTime   = new Date()
    const startTime = new Date(endTime)
    startTime.setDate(startTime.getDate() - days)
    startTime.setHours(0, 0, 0, 0)

    const tf = { type: 'between', startTime, endTime }

    try {
      const stepsPerDay = {}
      const kcalPerDay  = {}
      const hrPerDay    = {}

      // ── Passi ────────────────────────────────────────────────
      try {
        const { records } = await HealthConnect.readRecords({ type: 'Steps', timeRangeFilter: tf })
        for (const r of records ?? []) {
          const dk = toDateKey(r.startTime)
          stepsPerDay[dk] = (stepsPerDay[dk] || 0) + (r.count || 0)
        }
      } catch (e) { debugInfo.value += ` | steps err: ${e?.message}` }

      // ── Calorie attive ───────────────────────────────────────
      try {
        const { records } = await HealthConnect.readRecords({ type: 'ActiveCaloriesBurned', timeRangeFilter: tf })
        for (const r of records ?? []) {
          const dk = toDateKey(r.startTime)
          kcalPerDay[dk] = (kcalPerDay[dk] || 0) + toKcal(r.energy)
        }
      } catch (e) { debugInfo.value += ` | kcal err: ${e?.message}` }

      // ── Frequenza cardiaca ───────────────────────────────────
      try {
        const { records } = await HealthConnect.readRecords({ type: 'HeartRateSeries', timeRangeFilter: tf })
        const buckets = {}
        for (const r of records ?? []) {
          const dk = toDateKey(r.startTime)
          if (!buckets[dk]) buckets[dk] = []
          for (const s of r.samples ?? []) {
            if (s.beatsPerMinute) buckets[dk].push(s.beatsPerMinute)
          }
        }
        for (const [dk, vals] of Object.entries(buckets)) {
          hrPerDay[dk] = vals.length
            ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length)
            : null
        }
      } catch (e) { debugInfo.value += ` | hr err: ${e?.message}` }

      // ── Aggiorna cache ───────────────────────────────────────
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
        if (steps > 50) stepsStore.setDay(dk, Math.round(steps))
      }

      lastSync.value = Date.now()
      persist()

      return { syncedDays: allDays.size }
    } finally {
      syncing.value = false
    }
  }

  // ── Utility ───────────────────────────────────────────────────
  function toDateKey(d) {
    const dt = d instanceof Date ? d : new Date(d)
    return `${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,'0')}-${String(dt.getDate()).padStart(2,'0')}`
  }

  function toKcal(energy) {
    if (!energy) return 0
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
