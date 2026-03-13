<template>
  <!-- DELETE CONFIRM -->
  <div class="del-confirm" :class="{ on: app.showDeleteConfirm }">
    <div class="del-confirm-card">
      <div class="del-confirm-ico">🗑️</div>
      <div class="del-confirm-msg">{{ app.deleteMsg }}</div>
      <div class="del-confirm-btns">
        <button class="del-btn-yes" @click="confirmDel">Elimina</button>
        <button class="del-btn-no" @click="app.cancelDelete()">Annulla</button>
      </div>
    </div>
  </div>

  <!-- STEPS MODAL -->
  <div class="steps-edit" :class="{ on: app.showStepsModal }" @click.self="app.showStepsModal = false">
    <div class="steps-card">
      <div class="ph"></div>
      <div class="pt">👟 Passi</div>
      <div class="fr">
        <span class="fl">Passi del giorno</span>
        <input class="fi big" type="number" inputmode="numeric" v-model.number="stepsInput" placeholder="0" @input="updateKmPreview" />
      </div>
      <div class="fr">
        <span class="fl">Passo medio (cm)</span>
        <input class="fi" type="number" inputmode="numeric" v-model.number="strideInput" placeholder="75" @input="updateKmPreview" />
      </div>
      <div v-if="kmPreview" class="fr" style="font-size:.8rem;color:var(--g)">{{ kmPreview }}</div>
      <button class="bsave" @click="saveSteps">💾 Salva</button>
      <button class="bdel" @click="app.showStepsModal = false">Annulla</button>
    </div>
  </div>

  <!-- PDF / EXPORT MODAL -->
  <div class="pdf-modal-bg" :class="{ on: app.showPdfModal }" @click.self="app.showPdfModal = false">
    <div class="pdf-modal">
      <div class="pdf-modal-title">📄 Esporta dati</div>
      <button class="pdf-opt-btn" @click="exportJson">
        <span class="pdf-opt-icon">💾</span>
        <div>
          <div class="pdf-opt-title">Scarica JSON</div>
          <div class="pdf-opt-sub">Backup completo di tutte le voci</div>
        </div>
      </button>
      <button class="pdf-opt-btn" @click="printView">
        <span class="pdf-opt-icon">🖨️</span>
        <div>
          <div class="pdf-opt-title">Stampa / Salva PDF</div>
          <div class="pdf-opt-sub">Apre la finestra di stampa del browser</div>
        </div>
      </button>
      <button class="bdel" style="margin-top:8px" @click="app.showPdfModal = false">Chiudi</button>
    </div>
  </div>

  <!-- WATER QUICK MODAL -->
  <div id="waterQuickModal" :class="{ on: app.showWaterModal }" @click.self="app.showWaterModal = false">
    <div class="wq-card">
      <div class="wq-title">💧 Aggiungi acqua</div>
      <div class="wq-grid">
        <button v-for="opt in waterOpts" :key="opt.ml" class="wq-btn" @click="addWater(opt.ml)">
          <div class="wq-btn-val">{{ opt.label }}</div>
          <div class="wq-btn-lbl">{{ opt.desc }}</div>
        </button>
      </div>
      <div style="display:flex;gap:8px;align-items:center;margin-top:4px">
        <input class="fi" type="number" inputmode="numeric" v-model.number="customWater" placeholder="ml personalizzato" />
        <button class="time-now-btn" @click="addWater(customWater)">+ Aggiungi</button>
      </div>
    </div>
  </div>

  <!-- GLIC ALERT MODAL (hypo / hyper / insulin prompt) -->
  <div class="glic-alert-bg" :class="{ on: app.showGlicAlert }" v-if="app.glicAlertData">
    <div class="glic-alert-card">
      <div class="glic-alert-icon">{{ app.glicAlertData.type === 'low' ? '🍬' : '💉' }}</div>
      <div class="glic-alert-title">{{ app.glicAlertData.title }}</div>
      <div class="glic-alert-msg">{{ app.glicAlertData.msg }}</div>
      <div v-if="app.glicAlertData.type === 'high' || app.glicAlertData.type === 'insulin_prompt'" class="glic-alert-units">
        <span class="glic-alert-units-val">{{ app.glicAlertData.suggestedUnits }}U</span>
        <span class="glic-alert-units-lbl">{{ app.glicAlertData.type === 'high' ? 'insulina di correzione' : 'bolo suggerito' }}</span>
      </div>
      <!-- LOW: food chip selector -->
      <div v-if="app.glicAlertData.type === 'low'">
        <div class="glic-alert-carbs-lbl">Cosa vuoi assumere? (~15g carbo)</div>
        <div class="glic-hypo-grid">
          <button v-for="f in hypoFoods" :key="f.name" class="glic-hypo-chip" @click="doFoodCorrection(f)">
            <span class="glic-hypo-ico">{{ f.ico }}</span>
            <span class="glic-hypo-name">{{ f.label }}</span>
            <span class="glic-hypo-qty">{{ f.qtyLabel }}</span>
          </button>
        </div>
      </div>
      <div class="glic-alert-btns">
        <button v-if="app.glicAlertData.type === 'high'" class="glic-alert-yes" @click="doInsulinCorrection">💉 Fai correzione</button>
        <button v-if="app.glicAlertData.type === 'insulin_prompt'" class="glic-alert-yes" @click="doInsulinBolo">💉 Fai bolo</button>
        <button v-if="app.glicAlertData.type === 'low'" class="glic-alert-yes glic-alert-low" @click="doFoodCorrection(null)">🍬 Apri correzione</button>
        <button class="glic-alert-no" @click="app.closeGlicAlert()">Ignora</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { useAppStore } from '@/stores/app.js'
import { useEntriesStore, useStepsStore } from '@/stores/index.js'
import { getDK } from '@/data/constants.js'

const app = useAppStore()
const entriesStore = useEntriesStore()
const stepsStore = useStepsStore()

// Delete
function confirmDel() {
  if (app.deleteTarget) entriesStore.remove(app.deleteTarget)
  app.cancelDelete()
  app.toast('🗑️ Voce eliminata')
}

// Steps — pre-fill with existing data when modal opens
const stepsInput = ref(0)
const strideInput = ref(75)
const kmPreview = computed(() => {
  if (!stepsInput.value) return ''
  const km = (stepsInput.value * (strideInput.value || 75) / 100000).toFixed(2)
  return `≈ ${km} km`
})

watch(() => app.showStepsModal, (visible) => {
  if (visible) {
    const existing = stepsStore.forDay(getDK(app.dayOffset))
    stepsInput.value = existing?.steps || 0
    strideInput.value = existing?.stride || 75
  }
})

function saveSteps() {
  if (!stepsInput.value) { app.toast('Inserisci i passi'); return }
  stepsStore.setDay(getDK(app.dayOffset), stepsInput.value, strideInput.value || 75)
  app.showStepsModal = false
  app.toast(`👟 ${stepsInput.value.toLocaleString('it')} passi salvati`)
}

// PDF / Export
function exportJson() {
  const data = {
    glicolog_v2: JSON.parse(localStorage.getItem('glicolog_v2') || '[]'),
    glicolog_cfg6: JSON.parse(localStorage.getItem('glicolog_cfg6') || '{}'),
    gl_steps: JSON.parse(localStorage.getItem('gl_steps') || '[]'),
    glicolog_fooddb7: JSON.parse(localStorage.getItem('glicolog_fooddb7') || '{}'),
    exported_at: new Date().toISOString()
  }
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `glicolog_backup_${new Date().toISOString().slice(0,10)}.json`
  a.click()
  URL.revokeObjectURL(url)
  app.showPdfModal = false
  app.toast('💾 Backup scaricato')
}

function printView() {
  app.showPdfModal = false
  setTimeout(() => window.print(), 200)
}

// Water
const customWater = ref(null)
const waterOpts = [
  { ml: 150, label: '150 ml', desc: 'Bicchiere piccolo' },
  { ml: 200, label: '200 ml', desc: 'Bicchiere' },
  { ml: 250, label: '250 ml', desc: 'Bicchiere grande' },
  { ml: 330, label: '330 ml', desc: 'Lattina' },
  { ml: 500, label: '500 ml', desc: 'Bottiglia' },
  { ml: 750, label: '750 ml', desc: 'Bottiglia grande' },
]

function addWater(ml) {
  if (!ml || ml <= 0) return
  entriesStore.add({ type: 'acqua', ml: Number(ml), ts: Date.now() })
  app.showWaterModal = false
  app.toast(`💧 ${ml} ml aggiunti`)
}

// Glic alerts
const hypoFoods = [
  { ico: '🥤', label: 'Coca Cola',  qtyLabel: '150ml', name: 'Coca Cola',       grams: 150, c100: 10.6, p100: 0,   g100: 0,   f100: 0, k100: 42,  isDrink: true  },
  { ico: '🧡', label: 'Fanta',      qtyLabel: '130ml', name: 'Fanta',           grams: 130, c100: 11.8, p100: 0,   g100: 0,   f100: 0, k100: 48,  isDrink: true  },
  { ico: '🧃', label: 'Succo',      qtyLabel: '150ml', name: 'Succo di frutta', grams: 150, c100: 10,   p100: 0.3, g100: 0.1, f100: 0, k100: 43,  isDrink: true  },
  { ico: '🥛', label: 'Latte',      qtyLabel: '300ml', name: 'Latte intero',    grams: 300, c100: 4.8,  p100: 3.3, g100: 3.6, f100: 0, k100: 65,  isDrink: true  },
  { ico: '🫙', label: 'Zucchero',   qtyLabel: '15g',   name: 'Zucchero',        grams: 15,  c100: 99.8, p100: 0,   g100: 0,   f100: 0, k100: 399, isDrink: false },
  { ico: '🍬', label: 'Caramelle',  qtyLabel: '17g',   name: 'Caramelle dure',  grams: 17,  c100: 87,   p100: 0,   g100: 0.5, f100: 0, k100: 348, isDrink: false },
  { ico: '💊', label: 'Glucosio',   qtyLabel: '15g',   name: 'Glucosio',        grams: 15,  c100: 100,  p100: 0,   g100: 0,   f100: 0, k100: 400, isDrink: false },
  { ico: '⚡', label: 'GlucoSprint',qtyLabel: '1 bst', name: 'GlucoSprint',     grams: 33,  c100: 52,   p100: 0,   g100: 0,   f100: 0, k100: 208, isDrink: false },
]

function doInsulinCorrection() {
  const data = app.glicAlertData
  const ts = data.glucoseTs ? data.glucoseTs + 60000 : Date.now()
  app.closeGlicAlert()
  app.openPanelPrefill('insulina', { insulinSubtype: 'Correzione', units: data.suggestedUnits, note: `Correzione glicemia ${data.glic} mg/dL`, ts })
}
function doInsulinBolo() {
  const data = app.glicAlertData
  const ts = data.glucoseTs ? data.glucoseTs + 60000 : Date.now()
  app.closeGlicAlert()
  app.openPanelPrefill('insulina', { insulinSubtype: 'Bolo', units: data.suggestedUnits, note: data.note || '', ts })
}
function doFoodCorrection(food = null) {
  const data = app.glicAlertData
  const ts = data?.glucoseTs ? data.glucoseTs + 60000 : Date.now()
  app.closeGlicAlert()
  if (food) {
    const row = { id: Date.now() + Math.random(), name: food.name, grams: food.grams, c100: food.c100, p100: food.p100, g100: food.g100, f100: food.f100, k100: food.k100, isDrink: food.isDrink }
    app.openPanelPrefill('correzione', { foodRows: [row], ts })
  } else {
    app.openPanelPrefill('correzione', { foodRows: [], ts })
  }
}
</script>

<style>
.glic-alert-bg { position: fixed; inset: 0; background: rgba(0,0,0,.72); z-index: 9999; display: flex; align-items: center; justify-content: center; opacity: 0; pointer-events: none; transition: opacity .22s }
.glic-alert-bg.on { opacity: 1; pointer-events: all }
.glic-alert-card { background: var(--bg2); border: 1px solid var(--bdr2); border-radius: 20px; padding: 28px 22px 22px; max-width: 340px; width: calc(100% - 40px); text-align: center }
.glic-alert-icon { font-size: 2.8rem; margin-bottom: 10px }
.glic-alert-title { font-size: 1.15rem; font-weight: 800; color: var(--txt); margin-bottom: 8px }
.glic-alert-msg { font-size: .85rem; color: var(--txt2); line-height: 1.5; margin-bottom: 16px }
.glic-alert-units { background: rgba(206,147,216,.1); border: 1px solid rgba(206,147,216,.3); border-radius: 14px; padding: 14px 18px; margin-bottom: 18px }
.glic-alert-units-val { font-size: 2.2rem; font-weight: 900; color: var(--p); display: block }
.glic-alert-units-lbl { font-size: .75rem; color: var(--txt2); text-transform: uppercase; letter-spacing: .5px }
.glic-alert-carbs { background: rgba(255,171,64,.08); border: 1px solid rgba(255,171,64,.25); border-radius: 14px; padding: 12px 16px; margin-bottom: 18px }
.glic-alert-carbs-val { font-size: 1.1rem; font-weight: 700; color: var(--o); margin-bottom: 4px }
.glic-alert-carbs-tip { font-size: .72rem; color: var(--txt2); line-height: 1.5 }
.glic-alert-btns { display: flex; flex-direction: column; gap: 8px }
.glic-alert-yes { width: 100%; border: none; border-radius: 12px; font-family: var(--sans); font-weight: 700; font-size: .95rem; padding: 14px; cursor: pointer; background: var(--p); color: #000; transition: opacity .12s }
.glic-alert-yes.glic-alert-low { background: var(--o) }
.glic-alert-yes:active { opacity: .85 }
.glic-alert-no { width: 100%; background: none; border: 1px solid var(--bdr2); border-radius: 12px; color: var(--txt2); font-family: var(--sans); font-size: .88rem; padding: 12px; cursor: pointer }
.glic-alert-carbs-lbl { font-size: .75rem; font-weight: 700; color: var(--txt2); text-transform: uppercase; letter-spacing: .5px; margin-bottom: 8px; text-align: left }
.glic-hypo-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; margin-bottom: 14px }
.glic-hypo-chip { background: var(--card); border: 1px solid var(--bdr); border-radius: 10px; padding: 8px 6px; cursor: pointer; display: flex; flex-direction: column; align-items: center; gap: 2px; transition: background .12s; font-family: var(--sans) }
.glic-hypo-chip:active { background: rgba(255,171,64,.12); border-color: var(--o) }
.glic-hypo-ico { font-size: 1.4rem; line-height: 1 }
.glic-hypo-name { font-size: .72rem; font-weight: 600; color: var(--txt); line-height: 1.2 }
.glic-hypo-qty { font-size: .65rem; color: var(--o); font-family: var(--mono); font-weight: 600 }
</style>
