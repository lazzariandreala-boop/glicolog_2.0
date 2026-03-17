<template>
  <PanelBase :visible="visible">
    <div class="pt">🩸 {{ isEdit ? 'Modifica glicemia' : 'Nuova glicemia' }}</div>

    <div class="fr">
      <span class="fl">Glicemia (mg/dL)</span>
      <input class="fi big" type="number" inputmode="numeric" v-model.number="form.glic" placeholder="mg/dL" ref="inputRef" />
    </div>
    <!-- Alert sotto l'input, full-width -->
    <div v-if="form.glic && form.glic < 70" class="glic-inline-alert glic-inline-low">
      ⚠️ <b>Ipoglicemia!</b> Assumere 15-20g di carboidrati ad azione rapida.
    </div>
    <div v-else-if="form.glic && form.glic > cfgStore.cfg.targetMax" class="glic-inline-alert glic-inline-high">
      ↑ Glicemia elevata (target {{ cfgStore.cfg.targetMin }}–{{ cfgStore.cfg.targetMax }} mg/dL)
    </div>

    <div class="fr">
      <span class="fl">Direzionalità ↗↘</span>
      <TrendSelector v-model="form.trend" />
    </div>

    <div class="fr">
      <span class="fl">Note (opzionale)</span>
      <input class="fi" type="text" v-model="form.note" placeholder="es. dopo colazione, a digiuno…" />
    </div>

    <TimeRow v-model="form.ts" />

    <button class="bsave" style="background:var(--b);color:#000" @click="save">💾 Salva</button>
    <button v-if="isEdit" class="bdel" @click="del">Elimina</button>
    <button class="bdel" @click="close" style="margin-top:4px">Annulla</button>
  </PanelBase>
</template>

<script setup>
import { ref, watch, nextTick } from 'vue'
import { useAppStore } from '@/stores/app.js'
import { useEntriesStore, useConfigStore } from '@/stores/index.js'
import { getDK } from '@/data/constants.js'
import PanelBase from './PanelBase.vue'
import TrendSelector from '@/components/shared/TrendSelector.vue'
import TimeRow from '@/components/shared/TimeRow.vue'

const app = useAppStore()
const entriesStore = useEntriesStore()
const cfgStore = useConfigStore()

const visible = ref(false)
const isEdit  = ref(false)
const inputRef = ref(null)

const form = ref({ glic: null, trend: '→', note: '', ts: app.defaultTs() })

watch(() => app.openPanel, (p) => {
  visible.value = p === 'glicemia'
  if (p === 'glicemia') {
    const e = app.editEntry
    isEdit.value = !!e
    if (e) {
      form.value = { glic: e.glic, trend: e.trend||'', note: e.note||'', ts: e.ts }
    } else {
      form.value = { glic: null, trend: '→', note: '', ts: app.defaultTs() }
    }
    nextTick(() => inputRef.value?.focus())
  }
})

function save() {
  if (!form.value.glic) { app.toast('Inserisci il valore glicemico'); return }
  const glic = Number(form.value.glic)
  const entry = { type: 'glicemia', glic, trend: form.value.trend, note: form.value.note, ts: form.value.ts }
  if (isEdit.value && app.editEntry) {
    entriesStore.update(app.editEntry.id, entry)
    app.toast('✅ Glicemia aggiornata')
  } else {
    entriesStore.add(entry)
    app.toast('✅ Glicemia salvata — ' + glic + ' mg/dL')
    const cfg = cfgStore.cfg
    const glucoseTs = form.value.ts
    if (glic < 70) {
      app.triggerGlicAlert({ type: 'low', glic, glucoseTs, suggestedCarbs: 15,
        title: '⚠️ Ipoglicemia!',
        msg: `Glicemia ${glic} mg/dL. Assumi subito 15-20g di carboidrati a rapido assorbimento.`
      })
    } else if (cfg.targetMax && glic > cfg.targetMax && cfg.fsi) {
      const units = Math.max(0.5, Math.round(((glic - (cfg.targetMin || 100)) / cfg.fsi) * 2) / 2)
      app.triggerGlicAlert({ type: 'high', glic, glucoseTs, suggestedUnits: units,
        title: '↑ Glicemia elevata',
        msg: `Glicemia ${glic} mg/dL (target max ${cfg.targetMax} mg/dL). Correzione suggerita:`
      })
    }
  }
  close()
}

function del() {
  app.confirmDelete(app.editEntry.id)
  close()
}

function close() { app.closePanel() }
</script>
