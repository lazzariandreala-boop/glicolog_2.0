<template>
  <PanelBase :visible="visible" panel-class="panel-profilo">
    <div class="pf-title">⚙️ Profilo personale</div>
    <p class="pf-subtitle">I tuoi parametri per suggerimenti e target nutrizionali. Aggiornali se cambia il peso o le dosi.</p>

    <!-- Layout 2 colonne su desktop -->
    <div class="pf-cols">

      <!-- Colonna sinistra: dati corporei -->
      <div class="pf-col">
        <div class="pdiv">📏 Dati corporei</div>
        <div class="pf-grid2">
          <div class="pf-field">
            <span class="pf-label">ETÀ</span>
            <input class="fi pf-input" type="number" inputmode="numeric" v-model.number="form.age" placeholder="es. 32" />
          </div>
          <div class="pf-field">
            <span class="pf-label">PESO (KG)</span>
            <input class="fi pf-input" type="number" inputmode="decimal" v-model.number="form.weight" placeholder="es. 80" />
          </div>
          <div class="pf-field">
            <span class="pf-label">ALTEZZA (CM)</span>
            <input class="fi pf-input" type="number" inputmode="numeric" v-model.number="form.height" placeholder="es. 174" />
          </div>
          <div class="pf-field">
            <span class="pf-label">SESSO</span>
            <SegmentControl v-model="form.sex" :options="[{value:'M',label:'♂ M'},{value:'F',label:'♀ F'}]" />
          </div>
        </div>

        <div class="pf-field">
          <span class="pf-label">ATTIVITÀ FISICA</span>
          <SegmentControl v-model="form.activity" :options="activityOpts" />
        </div>

        <div class="pf-field">
          <span class="pf-label">OBIETTIVO</span>
          <SegmentControl v-model="form.goal" :options="goalOpts" />
        </div>

        <!-- TDEE calcolato (su desktop nella colonna sinistra) -->
        <div v-if="tdee" class="pf-tdee">
          <div class="pf-tdee-title">📊 TDEE calcolato</div>
          <div class="pf-tdee-val">{{ tdee }} kcal/giorno (con attività)</div>
        </div>
      </div>

      <!-- Colonna destra: parametri glicemici + altro -->
      <div class="pf-col">
        <div class="pdiv">🩸 Parametri glicemici</div>
        <div class="pf-grid2">
          <div class="pf-field">
            <span class="pf-label">TARGET MIN</span>
            <input class="fi pf-input" type="number" inputmode="numeric" v-model.number="form.targetMin" placeholder="es. 80" />
          </div>
          <div class="pf-field">
            <span class="pf-label">TARGET MAX</span>
            <input class="fi pf-input" type="number" inputmode="numeric" v-model.number="form.targetMax" placeholder="es. 180" />
          </div>
          <div class="pf-field">
            <span class="pf-label">FSI (MG/DL PER 1U)</span>
            <input class="fi pf-input" type="number" inputmode="decimal" step="0.5" v-model.number="form.fsi" placeholder="es. 35" />
            <span class="pf-hint">Di quanti mg/dL scendi con 1U</span>
          </div>
          <div class="pf-field">
            <span class="pf-label">I:C (G CARBO PER 1U)</span>
            <input class="fi pf-input" type="number" inputmode="decimal" step="0.5" v-model.number="form.ic" placeholder="es. 5" />
            <span class="pf-hint">Grammi coperti da 1U</span>
          </div>
        </div>

        <div class="pf-field">
          <span class="pf-label">INSULINA RAPIDA</span>
          <select class="fi pf-input" v-model="form.insRapida">
            <option v-for="opt in rapidaOpts" :key="opt" :value="opt">{{ opt }}</option>
          </select>
        </div>

        <div class="pf-field">
          <span class="pf-label">INSULINA BASALE</span>
          <select class="fi pf-input" v-model="form.insBasale">
            <option value="">— nessuna —</option>
            <option v-for="opt in basaleOpts" :key="opt" :value="opt">{{ opt }}</option>
          </select>
        </div>

        <div class="pdiv">👟 Attività fisica</div>
        <div class="pf-field">
          <span class="pf-label">OBIETTIVO PASSI GIORNALIERO</span>
          <input class="fi pf-input" type="number" inputmode="numeric" v-model.number="form.stepsGoal" placeholder="es. 10000" />
          <span class="pf-hint">Usato per colorare il grafico e il riepilogo salute</span>
        </div>

        <div class="pdiv">🍺 Limite alcolico</div>
        <div class="pf-field">
          <span class="pf-label">UNITÀ MAX A SETTIMANA</span>
          <input class="fi pf-input" type="number" inputmode="numeric" v-model.number="form.alcMax" placeholder="es. 5" />
          <span class="pf-hint">1U ≈ 1 spritz · 1 calice vino · 1 birra 33cl</span>
        </div>

        <div class="pdiv">🎨 Aspetto</div>
        <div class="pf-field">
          <span class="pf-label">TEMA</span>
          <SegmentControl v-model="currentTheme" :options="[{value:'dark',label:'🌙 Scuro'},{value:'light',label:'☀️ Chiaro'}]" @update:modelValue="v => appStore.setTheme(v)" />
        </div>
      </div>

    </div><!-- /pf-cols -->

    <!-- GIST SYNC (larghezza piena) -->
    <div class="pdiv">☁️ Sincronizzazione GitHub Gist</div>
    <p class="pf-subtitle">I dati vengono salvati in un Gist privato su GitHub. Il token non viene mai trasmesso ad altri server.</p>

    <div class="pf-gist-body">
      <div class="pf-field">
        <span class="pf-label">GITHUB PERSONAL ACCESS TOKEN</span>
        <div class="pf-token-row">
          <input class="fi pf-input pf-token-input" :type="showToken ? 'text' : 'password'" v-model="gistToken" placeholder="ghp_xxxxxxxxxxxxxxxxxx" autocomplete="off" />
          <button class="pf-token-btn" @click="showToken = !showToken" :title="showToken ? 'Nascondi token' : 'Mostra token'">{{ showToken ? '🙈' : '👁' }}</button>
          <button class="pf-token-btn" @click="copyToken" :title="'Copia token'">📋</button>
        </div>
        <span class="pf-hint">Genera su github.com → Settings → Developer settings → Personal access tokens (scope: gist)</span>
      </div>

      <div class="pf-field">
        <span class="pf-label">GIST ID (compilato automaticamente)</span>
        <input class="fi pf-input" type="text" v-model="gistId" placeholder="Lascia vuoto per creare un nuovo Gist" />
      </div>
    </div>

    <div v-if="lastSync" class="pf-sync-info">
      Ultima sincronizzazione: {{ lastSyncFormatted }}
    </div>

    <div class="pf-gist-row">
      <button class="gist-btn gist-up" :disabled="gistBusy" @click="doExport">
        <span>{{ gistBusy === 'export' ? '⏳' : '☁️↑' }}</span> Salva su Gist
      </button>
      <button class="gist-btn gist-dn" :disabled="gistBusy" @click="doImport">
        <span>{{ gistBusy === 'import' ? '⏳' : '☁️↓' }}</span> Importa da Gist
      </button>
    </div>

    <button class="bsave" @click="save">💾 Salva e ricalcola target</button>
    <button class="bdel" @click="close" style="margin-top:4px">Annulla</button>
  </PanelBase>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { useAppStore } from '@/stores/app.js'
import { useEntriesStore, useConfigStore, useStepsStore } from '@/stores/index.js'
import { CFGKEY } from '@/data/constants.js'
import PanelBase from './PanelBase.vue'
import SegmentControl from '@/components/shared/SegmentControl.vue'
import {
  getToken, getGistId, getLastSync,
  setToken, setGistId,
  exportToGist, importFromGist
} from '@/utils/gistSync.js'

const app = useAppStore()
const appStore = useAppStore()
const cfgStore = useConfigStore()

const visible = ref(false)
const currentTheme = ref(appStore.theme)

const activityOpts = [
  { value: '1.2',   label: 'Sed.' },
  { value: '1.375', label: 'Leggera' },
  { value: '1.55',  label: 'Moderata' },
  { value: '1.725', label: 'Attiva' },
]
const goalOpts = [
  { value: 'loss',     label: 'Dimagrire' },
  { value: 'maintain', label: 'Mantenimento' },
  { value: 'gain',     label: 'Massa' },
]
const rapidaOpts = ['Humalog','Novorapid','Fiasp','Apidra','Lyumjev','Admelog','Regular']
const basaleOpts = ['Lantus','Toujeo','Tresiba','Levemir','Basaglar','Semglee','Ryzodeg']

const form = ref({ age: null, weight: null, height: null, sex: 'M', activity: '1.375', goal: 'maintain', targetMin: null, targetMax: null, fsi: null, ic: null, insRapida: 'Humalog', insBasale: '', alcMax: null, stepsGoal: 10000 })

// TDEE calcolato (Harris-Benedict)
const tdee = computed(() => {
  const { age, weight, height, sex, activity, goal } = form.value
  if (!age || !weight || !height) return null
  const bmr = sex === 'M'
    ? 88.362 + 13.397 * weight + 4.799 * height - 5.677 * age
    : 447.593 + 9.247 * weight + 3.098 * height - 4.330 * age
  let kcal = Math.round(bmr * parseFloat(activity || 1.375))
  if (goal === 'loss') kcal -= 300
  if (goal === 'gain') kcal += 300
  return kcal
})

// Gist sync state
const gistToken  = ref(getToken())
const gistId     = ref(getGistId())
const lastSync   = ref(getLastSync())
const gistBusy   = ref(null) // 'export' | 'import' | null
const showToken  = ref(false)

async function copyToken() {
  if (!gistToken.value) return
  await navigator.clipboard.writeText(gistToken.value)
  app.toast('📋 Token copiato!')
}

const lastSyncFormatted = computed(() => {
  if (!lastSync.value) return ''
  return new Date(lastSync.value).toLocaleString('it-IT', { dateStyle: 'short', timeStyle: 'short' })
})

async function doExport() {
  setToken(gistToken.value)
  setGistId(gistId.value)
  gistBusy.value = 'export'
  try {
    await exportToGist()
    gistId.value = getGistId()
    lastSync.value = getLastSync()
    app.toast('☁️ Dati salvati su Gist!')
  } catch (e) {
    app.toast(`❌ ${e.message}`)
  } finally {
    gistBusy.value = null
  }
}

async function doImport() {
  setToken(gistToken.value)
  setGistId(gistId.value)
  gistBusy.value = 'import'
  try {
    await importFromGist()
    lastSync.value = getLastSync()
    // Ricarica tutti gli store con i nuovi dati
    useEntriesStore().load()
    useConfigStore().load()
    useStepsStore().load()
    app.toast('✅ Dati importati da Gist!')
  } catch (e) {
    app.toast(`❌ ${e.message}`)
  } finally {
    gistBusy.value = null
  }
}

watch(() => app.openPanel, (p) => {
  visible.value = p === 'profilo'
  if (p === 'profilo') {
    // Load only from localStorage — if not saved, show empty (no hardcoded defaults)
    let saved = {}
    try { saved = JSON.parse(localStorage.getItem(CFGKEY) || '{}') } catch {}
    form.value = {
      age:       saved.age       ?? null,
      weight:    saved.weight    ?? null,
      height:    saved.height    ?? null,
      sex:       saved.sex       ?? 'M',
      activity:  String(saved.activity ?? 1.375),
      goal:      saved.goal      ?? 'maintain',
      targetMin: saved.targetMin ?? null,
      targetMax: saved.targetMax ?? null,
      fsi:       saved.fsi       ?? null,
      ic:        saved.ic        ?? null,
      insRapida: saved.insRapida ?? 'Humalog',
      insBasale: saved.insBasale ?? '',
      alcMax:    saved.alcMax    ?? null,
      stepsGoal: saved.stepsGoal ?? 10000,
    }
    currentTheme.value = appStore.theme
    gistToken.value = getToken()
    gistId.value    = getGistId()
    lastSync.value  = getLastSync()
  }
})

function save() {
  const base = cfgStore.cfg
  const data = {
    ...base,
    ...form.value,
    activity: parseFloat(form.value.activity) || 1.375,
    kcal: tdee.value || base.kcal,
    protein: Math.round((tdee.value || 2000) * 0.25 / 4),
    carbs: Math.round((tdee.value || 2000) * 0.40 / 4),
    fat: Math.round((tdee.value || 2000) * 0.30 / 9),
    fiber: 30
  }
  cfgStore.save(data)
  app.toast('✅ Profilo salvato')
  close()
}
function close() { app.closePanel() }
</script>

<style scoped>
/* ── Desktop 2-column layout ── */
.pf-cols {
  display: flex;
  flex-direction: column;
}
.pf-col {
  flex: 1;
  min-width: 0;
}
@media (min-width: 768px) {
  .pf-cols {
    flex-direction: row;
    gap: 20px;
  }
  .pf-col:first-child {
    border-right: 1px solid var(--bdr);
    padding-right: 20px;
  }
  .pf-gist-body {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0 20px;
  }
}

.pf-title {
  font-size: 1.05rem;
  font-weight: 700;
  letter-spacing: .5px;
  text-transform: uppercase;
  margin-bottom: 6px;
}
.pf-subtitle {
  font-size: .75rem;
  color: var(--txt2);
  margin: 0 0 14px;
  line-height: 1.4;
}
.pf-grid2 {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  margin-bottom: 4px;
}
.pf-grid2 > .pf-field {
  min-width: 0;
}
.pf-field {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-bottom: 10px;
}
.pf-label {
  font-size: .7rem;
  font-weight: 600;
  color: var(--txt2);
  letter-spacing: .4px;
  text-transform: uppercase;
}
.pf-input {
  width: 100%;
  box-sizing: border-box;
}
.pf-token-row {
  display: flex;
  gap: 6px;
  align-items: center;
}
.pf-token-input {
  flex: 1;
  min-width: 0;
}
.pf-token-btn {
  flex-shrink: 0;
  background: linear-gradient(180deg, rgba(255,255,255,.03) 0%, transparent 100%), var(--card);
  border: 1.5px solid var(--bdr2);
  border-radius: 14px;
  padding: 16px 10.5px;
  cursor: pointer;
  font-size: .9rem;
  color: var(--txt2);
  line-height: 1;
  font-family: var(--sans);
  transition: border-color .2s;
}
.pf-token-btn:hover {
  border-color: var(--g);
  color: var(--txt);
}
.pf-hint {
  font-size: .68rem;
  color: var(--txt2);
  line-height: 1.3;
}
.pf-sync-info {
  font-size: .72rem;
  color: var(--txt2);
  margin-bottom: 12px;
}
.pf-gist-row {
  display: flex;
  gap: 8px;
  margin-bottom: 14px;
}
.pf-tdee {
  background: var(--card);
  border: 1px solid var(--bdr);
  border-radius: 12px;
  padding: 12px 14px;
  margin-bottom: 14px;
}
.pf-tdee-title {
  font-weight: 700;
  color: var(--txt);
  margin-bottom: 4px;
  font-size: .85rem;
}
.pf-tdee-val {
  font-size: .82rem;
  color: var(--txt2);
}
.gist-btn {
  flex: 1;
  border: none;
  border-radius: 11px;
  font-family: var(--sans);
  font-weight: 600;
  font-size: .85rem;
  padding: 12px 8px;
  cursor: pointer;
  transition: opacity .12s;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
}
.gist-btn:disabled { opacity: .5; cursor: not-allowed; }
.gist-up { background: rgba(0,230,118,.15); color: var(--g); border: 1px solid rgba(0,230,118,.3); }
.gist-dn { background: rgba(64,196,255,.15); color: var(--b); border: 1px solid rgba(64,196,255,.3); }
.gist-up:active:not(:disabled) { background: rgba(0,230,118,.25); }
.gist-dn:active:not(:disabled) { background: rgba(64,196,255,.25); }
</style>
