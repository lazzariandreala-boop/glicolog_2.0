<template>
  <PanelBase :visible="visible">
    <div class="pt">💉 {{ isEdit ? 'Modifica glicemia' : 'Nuova glicemia' }}</div>

    <div class="fr">
      <span class="fl">Glicemia (mg/dL)</span>
      <input class="fi big" type="number" inputmode="numeric" v-model.number="form.glic" placeholder="mg/dL" ref="inputRef" />
      <!-- Alert ipoglicemia -->
      <div v-if="form.glic && form.glic < 70" style="margin-top:8px;background:rgba(255,82,82,.12);border:1px solid rgba(255,82,82,.35);border-radius:10px;padding:10px 12px;font-size:.8rem;color:var(--r)">
        ⚠️ <b>Ipoglicemia!</b> Assumere 15-20g di carboidrati ad azione rapida.
      </div>
      <div v-else-if="form.glic && form.glic > cfgStore.cfg.targetMax" style="margin-top:8px;background:rgba(255,171,64,.08);border:1px solid rgba(255,171,64,.25);border-radius:10px;padding:10px 12px;font-size:.8rem;color:var(--o)">
        ↑ Glicemia elevata (target {{ cfgStore.cfg.targetMin }}–{{ cfgStore.cfg.targetMax }} mg/dL)
      </div>
    </div>

    <div class="fr">
      <span class="fl">Direzionalità ↗↘</span>
      <TrendSelector v-model="form.trend" />
    </div>

    <div class="fr">
      <span class="fl">Quando</span>
      <SegmentControl v-model="form.when" :options="whenOpts" color-class="b" />
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
import SegmentControl from '@/components/shared/SegmentControl.vue'
import TimeRow from '@/components/shared/TimeRow.vue'

const app = useAppStore()
const entriesStore = useEntriesStore()
const cfgStore = useConfigStore()

const visible = ref(false)
const isEdit  = ref(false)
const inputRef = ref(null)

const whenOpts = [
  { value: 'preprandiale', label: 'Pre-pasto' },
  { value: 'postprandiale', label: 'Post-pasto' },
  { value: 'random', label: 'Random' },
  { value: 'notte', label: 'Notte' },
]

const form = ref({ glic: null, trend: '', when: 'random', note: '', ts: Date.now() })

watch(() => app.openPanel, (p) => {
  visible.value = p === 'glicemia'
  if (p === 'glicemia') {
    const e = app.editEntry
    isEdit.value = !!e
    if (e) {
      form.value = { glic: e.glic, trend: e.trend||'', when: e.when||'random', note: e.note||'', ts: e.ts }
    } else {
      form.value = { glic: null, trend: '', when: 'random', note: '', ts: Date.now() }
    }
    nextTick(() => inputRef.value?.focus())
  }
})

function save() {
  if (!form.value.glic) { app.toast('Inserisci il valore glicemico'); return }
  const entry = { type: 'glicemia', glic: Number(form.value.glic), trend: form.value.trend, when: form.value.when, note: form.value.note, ts: form.value.ts }
  if (isEdit.value && app.editEntry) {
    entriesStore.update(app.editEntry.id, entry)
    app.toast('✅ Glicemia aggiornata')
  } else {
    entriesStore.add(entry)
    app.toast('✅ Glicemia salvata — ' + form.value.glic + ' mg/dL')
  }
  close()
}

function del() {
  app.confirmDelete(app.editEntry.id)
  close()
}

function close() { app.closePanel() }
</script>
