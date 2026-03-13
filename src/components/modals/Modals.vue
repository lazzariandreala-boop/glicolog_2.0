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
</script>
