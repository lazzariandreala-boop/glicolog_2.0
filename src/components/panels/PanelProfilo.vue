<template>
  <PanelBase :visible="visible">
    <div class="pt">⚙️ Profilo personale</div>
    <div style="font-size:.72rem;color:var(--txt2);margin-bottom:14px;line-height:1.5">I tuoi parametri per suggerimenti e target nutrizionali.</div>

    <div class="pdiv">📏 Dati corporei</div>
    <div class="g2">
      <div class="fr"><span class="fl">Età</span><input class="fi" type="number" inputmode="numeric" v-model.number="form.age" placeholder="32" /></div>
      <div class="fr"><span class="fl">Peso (kg)</span><input class="fi" type="number" inputmode="decimal" v-model.number="form.weight" placeholder="80" /></div>
    </div>
    <div class="g2">
      <div class="fr"><span class="fl">Altezza (cm)</span><input class="fi" type="number" inputmode="numeric" v-model.number="form.height" placeholder="174" /></div>
      <div class="fr">
        <span class="fl">Sesso</span>
        <SegmentControl v-model="form.sex" :options="[{value:'M',label:'♂ M'},{value:'F',label:'♀ F'}]" />
      </div>
    </div>
    <div class="fr">
      <span class="fl">Attività fisica</span>
      <SegmentControl v-model="form.activity" :options="activityOpts" />
    </div>
    <div class="fr">
      <span class="fl">Obiettivo</span>
      <SegmentControl v-model="form.goal" :options="goalOpts" />
    </div>

    <div class="pdiv">🩸 Parametri glicemici</div>
    <div class="g2">
      <div class="fr"><span class="fl">Target MIN</span><input class="fi" type="number" inputmode="numeric" v-model.number="form.targetMin" placeholder="100" /></div>
      <div class="fr"><span class="fl">Target MAX</span><input class="fi" type="number" inputmode="numeric" v-model.number="form.targetMax" placeholder="160" /></div>
    </div>
    <div class="g2">
      <div class="fr">
        <span class="fl">FSI (mg/dL per 1U)</span>
        <input class="fi" type="number" inputmode="decimal" step="0.5" v-model.number="form.fsi" placeholder="30" />
        <div class="fi-hint">Di quanti mg/dL scendi con 1U</div>
      </div>
      <div class="fr">
        <span class="fl">I:C (g carbo per 1U)</span>
        <input class="fi" type="number" inputmode="decimal" step="0.5" v-model.number="form.ic" placeholder="7" />
        <div class="fi-hint">Grammi coperti da 1U</div>
      </div>
    </div>
    <div class="fr">
      <span class="fl">Insulina rapida</span>
      <select class="fi" v-model="form.insRapida">
        <option v-for="opt in rapidaOpts" :key="opt" :value="opt">{{ opt }}</option>
      </select>
    </div>
    <div class="fr">
      <span class="fl">Insulina basale</span>
      <select class="fi" v-model="form.insBasale">
        <option value="">— nessuna —</option>
        <option v-for="opt in basaleOpts" :key="opt" :value="opt">{{ opt }}</option>
      </select>
    </div>

    <div class="pdiv">🍺 Limite alcolico</div>
    <div class="fr">
      <span class="fl">Unità max a settimana</span>
      <input class="fi" type="number" inputmode="numeric" v-model.number="form.alcMax" placeholder="5" />
      <div class="fi-hint">1U ≈ 1 spritz · 1 calice vino · 1 birra 33cl</div>
    </div>

    <div class="pdiv">🎨 Aspetto</div>
    <div class="fr">
      <span class="fl">Tema</span>
      <SegmentControl v-model="currentTheme" :options="[{value:'dark',label:'🌙 Scuro'},{value:'light',label:'☀️ Chiaro'}]" @update:modelValue="v => appStore.setTheme(v)" />
    </div>

    <!-- GIST SYNC -->
    <div class="pdiv">☁️ Sincronizzazione GitHub Gist</div>
    <div style="font-size:.72rem;color:var(--txt2);margin-bottom:12px;line-height:1.5">
      I dati vengono salvati in un Gist privato su GitHub. Il token non viene mai trasmesso ad altri server.
    </div>
    <div class="fr">
      <span class="fl">GitHub Personal Access Token</span>
      <input class="fi" type="password" v-model="gistToken" placeholder="ghp_xxxxxxxxxxxxxxxxxx" autocomplete="off" />
      <div class="fi-hint">Genera su github.com → Settings → Developer settings → Personal access tokens (scope: gist)</div>
    </div>
    <div class="fr">
      <span class="fl">Gist ID (compilato automaticamente)</span>
      <input class="fi" type="text" v-model="gistId" placeholder="Lascia vuoto per creare un nuovo Gist" />
    </div>
    <div v-if="lastSync" style="font-size:.72rem;color:var(--txt2);margin-bottom:12px">
      Ultima sincronizzazione: {{ lastSyncFormatted }}
    </div>
    <div style="display:flex;gap:8px;margin-bottom:14px">
      <button class="gist-btn gist-up" :disabled="gistBusy" @click="doExport">
        <span>{{ gistBusy === 'export' ? '⏳' : '☁️↑' }}</span> Salva su Gist
      </button>
      <button class="gist-btn gist-dn" :disabled="gistBusy" @click="doImport">
        <span>{{ gistBusy === 'import' ? '⏳' : '☁️↓' }}</span> Importa da Gist
      </button>
    </div>

    <!-- TDEE calcolato -->
    <div v-if="tdee" style="background:var(--card);border:1px solid var(--bdr);border-radius:12px;padding:12px 14px;margin-bottom:14px;font-size:.82rem">
      <div style="font-weight:700;color:var(--txt);margin-bottom:6px">📊 TDEE calcolato</div>
      <div style="color:var(--txt2)">{{ tdee }} kcal/giorno (con attività)</div>
    </div>

    <button class="bsave" @click="save">💾 Salva e ricalcola target</button>
    <button class="bdel" @click="close" style="margin-top:4px">Annulla</button>
  </PanelBase>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { useAppStore } from '@/stores/app.js'
import { useEntriesStore, useConfigStore, useStepsStore } from '@/stores/index.js'
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

const form = ref({ ...cfgStore.cfg, activity: String(cfgStore.cfg.activity) })

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
    const cfg = cfgStore.cfg
    form.value = { ...cfg, activity: String(cfg.activity) }
    currentTheme.value = appStore.theme
    // Aggiorna i campi Gist con i valori correnti
    gistToken.value = getToken()
    gistId.value    = getGistId()
    lastSync.value  = getLastSync()
  }
})

function save() {
  const data = {
    ...form.value,
    activity: parseFloat(form.value.activity) || 1.375,
    kcal: tdee.value || cfgStore.cfg.kcal,
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

<style>
.gist-btn {
  flex: 1; border: none; border-radius: 11px; font-family: var(--sans);
  font-weight: 600; font-size: .85rem; padding: 12px 8px; cursor: pointer;
  transition: opacity .12s; display: flex; align-items: center; justify-content: center; gap: 6px;
}
.gist-btn:disabled { opacity: .5; cursor: not-allowed; }
.gist-up { background: rgba(0,230,118,.15); color: var(--g); border: 1px solid rgba(0,230,118,.3); }
.gist-dn { background: rgba(64,196,255,.15); color: var(--b); border: 1px solid rgba(64,196,255,.3); }
.gist-up:active:not(:disabled) { background: rgba(0,230,118,.25); }
.gist-dn:active:not(:disabled) { background: rgba(64,196,255,.25); }
</style>
