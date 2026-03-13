import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { KEY, CFGKEY, DBKEY, DEF, uid, getDK, p2 } from '@/data/constants.js'

// ── ENTRIES STORE ──────────────────────────────────────────────
export const useEntriesStore = defineStore('entries', () => {
  const _entries = ref([])

  function load() {
    try { _entries.value = JSON.parse(localStorage.getItem(KEY)) || [] }
    catch { _entries.value = [] }
  }
  function save() { localStorage.setItem(KEY, JSON.stringify(_entries.value)) }

  function add(entry) {
    _entries.value.push({ id: uid(), ...entry })
    save()
  }

  function update(id, patch) {
    const i = _entries.value.findIndex(e => e.id === id)
    if (i > -1) { _entries.value[i] = { ..._entries.value[i], ...patch }; save() }
  }

  function remove(id) {
    _entries.value = _entries.value.filter(e => e.id !== id)
    save()
  }

  function forDay(dateKey) {
    return _entries.value
      .filter(e => {
        const d = new Date(e.ts)
        return `${d.getFullYear()}-${p2(d.getMonth()+1)}-${p2(d.getDate())}` === dateKey
      })
      .sort((a, b) => b.ts - a.ts)
  }

  function weekAlcUnits() {
    const now = new Date()
    const dow = now.getDay()
    const monday = new Date(now)
    monday.setDate(now.getDate() - (dow === 0 ? 6 : dow - 1))
    monday.setHours(0, 0, 0, 0)
    return _entries.value
      .filter(e => e.type === 'alcool' && e.ts >= monday.getTime())
      .reduce((sum, e) => sum + (e.units || 0), 0)
  }

  load()
  return { entries: _entries, load, save, add, update, remove, forDay, weekAlcUnits }
})

// ── CONFIG STORE ───────────────────────────────────────────────
export const useConfigStore = defineStore('config', () => {
  const cfg = ref({ ...DEF })

  function load() {
    try { cfg.value = Object.assign({}, DEF, JSON.parse(localStorage.getItem(CFGKEY))) }
    catch { cfg.value = { ...DEF } }
  }
  function save(data) { cfg.value = data; localStorage.setItem(CFGKEY, JSON.stringify(data)) }

  load()
  return { cfg, load, save }
})

// ── FOOD DB STORE ──────────────────────────────────────────────
export const useFoodDbStore = defineStore('fooddb', () => {
  // Il DB principale viene costruito dinamicamente da CREA_DB + FOODDB0 + custom
  function getFullDb() {
    const massive = (typeof window !== 'undefined' && window.CLAUDE_DB) ? window.CLAUDE_DB : {}
    const crea    = (typeof window !== 'undefined' && window.CREA_DB)   ? window.CREA_DB   : {}
    const base    = (typeof window !== 'undefined' && window.FOODDB0)   ? window.FOODDB0   : {}
    try {
      const custom = JSON.parse(localStorage.getItem(DBKEY)) || {}
      return Object.assign({}, massive, crea, base, custom)
    } catch { return Object.assign({}, massive, crea, base) }
  }

  function learn(name, mac) {
    if (!name) return
    const db = getFullDb()
    db[name.toLowerCase()] = {
      c: mac.c || 0, p: mac.p || 0, g: mac.g || 0, f: mac.f || 0,
      k: Math.round((mac.c||0)*4 + (mac.p||0)*4 + (mac.g||0)*9)
    }
    // salva solo il delta custom
    const custom = {}
    Object.keys(db).forEach(k => { custom[k] = db[k] })
    localStorage.setItem(DBKEY, JSON.stringify(custom))
  }

  function search(query, limit = 8) {
    const db = getFullDb()
    const q = query.toLowerCase().trim()
    if (!q) return []
    const tokens = q.split(/\s+/).filter(t => t.length >= 2)
    return Object.keys(db)
      .filter(k => tokens.every(t => k.toLowerCase().includes(t)))
      .slice(0, limit)
      .map(k => ({ name: k, mac: db[k] }))
  }

  function get(name) {
    return getFullDb()[name.toLowerCase()] || null
  }

  return { getFullDb, search, learn, get }
})

// ── STEPS STORE ────────────────────────────────────────────────
const STEPS_KEY = 'gl_steps'
export const useStepsStore = defineStore('steps', () => {
  const _steps = ref([])

  function load() {
    try { _steps.value = JSON.parse(localStorage.getItem(STEPS_KEY)) || [] }
    catch { _steps.value = [] }
  }
  function save() { localStorage.setItem(STEPS_KEY, JSON.stringify(_steps.value)) }

  function forDay(dateKey) {
    return _steps.value.find(s => s.date === dateKey) || null
  }

  function setDay(dateKey, steps, stride = 75) {
    const i = _steps.value.findIndex(s => s.date === dateKey)
    const entry = { date: dateKey, steps, stride, ts: Date.now() }
    if (i >= 0) _steps.value[i] = entry
    else _steps.value.push(entry)
    save()
  }

  load()
  return { steps: _steps, load, save, forDay, setDay }
})
