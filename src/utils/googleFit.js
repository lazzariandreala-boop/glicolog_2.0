/**
 * Google Fit REST API — OAuth 2.0 PKCE + data fetching
 * Docs: https://developers.google.com/fit/rest/v1/reference
 *
 * Flusso: PKCE (no server needed — client_secret è non-segreto per client pubblici web)
 * Scopes richiesti: fitness.activity.read, fitness.body.read, fitness.heart_rate.read
 */

const OAUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth'
const TOKEN_URL = 'https://oauth2.googleapis.com/token'
const FIT_BASE  = 'https://www.googleapis.com/fitness/v1/users/me'

const SCOPES = [
  'https://www.googleapis.com/auth/fitness.activity.read',
  'https://www.googleapis.com/auth/fitness.body.read',
  'https://www.googleapis.com/auth/fitness.heart_rate.read',
].join(' ')

// ── PKCE helpers ─────────────────────────────────────────────────
function randomBase64url(len = 64) {
  const arr = new Uint8Array(len)
  crypto.getRandomValues(arr)
  return btoa(String.fromCharCode(...arr))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
}

async function sha256base64url(str) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str))
  return btoa(String.fromCharCode(...new Uint8Array(buf)))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
}

export function getRedirectUri() {
  return window.location.origin + window.location.pathname.replace(/\/$/, '')
}

// ── OAuth flow ────────────────────────────────────────────────────
export async function startOAuthFlow(clientId) {
  const verifier  = randomBase64url(64)
  const challenge = await sha256base64url(verifier)
  const state     = randomBase64url(16)
  sessionStorage.setItem('gfit_verifier', verifier)
  sessionStorage.setItem('gfit_state',    state)

  const params = new URLSearchParams({
    client_id:             clientId,
    redirect_uri:          getRedirectUri(),
    response_type:         'code',
    scope:                 SCOPES,
    code_challenge:        challenge,
    code_challenge_method: 'S256',
    access_type:           'offline',
    prompt:                'consent',
    state,
  })
  window.location.href = `${OAUTH_URL}?${params}`
}

export async function handleOAuthCallback(code, clientId, clientSecret) {
  const verifier = sessionStorage.getItem('gfit_verifier')
  if (!verifier) throw new Error('Sessione PKCE scaduta — riprova la connessione')

  const resp = await fetch(TOKEN_URL, {
    method:  'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body:    new URLSearchParams({
      code,
      client_id:     clientId,
      client_secret: clientSecret,
      redirect_uri:  getRedirectUri(),
      grant_type:    'authorization_code',
      code_verifier: verifier,
    }),
  })
  if (!resp.ok) {
    const err = await resp.json().catch(() => ({}))
    throw new Error(err.error_description || `Token exchange fallito (${resp.status})`)
  }
  sessionStorage.removeItem('gfit_verifier')
  sessionStorage.removeItem('gfit_state')
  return await resp.json() // { access_token, refresh_token, expires_in, token_type }
}

export async function refreshAccessToken(clientId, clientSecret, refreshTok) {
  const resp = await fetch(TOKEN_URL, {
    method:  'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body:    new URLSearchParams({
      refresh_token: refreshTok,
      client_id:     clientId,
      client_secret: clientSecret,
      grant_type:    'refresh_token',
    }),
  })
  if (!resp.ok) {
    const err = await resp.json().catch(() => ({}))
    throw new Error(err.error_description || `Refresh fallito (${resp.status})`)
  }
  return await resp.json()
}

// ── Data fetching ─────────────────────────────────────────────────
async function aggregate(token, dataTypeName, startMs, endMs) {
  const resp = await fetch(`${FIT_BASE}/dataset:aggregate`, {
    method:  'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body:    JSON.stringify({
      aggregateBy:  [{ dataTypeName }],
      bucketByTime: { durationMillis: 86400000 }, // 1 bucket = 1 giorno
      startTimeMillis: String(startMs),
      endTimeMillis:   String(endMs),
    }),
  })
  if (!resp.ok) {
    const txt = await resp.text().catch(() => resp.status)
    throw new Error(`Fit API [${dataTypeName}]: ${resp.status} — ${txt}`)
  }
  return (await resp.json()).bucket || []
}

function parseBuckets(buckets) {
  const out = {}
  buckets.forEach(b => {
    const d   = new Date(parseInt(b.startTimeMillis))
    const dk  = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
    let val   = 0
    b.dataset?.forEach(ds =>
      ds.point?.forEach(p => {
        const v = p.value?.[0]
        val += v?.intVal ?? v?.fpVal ?? 0
      })
    )
    out[dk] = (out[dk] || 0) + val
  })
  return out
}

// Map Google Fit activity type ID → sport key "Nome|MET"
// Ref: https://developers.google.com/fit/rest/v1/reference/activity-types
const ACTIVITY_MAP = {
  1:   'Aerobica|6',
  7:   'Camminata veloce|4',
  8:   'Ciclismo moderato|8',
  9:   'Corsa|9',
  10:  'Camminata veloce|4',
  17:  'Pesi moderati|4',
  20:  'CrossFit|8',
  21:  'Danza|5',
  23:  'Calcio|7',
  37:  'Jogging|7',
  41:  'Mountain bike|8.5',
  45:  'Nuoto stile libero|8',
  62:  'Tennis|7',
  63:  'Trekking|5.5',
  64:  'Camminata veloce|4',
  74:  'Camminata veloce|4',
  75:  'Yoga|2.5',
  79:  'Pilates|3',
  80:  'Yoga|2.5',
  82:  'Camminata veloce|4',
  84:  'Ciclismo leggero|4',
  93:  'Corsa veloce|11',
  97:  'Pesi intensi|6',
  103: 'Spinning|8.5',
  108: 'Zumba|6',
}

function mapActivity(typeId) {
  const entry = ACTIVITY_MAP[typeId]
  if (entry) return { name: entry.split('|')[0], sportKey: entry }
  return { name: `Attività sportiva`, sportKey: 'Altro|4' }
}

export async function fetchSessions(token, startMs, endMs) {
  const params = new URLSearchParams({
    startTime:      new Date(startMs).toISOString(),
    endTime:        new Date(endMs).toISOString(),
    includeDeleted: 'false',
  })
  const resp = await fetch(`${FIT_BASE}/sessions?${params}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!resp.ok) throw new Error(`Sessions API: ${resp.status}`)
  const { session = [] } = await resp.json()

  return session.map(s => {
    const { name, sportKey } = mapActivity(s.activityType)
    const sMs = parseInt(s.startTimeMillis)
    const eMs = parseInt(s.endTimeMillis)
    return {
      gfitId:   s.id,
      name:     s.name?.trim() || name,
      sportKey,
      startMs:  sMs,
      endMs:    eMs,
      duration: Math.max(1, Math.round((eMs - sMs) / 60000)),
    }
  }).filter(s => s.duration >= 1) // ignora sessioni da 0 min
}

export async function fetchAllData(token, startMs, endMs) {
  const [stepsBuckets, calBuckets, hrBuckets, sessions] = await Promise.all([
    aggregate(token, 'com.google.step_count.delta',  startMs, endMs),
    aggregate(token, 'com.google.calories.expended', startMs, endMs),
    aggregate(token, 'com.google.heart_rate.bpm',    startMs, endMs),
    fetchSessions(token, startMs, endMs),
  ])
  return {
    stepsPerDay: parseBuckets(stepsBuckets),
    kcalPerDay:  parseBuckets(calBuckets),
    hrPerDay:    parseBuckets(hrBuckets),
    sessions,
  }
}
