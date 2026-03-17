// ── GITHUB GIST SYNC ──────────────────────────────────────────
// Tutti i dati dell'app vengono pacchettizzati in un singolo file
// JSON dentro un Gist privato su GitHub.

const TOKEN_KEY   = 'glicolog_gist_token'
const GIST_ID_KEY = 'glicolog_gist_id'
const SYNC_KEY    = 'glicolog_gist_last_sync'
const GIST_FILE   = 'glicolog_data.json'

export function getToken()   { return localStorage.getItem(TOKEN_KEY)   || '' }
export function getGistId()  { return localStorage.getItem(GIST_ID_KEY) || '' }
export function getLastSync(){ return localStorage.getItem(SYNC_KEY)    || null }

export function setToken(t)  { localStorage.setItem(TOKEN_KEY,   t.trim()) }
export function setGistId(id){ localStorage.setItem(GIST_ID_KEY, id.trim()) }

// Raccoglie tutti i dati da localStorage in un unico oggetto
function collectData() {
  return {
    glicolog_v2:      JSON.parse(localStorage.getItem('glicolog_v2')      || '[]'),
    glicolog_cfg6:    JSON.parse(localStorage.getItem('glicolog_cfg6')    || '{}'),
    gl_steps:         JSON.parse(localStorage.getItem('gl_steps')         || '[]'),
    glicolog_fooddb7: JSON.parse(localStorage.getItem('glicolog_fooddb7') || '{}'),
    exported_at:      new Date().toISOString(),
    version:          '2'
  }
}

// Ripristina i dati nel localStorage
function restoreData(data) {
  if (Array.isArray(data.glicolog_v2))
    localStorage.setItem('glicolog_v2',      JSON.stringify(data.glicolog_v2))
  if (data.glicolog_cfg6 && typeof data.glicolog_cfg6 === 'object')
    localStorage.setItem('glicolog_cfg6',    JSON.stringify(data.glicolog_cfg6))
  if (Array.isArray(data.gl_steps))
    localStorage.setItem('gl_steps',         JSON.stringify(data.gl_steps))
  if (data.glicolog_fooddb7 && typeof data.glicolog_fooddb7 === 'object')
    localStorage.setItem('glicolog_fooddb7', JSON.stringify(data.glicolog_fooddb7))
}

async function ghFetch(url, options = {}) {
  const token = getToken()
  if (!token) throw new Error('Token GitHub mancante — configuralo nel Profilo')
  const res = await fetch(url, {
    ...options,
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type':  'application/json',
      'Accept':        'application/vnd.github.v3+json',
      ...(options.headers || {})
    }
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.message || `Errore HTTP ${res.status}`)
  }
  return res.json()
}

// ── EXPORT ──────────────────────────────────────────────────────
// Crea un nuovo Gist o aggiorna quello esistente
export async function exportToGist() {
  const gistId = getGistId()
  const body = {
    description: 'GlicoLog — backup dati',
    public: false,
    files: { [GIST_FILE]: { content: JSON.stringify(collectData()) } }
  }

  const result = gistId
    ? await ghFetch(`https://api.github.com/gists/${gistId}`, { method: 'PATCH', body: JSON.stringify(body) })
    : await ghFetch('https://api.github.com/gists',           { method: 'POST',  body: JSON.stringify(body) })

  setGistId(result.id)
  localStorage.setItem(SYNC_KEY, new Date().toISOString())
  return result
}

// ── IMPORT ──────────────────────────────────────────────────────
// Scarica il Gist e ripristina i dati; restituisce i dati importati
export async function importFromGist() {
  const gistId = getGistId()
  if (!gistId) throw new Error('Gist ID mancante — esegui prima un export')

  const gist     = await ghFetch(`https://api.github.com/gists/${gistId}`)
  const fileInfo = gist.files?.[GIST_FILE]
  if (!fileInfo) throw new Error(`File ${GIST_FILE} non trovato nel Gist`)

  let content
  if (fileInfo.truncated) {
    // File > 1 MB: il raw_url non è accessibile dal browser (CORS).
    // Soluzione: riesporta dal dispositivo con i dati aggiornati (formato compatto).
    throw new Error('Il backup su Gist supera 1 MB e non può essere scaricato dal browser. Riesporta dal dispositivo che ha i dati più recenti, poi ritenta l\'import.')
  } else {
    content = fileInfo.content
  }

  if (!content) throw new Error(`File ${GIST_FILE} vuoto nel Gist`)

  const data = JSON.parse(content)
  restoreData(data)
  localStorage.setItem(SYNC_KEY, new Date().toISOString())
  return data
}
