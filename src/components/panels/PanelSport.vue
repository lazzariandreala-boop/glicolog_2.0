<template>
  <PanelBase :visible="visible">
    <div class="pt">🏃 {{ isEdit ? 'Modifica attività' : 'Nuova attività sportiva' }}</div>

    <div class="fr">
      <span class="fl">Attività</span>
      <select class="fi" v-model="form.sportKey" @change="calcKcal">
        <option value="">— scegli attività —</option>
        <optgroup v-for="(acts, grp) in sportGroups" :key="grp" :label="grp">
          <option v-for="act in acts" :key="act.value" :value="act.value">{{ act.label }}</option>
        </optgroup>
      </select>
    </div>

    <div class="fr">
      <span class="fl">Durata</span>
      <select class="fi" v-model.number="form.duration" @change="calcKcal">
        <option :value="15">15 minuti</option>
        <option :value="30">30 minuti</option>
        <option :value="45">45 minuti</option>
        <option :value="60">1 ora</option>
        <option :value="75">1h 15min</option>
        <option :value="90">1h 30min</option>
        <option :value="120">2 ore</option>
        <option :value="150">2h 30min</option>
        <option :value="180">3 ore</option>
      </select>
    </div>

    <!-- Calorie stimate -->
    <div class="sport-kcal-box" :class="{ on: estimatedKcal > 0 }">
      <div class="sport-kcal-row">
        <span class="sport-kcal-lbl">Calorie stimate bruciate</span>
        <span class="sport-kcal-val">~{{ estimatedKcal }} kcal</span>
      </div>
      <div style="font-size:.65rem;color:var(--txt2);margin-top:3px;line-height:1.4">
        ⚡ L'attività fisica può abbassare la glicemia nelle ore successive.
      </div>
    </div>

    <div class="fr">
      <span class="fl">Note (opzionale)</span>
      <input class="fi" type="text" v-model="form.note" placeholder="es. palestra, outdoor…" />
    </div>

    <TimeRow v-model="form.ts" />

    <button class="bsave" style="background:#29b6f6;color:#000" @click="save">💾 Salva</button>
    <button v-if="isEdit" class="bdel" @click="del">Elimina</button>
    <button class="bdel" @click="close" style="margin-top:4px">Annulla</button>
  </PanelBase>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { useAppStore } from '@/stores/app.js'
import { useEntriesStore, useConfigStore } from '@/stores/index.js'
import PanelBase from './PanelBase.vue'
import TimeRow from '@/components/shared/TimeRow.vue'

const app = useAppStore()
const entriesStore = useEntriesStore()
const cfgStore = useConfigStore()

const visible = ref(false)
const isEdit = ref(false)

// MET values: formato "nome|met"
const sportGroups = {
  'Camminata e corsa': [
    { value:'Camminata veloce|4',  label:'Camminata veloce (5-6 km/h)' },
    { value:'Jogging|7',           label:'Jogging (7-8 km/h)' },
    { value:'Corsa|9',             label:'Corsa (9-10 km/h)' },
    { value:'Corsa veloce|11',     label:'Corsa veloce (>11 km/h)' },
    { value:'Trekking|5.5',        label:'Trekking / escursionismo' },
    { value:'Hiking montagna|6',   label:'Hiking montagna' },
  ],
  'Ciclismo': [
    { value:'Ciclismo leggero|4',  label:'Ciclismo leggero (<16 km/h)' },
    { value:'Ciclismo moderato|8', label:'Ciclismo moderato (16-22 km/h)' },
    { value:'Ciclismo intenso|10', label:'Ciclismo intenso (>22 km/h)' },
    { value:'Spinning|8.5',        label:'Spinning / Cyclette' },
    { value:'Mountain bike|8.5',   label:'Mountain bike' },
  ],
  'Nuoto e acqua': [
    { value:'Nuoto stile libero|8',label:'Nuoto stile libero' },
    { value:'Nuoto rana|7',        label:'Nuoto rana' },
    { value:'Acquagym|5',          label:'Acquagym' },
  ],
  'Palestra': [
    { value:'Pesi moderati|4',     label:'Pesi / muscolazione (moderata)' },
    { value:'Pesi intensi|6',      label:'Pesi / muscolazione (intensa)' },
    { value:'CrossFit|8',          label:'CrossFit / HIIT' },
    { value:'Yoga|2.5',            label:'Yoga' },
    { value:'Pilates|3',           label:'Pilates' },
    { value:'Stretching|2',        label:'Stretching / mobilità' },
  ],
  'Giochi di squadra': [
    { value:'Calcio|7',            label:'Calcio' },
    { value:'Basket|8',            label:'Basket' },
    { value:'Tennis|7',            label:'Tennis' },
    { value:'Padel|6',             label:'Padel / Beach tennis' },
    { value:'Pallavolo|4',         label:'Pallavolo' },
  ],
  'Arti marziali': [
    { value:'Boxe|8',              label:'Boxe' },
    { value:'Karate|6.5',          label:'Karate / Arti marziali' },
  ],
}

const form = ref({ sportKey: '', duration: 60, note: '', ts: Date.now() })
const estimatedKcal = ref(0)

function calcKcal() {
  if (!form.value.sportKey) { estimatedKcal.value = 0; return }
  const met = parseFloat(form.value.sportKey.split('|')[1]) || 5
  const weight = cfgStore.cfg.weight || 80
  estimatedKcal.value = Math.round(met * weight * form.value.duration / 60)
}

watch(() => app.openPanel, (p) => {
  visible.value = p === 'sport'
  if (p === 'sport') {
    const e = app.editEntry
    isEdit.value = !!e
    if (e) form.value = { sportKey: e.sportKey||'', duration: e.duration||60, note: e.note||'', ts: e.ts }
    else form.value = { sportKey: '', duration: 60, note: '', ts: Date.now() }
    calcKcal()
  }
})

const sportName = computed(() => form.value.sportKey ? form.value.sportKey.split('|')[0] : '')

function save() {
  if (!form.value.sportKey) { app.toast('Scegli un\'attività'); return }
  calcKcal()
  const entry = {
    type: 'sport',
    sport: sportName.value,
    sportKey: form.value.sportKey,
    duration: form.value.duration,
    kcal: estimatedKcal.value,
    note: form.value.note,
    ts: form.value.ts
  }
  if (isEdit.value && app.editEntry) { entriesStore.update(app.editEntry.id, entry); app.toast('✅ Attività aggiornata') }
  else { entriesStore.add(entry); app.toast('🏃 ' + sportName.value + ' salvato — ~' + estimatedKcal.value + ' kcal') }
  close()
}
function del() { app.confirmDelete(app.editEntry.id); close() }
function close() { app.closePanel() }
</script>
