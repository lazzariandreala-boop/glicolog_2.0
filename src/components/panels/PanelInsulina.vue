<template>
  <PanelBase :visible="visible">
    <div class="pt">💉 {{ isEdit ? 'Modifica insulina' : 'Nuova insulina' }}</div>

    <div class="fr">
      <span class="fl">Tipo</span>
      <SegmentControl :modelValue="form.insulinSubtype" @update:modelValue="onSubtypeChange" :options="subtypeOpts" color-class="p" />
    </div>

    <div class="fr">
      <span class="fl">Farmaco</span>
      <select class="fi" v-model="form.insulinType">
        <optgroup label="Rapida">
          <option v-for="opt in rapidaOpts" :key="opt" :value="opt">{{ opt }}</option>
        </optgroup>
        <optgroup label="Basale">
          <option v-for="opt in basaleOpts" :key="opt" :value="opt">{{ opt }}</option>
        </optgroup>
      </select>
    </div>

    <div class="fr">
      <span class="fl">Unità (U)</span>
      <input class="fi big" type="number" inputmode="decimal" step="0.5" min="0" v-model.number="form.units" placeholder="U" ref="inputRef" />
    </div>

    <div class="fr">
      <span class="fl">Note (opzionale)</span>
      <input class="fi" type="text" v-model="form.note" placeholder="es. bolo pasto, correzione…" />
    </div>

    <TimeRow v-model="form.ts" />

    <button class="bsave" style="background:var(--p);color:#000" @click="save">💾 Salva</button>
    <button v-if="isEdit" class="bdel" @click="del">Elimina</button>
    <button class="bdel" @click="close" style="margin-top:4px">Annulla</button>
  </PanelBase>
</template>

<script setup>
import { ref, watch, nextTick } from 'vue'
import { useAppStore } from '@/stores/app.js'
import { useEntriesStore, useConfigStore } from '@/stores/index.js'


import PanelBase from './PanelBase.vue'
import SegmentControl from '@/components/shared/SegmentControl.vue'
import TimeRow from '@/components/shared/TimeRow.vue'

const app = useAppStore()
const entriesStore = useEntriesStore()
const cfgStore = useConfigStore()

const visible = ref(false)
const isEdit = ref(false)
const inputRef = ref(null)

const subtypeOpts = [
  { value: 'Bolo', label: 'Bolo' },
  { value: 'Correzione', label: 'Correzione' },
  { value: 'Basale', label: 'Basale' },
]
const rapidaOpts = ['Humalog','Novorapid','Fiasp','Apidra','Lyumjev','Admelog','Regular']
const basaleOpts = ['Lantus','Toujeo','Tresiba','Levemir','Basaglar','Semglee','Ryzodeg']

const form = ref({ insulinSubtype: 'Bolo', insulinType: 'Humalog', units: null, note: '', ts: app.defaultTs() })

watch(() => app.openPanel, (p) => {
  visible.value = p === 'insulina'
  if (p === 'insulina') {
    const e = app.editEntry
    if (e && e._prefill) {
      isEdit.value = false
      form.value = { insulinSubtype: e.insulinSubtype || 'Bolo', insulinType: cfgStore.cfg.insRapida || 'Humalog', units: e.units || null, note: e.note || '', ts: e.ts || Date.now() }
    } else if (e) {
      isEdit.value = true
      form.value = { insulinSubtype: e.insulinSubtype||'Bolo', insulinType: e.insulinType||'Humalog', units: e.units, note: e.note||'', ts: e.ts }
    } else {
      isEdit.value = false
      form.value = { insulinSubtype: 'Bolo', insulinType: cfgStore.cfg.insRapida || 'Humalog', units: null, note: '', ts: app.defaultTs() }
    }
    nextTick(() => inputRef.value?.focus())
  }
})

function onSubtypeChange(val) {
  form.value.insulinSubtype = val
  const cfg = cfgStore.cfg
  if (val === 'Basale') {
    form.value.insulinType = cfg.insBasale || 'Lantus'
  } else {
    form.value.insulinType = cfg.insRapida || 'Humalog'
  }
}

function save() {
  if (!form.value.units || form.value.units <= 0) { app.toast('Inserisci le unità'); return }
  const entry = { type: 'insulina', insulinSubtype: form.value.insulinSubtype, insulinType: form.value.insulinType, units: Number(form.value.units), note: form.value.note, ts: form.value.ts }
  if (isEdit.value && app.editEntry) { entriesStore.update(app.editEntry.id, entry); app.toast('✅ Insulina aggiornata') }
  else { entriesStore.add(entry); app.toast('💉 ' + form.value.units + 'U salvate') }
  close()
}
function del() { app.confirmDelete(app.editEntry.id); close() }
function close() { app.closePanel() }
</script>
