// ── CHIAVI LOCALSTORAGE ──
export const KEY     = 'glicolog_v2'
export const CFGKEY  = 'glicolog_cfg6'
export const DBKEY   = 'glicolog_fooddb7'

// Pulizia chiavi obsolete
;['glicolog_fooddb1','glicolog_fooddb2','glicolog_fooddb3',
  'glicolog_fooddb4','glicolog_fooddb5','glicolog_fooddb6']
  .forEach(k => { try { localStorage.removeItem(k) } catch {} })

// ── CONFIG DEFAULT ──
export const DEF = {
  age: 32, weight: 100, height: 174, sex: 'M', activity: 1.375, goal: 'loss',
  targetMin: 100, targetMax: 160, fsi: 30, ic: 7, carbFactor: 15,
  insRapida: 'Humalog', alcMax: 5,
  kcal: 2107, protein: 180, carbs: 130, fat: 96, fiber: 30
}

// ── DATE HELPERS ──
export const DI = ['Dom','Lun','Mar','Mer','Gio','Ven','Sab']
export const MI = ['Gen','Feb','Mar','Apr','Mag','Giu','Lug','Ago','Set','Ott','Nov','Dic']
export const p2 = n => String(n).padStart(2, '0')
export const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2,5)

export function getDK(offset = 0) {
  const d = new Date()
  d.setDate(d.getDate() + offset)
  return `${d.getFullYear()}-${p2(d.getMonth()+1)}-${p2(d.getDate())}`
}

export function getDF(offset = 0) {
  const d = new Date()
  d.setDate(d.getDate() + offset)
  return `${DI[d.getDay()]} ${p2(d.getDate())} ${MI[d.getMonth()]} ${d.getFullYear()}`
}

// ── DATABASE ALCOLICI ──
export const ALCDB = {
  spritz:      { u:1.5, k:160, l:'Spritz',              ico:'🍊', c:15, p:0, g:0, f:0 },
  prosecco:    { u:1.1, k:80,  l:'Prosecco (125ml)',    ico:'🥂', c:3,  p:0.1,g:0,f:0 },
  champagne:   { u:1.1, k:90,  l:'Champagne (125ml)',   ico:'🍾', c:3,  p:0.1,g:0,f:0 },
  negroni:     { u:2.0, k:195, l:'Negroni',             ico:'🍸', c:8,  p:0,  g:0,f:0 },
  campari_soda:{ u:0.8, k:90,  l:'Campari Soda',        ico:'🥤', c:12, p:0,  g:0,f:0 },
  aperol:      { u:0.8, k:105, l:'Aperol Spritz',       ico:'🍊', c:16, p:0,  g:0,f:0 },
  vino_b:      { u:1.0, k:85,  l:'Vino bianco',         ico:'🍷', c:3,  p:0.1,g:0,f:0 },
  vino_r:      { u:1.0, k:90,  l:'Vino rosso',          ico:'🍷', c:2.5,p:0.1,g:0,f:0 },
  vino_ros:    { u:1.0, k:80,  l:'Vino rosato',         ico:'🌸', c:4,  p:0.1,g:0,f:0 },
  birra33:     { u:1.1, k:145, l:'Birra 33cl',          ico:'🍺', c:13, p:1,  g:0,f:0 },
  birra50:     { u:1.7, k:220, l:'Birra 50cl',          ico:'🍺', c:20, p:1.5,g:0,f:0 },
  birra_dark:  { u:1.4, k:180, l:'Birra scura 33cl',    ico:'🍺', c:18, p:1.2,g:0,f:0 },
  birra_artig: { u:1.5, k:195, l:'Birra artig. 33cl',   ico:'🍺', c:16, p:1.5,g:0,f:0 },
  radler:      { u:0.6, k:110, l:'Radler 33cl',         ico:'🍋', c:20, p:0.5,g:0,f:0 },
  mojito:      { u:1.5, k:180, l:'Mojito',              ico:'🍹', c:20, p:0,  g:0,f:0 },
  gin_tonic:   { u:1.5, k:155, l:'Gin Tonic',           ico:'🍸', c:14, p:0,  g:0,f:0 },
  margarita:   { u:1.8, k:200, l:'Margarita',           ico:'🍹', c:15, p:0,  g:0,f:0 },
  hugo:        { u:1.2, k:155, l:'Hugo',                ico:'🌿', c:20, p:0,  g:0,f:0 },
  moscow_mule: { u:1.5, k:185, l:'Moscow Mule',         ico:'🫚', c:22, p:0,  g:0,f:0 },
  rum_cola:    { u:1.5, k:185, l:'Rum & Cola',          ico:'🥤', c:24, p:0,  g:0,f:0 },
  shot_vodka:  { u:1.0, k:65,  l:'Shot Vodka (40ml)',   ico:'🥃', c:0,  p:0,  g:0,f:0 },
  shot_gin:    { u:1.0, k:68,  l:'Shot Gin (40ml)',     ico:'🥃', c:0,  p:0,  g:0,f:0 },
  shot_tequila:{ u:1.0, k:65,  l:'Shot Tequila',        ico:'🥃', c:0,  p:0,  g:0,f:0 },
  shot_whisky: { u:1.0, k:70,  l:'Shot Whisky',         ico:'🥃', c:0,  p:0,  g:0,f:0 },
  shot_amaro:  { u:0.8, k:90,  l:'Shot Amaro',          ico:'🥃', c:8,  p:0,  g:0,f:0 },
  altro:       { u:1.0, k:100, l:'Altro',               ico:'🍶', c:5,  p:0,  g:0,f:0 },
}

// ── GRUPPI ALCOLICI ──
export const ALC_GROUPS = {
  'Aperitivi & Bollicine': ['spritz','prosecco','champagne','negroni','campari_soda','aperol'],
  'Vini':                  ['vino_b','vino_r','vino_ros'],
  'Birre':                 ['birra33','birra50','birra_dark','birra_artig','radler'],
  'Cocktail':              ['mojito','gin_tonic','margarita','hugo','moscow_mule','rum_cola'],
  'Shot':                  ['shot_vodka','shot_gin','shot_tequila','shot_whisky','shot_amaro'],
  'Altro':                 ['altro'],
}

// ── DATABASE APERITIVI ──
export const APERIDB = {
  // Sfizi salati
  taralli:     { l:'Taralli',              ico:'🥨', grp:'Sfizi salati',  def:30,  c100:65, p100:11, g100:16, f100:2   },
  chips:       { l:'Patatine chips',       ico:'🥔', grp:'Sfizi salati',  def:30,  c100:53, p100:6,  g100:30, f100:3   },
  fritte:      { l:'Patatine fritte',      ico:'🍟', grp:'Sfizi salati',  def:100, c100:37, p100:3,  g100:14, f100:3   },
  grissini:    { l:'Grissini',             ico:'🥖', grp:'Sfizi salati',  def:20,  c100:72, p100:11, g100:9,  f100:2.5 },
  crackers:    { l:'Crackers',             ico:'🍘', grp:'Sfizi salati',  def:25,  c100:68, p100:10, g100:13, f100:2   },
  popcorn:     { l:'Popcorn salato',       ico:'🍿', grp:'Sfizi salati',  def:30,  c100:78, p100:9,  g100:4,  f100:10  },
  nachos:      { l:'Nachos/Tortilla',      ico:'🌽', grp:'Sfizi salati',  def:30,  c100:64, p100:7,  g100:22, f100:4   },
  pringles:    { l:'Pringles',             ico:'🍤', grp:'Sfizi salati',  def:30,  c100:55, p100:5,  g100:28, f100:3   },
  salatini:    { l:'Salatini misti',       ico:'🥨', grp:'Sfizi salati',  def:30,  c100:70, p100:10, g100:18, f100:2   },
  // Pane
  bruschetta:  { l:'Bruschetta',           ico:'🍞', grp:'Pane',          def:40,  c100:50, p100:8,  g100:5,  f100:2   },
  focaccia:    { l:'Focaccia',             ico:'🫓', grp:'Pane',          def:50,  c100:47, p100:8,  g100:5,  f100:2   },
  pane_b:      { l:'Pane bianco',          ico:'🍞', grp:'Pane',          def:50,  c100:49, p100:9,  g100:1,  f100:2   },
  pane_int:    { l:'Pane integrale',       ico:'🍞', grp:'Pane',          def:50,  c100:43, p100:9,  g100:2,  f100:7   },
  // Frutta secca
  arachidi:    { l:'Arachidi',             ico:'🥜', grp:'Frutta secca',  def:30,  c100:16, p100:26, g100:49, f100:8   },
  nocciole:    { l:'Nocciole',             ico:'🌰', grp:'Frutta secca',  def:30,  c100:17, p100:15, g100:61, f100:9   },
  pistacchi:   { l:'Pistacchi',            ico:'🫘', grp:'Frutta secca',  def:30,  c100:28, p100:20, g100:45, f100:10  },
  mandorle:    { l:'Mandorle',             ico:'🌰', grp:'Frutta secca',  def:30,  c100:22, p100:21, g100:50, f100:12  },
  noci:        { l:'Noci',                 ico:'🌰', grp:'Frutta secca',  def:30,  c100:14, p100:15, g100:65, f100:7   },
  // Salumi & formaggi
  salame:      { l:'Salame',               ico:'🥩', grp:'Salumi',        def:30,  c100:0.5,p100:22, g100:38, f100:0   },
  bresaola:    { l:'Bresaola',             ico:'🥩', grp:'Salumi',        def:30,  c100:0.5,p100:33, g100:3,  f100:0   },
  prosciutto:  { l:'Prosciutto cotto',     ico:'🥩', grp:'Salumi',        def:30,  c100:1,  p100:19, g100:5,  f100:0   },
  crudo:       { l:'Prosciutto crudo',     ico:'🥩', grp:'Salumi',        def:30,  c100:0.5,p100:27, g100:9,  f100:0   },
  mozzarella:  { l:'Mozzarella',           ico:'🧀', grp:'Salumi',        def:30,  c100:2,  p100:19, g100:16, f100:0   },
  parmigiano:  { l:'Parmigiano/Grana',     ico:'🧀', grp:'Salumi',        def:15,  c100:0,  p100:36, g100:29, f100:0   },
  // Verdure & dip
  olive:       { l:'Olive',                ico:'🫒', grp:'Verdure',       def:50,  c100:3.8,p100:0.8,g100:15, f100:3   },
  hummus:      { l:'Hummus',               ico:'🫘', grp:'Verdure',       def:50,  c100:14, p100:7,  g100:9,  f100:6   },
  guacamole:   { l:'Guacamole',            ico:'🥑', grp:'Verdure',       def:50,  c100:9,  p100:2,  g100:15, f100:7   },
  // Dolci
  cioccolato:  { l:'Cioccolato fondente',  ico:'🍫', grp:'Dolci',         def:20,  c100:46, p100:5,  g100:31, f100:9   },
  biscotti:    { l:'Biscottini/Cantucci',  ico:'🍪', grp:'Dolci',         def:20,  c100:70, p100:7,  g100:13, f100:3   },
}
