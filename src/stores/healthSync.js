import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import {
  startOAuthFlow,
  handleOAuthCallback,
  refreshAccessToken,
  fetchAllData,
} from '@/utils/googleFit.js'
import { useEntriesStore, useStepsStore, useConfigStore } from './index.js'

const HS_KEY = 'gl_healthsync_v1'

// Credenziali di default da variabili d'ambiente (file .env, mai committato)
const ENV_CLIENT_ID     = import.meta.env.VITE_GFIT_CLIENT_ID     || ''
const ENV_CLIENT_SECRET = import.meta.env.VITE_GFIT_CLIENT_SECRET || ''

export const useHealthSyncStore = defineStore('healthsync', () => {
  const _cfg = ref({
    clientId:     ENV_CLIENT_ID,
    clientSecret: ENV_CLIENT_SECRET,
    accessToken:  null,
    refreshToken: null,
    tokenExpiry:  null,
    lastSync:     null,
  })

  // Cache dati giornalieri: { 'YYYY-MM-DD': { steps, kcal, hr } }
  const dailyData = ref({})

  // ── Persistenza ─────────────────────────────────────────────────
  function load() {
    try {
      const raw = JSON.parse(localStorage.getItem(HS_KEY)) || {}
      if (raw.cfg) {
        Object.assign(_cfg.value, raw.cfg)
        // Se le credenziali non erano salvate, usa quelle dell'env
        if (!_cfg.value.clientId)     _cfg.value.clientId     = ENV_CLIENT_ID
        if (!_cfg.value.clientSecret) _cfg.value.clientSecret = ENV_CLIENT_SECRET
      }
      if (raw.daily) Object.assign(dailyData.value, raw.daily)
    } catch {}
  }

  function persist() {
    localStorage.setItem(HS_KEY, JSON.stringify({ cfg: _cfg.value, daily: dailyData.value }))
  }

  // ── Computed ─────────────────────────────────────────────────────
  const isConnected  = computed(() => !!_cfg.value.refreshToken)
  const isConfigured = computed(() => !!_cfg.value.clientId && !!_cfg.value.clientSecret)
  const lastSync     = computed(() => _cfg.value.lastSync)

  // ── Config ───────────────────────────────────────────────────────
  function saveConfig(clientId, clientSecret) {
    _cfg.value.clientId     = clientId.trim()
    _cfg.value.clientSecret = clientSecret.trim()
    persist()
  }

  // ── Token management ─────────────────────────────────────────────
  async function getValidToken() {
    if (!_cfg.value.refreshToken) throw new Error('Non autenticato — connetti prima Google Fit')
    const now = Date.now()
    // Valido se scade tra più di 5 minuti
    if (_cfg.value.accessToken && _cfg.value.tokenExpiry && now < _cfg.value.tokenExpiry - 300_000) {
      return _cfg.value.accessToken
    }
    const tokens = await refreshAccessToken(_cfg.value.clientId, _cfg.value.clientSecret, _cfg.value.refreshToken)
    _cfg.value.accessToken = tokens.access_token
    _cfg.value.tokenExpiry = Date.now() + tokens.expires_in * 1000
    persist()
    return _cfg.value.accessToken
  }

  // ── OAuth ────────────────────────────────────────────────────────
  async function connect() {
    if (!isConfigured.value) throw new Error('Inserisci prima Client ID e Client Secret')
    await startOAuthFlow(_cfg.value.clientId)
    // → redirect a Google, il callback viene gestito in App.vue onMounted
  }

  async function handleCallback(code) {
    const tokens = await handleOAuthCallback(code, _cfg.value.clientId, _cfg.value.clientSecret)
    _cfg.value.accessToken  = tokens.access_token
    _cfg.value.refreshToken = tokens.refresh_token || _cfg.value.refreshToken
    _cfg.value.tokenExpiry  = Date.now() + tokens.expires_in * 1000
    persist()
  }

  // ── Sync ─────────────────────────────────────────────────────────
  async function sync(days = 30) {
    const token        = await getValidToken()
    const entriesStore = useEntriesStore()
    const stepsStore   = useStepsStore()
    const cfgStore     = useConfigStore()

    const endMs   = Date.now()
    const startMs = endMs - days * 86_400_000

    const { stepsPerDay, kcalPerDay, hrPerDay, sessions } = await fetchAllData(token, startMs, endMs)

    // Aggiorna cache giornaliera
    const allDays = new Set([
      ...Object.keys(stepsPerDay),
      ...Object.keys(kcalPerDay),
      ...Object.keys(hrPerDay),
    ])
    allDays.forEach(dk => {
      dailyData.value[dk] = {
        steps: Math.round(stepsPerDay[dk] || 0),
        kcal:  Math.round(kcalPerDay[dk]  || 0),
        hr:    hrPerDay[dk] ? Math.round(hrPerDay[dk]) : null,
      }
    })

    // Aggiorna i passi nel stepsStore (visibili in SummaryBoxes)
    Object.entries(stepsPerDay).forEach(([dk, steps]) => {
      if (steps > 50) stepsStore.setDay(dk, Math.round(steps))
    })

    // Importa sessioni sport non ancora presenti (deduplicazione via gfitId)
    const existingIds = new Set(
      entriesStore.entries
        .filter(e => e.type === 'sport' && e.gfitId)
        .map(e => e.gfitId)
    )
    const weight  = cfgStore.cfg.weight || 80
    let newCount  = 0
    sessions.forEach(s => {
      if (existingIds.has(s.gfitId)) return
      const met  = parseFloat(s.sportKey.split('|')[1]) || 4
      const kcal = Math.round(met * weight * s.duration / 60)
      entriesStore.add({
        type:     'sport',
        sport:    s.name,
        sportKey: s.sportKey,
        duration: s.duration,
        kcal,
        glic:     null,
        trend:    '→',
        timing:   'after',
        note:     '📱 Google Fit',
        ts:       s.startMs,
        gfitId:   s.gfitId,
      })
      newCount++
    })

    _cfg.value.lastSync = Date.now()
    persist()

    return { syncedDays: allDays.size, newSessions: newCount }
  }

  // ── Disconnect ───────────────────────────────────────────────────
  function disconnect() {
    _cfg.value.accessToken  = null
    _cfg.value.refreshToken = null
    _cfg.value.tokenExpiry  = null
    _cfg.value.lastSync     = null
    persist()
  }

  load()

  return {
    cfg: _cfg,
    dailyData,
    isConnected,
    isConfigured,
    lastSync,
    saveConfig,
    connect,
    handleCallback,
    sync,
    disconnect,
  }
})
