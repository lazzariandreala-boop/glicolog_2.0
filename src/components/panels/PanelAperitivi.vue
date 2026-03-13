<template>
  <PanelBase :visible="visible">
    <div class="pt">🥂 {{ isEdit ? 'Modifica aperitivo' : 'Nuovo aperitivo' }}</div>

    <div class="fr">
      <span class="fl">Stuzzichini</span>
      <div>
        <div v-for="(row, i) in form.rows" :key="row.id" class="food-row">
          <div class="fr-top">
            <div class="fr-name-wrap" style="flex:1">
              <select class="fi fr-name-inp" v-model="row.itemKey" @change="onChangeItem(i)">
                <option value="">— stuzzichino —</option>
                <template v-for="(items, grp) in aperiGroups" :key="grp">
                  <optgroup :label="grp">
                    <option v-for="item in items" :key="item.k" :value="item.k">{{ item.ico }} {{ item.l }}</option>
                  </optgroup>
                </template>
              </select>
            </div>
            <div class="fr-right">
              <div class="fr-qty-wrap">
                <input class="fi fr-qty-inp" type="number" inputmode="numeric" v-model.number="row.grams" min="1" max="500" @input="recalc" />
                <span class="fr-unit">g</span>
              </div>
              <button class="fr-del-btn" @click="removeRow(i)">×</button>
            </div>
          </div>
          <div class="fr-macros" v-if="row.itemKey && macForRow(row)">
            <span class="food-row-mac-chip fc"><span>{{ macForRow(row).c.toFixed(1) }}g</span> C</span>
            <span class="food-row-mac-chip"><span>{{ macForRow(row).k }}</span> kcal</span>
          </div>
        </div>
        <div class="add-food-row">
          <button class="add-food-btn" @click="addRow">+ Aggiungi stuzzichino</button>
        </div>
      </div>
    </div>

    <!-- Totali -->
    <div class="food-rows-total" v-if="totals.c > 0 || totals.k > 0">
      <span class="food-rows-total-lbl">TOTALE</span>
      <span class="food-row-mac-chip fc"><span>{{ totals.c.toFixed(1) }}g</span> carbo</span>
      <span class="food-row-mac-chip"><span>{{ totals.p.toFixed(1) }}g</span> prot</span>
      <span class="food-row-mac-chip"><span>{{ totals.k }}</span> kcal</span>
    </div>

    <TimeRow v-model="form.ts" />

    <button class="bsave" style="background:var(--o);color:#000" @click="save">💾 Salva</button>
    <button v-if="isEdit" class="bdel" @click="del">Elimina</button>
    <button class="bdel" @click="close" style="margin-top:4px">Annulla</button>
  </PanelBase>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { useAppStore } from '@/stores/app.js'
import { useEntriesStore } from '@/stores/index.js'
import { APERIDB } from '@/data/constants.js'
import PanelBase from './PanelBase.vue'
import TimeRow from '@/components/shared/TimeRow.vue'

const app = useAppStore()
const entriesStore = useEntriesStore()
const visible = ref(false)
const isEdit = ref(false)

// Raggruppa APERIDB per categoria
const aperiGroups = computed(() => {
  const groups = {}
  Object.entries(APERIDB).forEach(([k, v]) => {
    if (!groups[v.grp]) groups[v.grp] = []
    groups[v.grp].push({ k, ...v })
  })
  return groups
})

const defaultRow = () => ({ id: Date.now() + Math.random(), itemKey: '', grams: 30 })
const form = ref({ rows: [defaultRow()], ts: Date.now() })

function onChangeItem(i) {
  const k = form.value.rows[i].itemKey
  if (k && APERIDB[k]) form.value.rows[i].grams = APERIDB[k].def || 30
  recalc()
}
function addRow() { form.value.rows.push(defaultRow()) }
function removeRow(i) { form.value.rows.splice(i, 1) }
function recalc() {}

function macForRow(row) {
  const item = APERIDB[row.itemKey]
  if (!item || !row.grams) return null
  const g = row.grams
  return {
    c: Math.round(item.c100 * g / 100 * 10) / 10,
    p: Math.round(item.p100 * g / 100 * 10) / 10,
    fat: Math.round(item.g100 * g / 100 * 10) / 10,
    k: Math.round((item.c100 * 4 + item.p100 * 4 + item.g100 * 9) * g / 100),
  }
}

const totals = computed(() => {
  let c=0, p=0, fat=0, k=0
  form.value.rows.forEach(row => {
    const m = macForRow(row)
    if (m) { c+=m.c; p+=m.p; fat+=m.fat; k+=m.k }
  })
  return { c: Math.round(c*10)/10, p: Math.round(p*10)/10, fat: Math.round(fat*10)/10, k: Math.round(k) }
})

watch(() => app.openPanel, (p) => {
  visible.value = p === 'aperitivi'
  if (p === 'aperitivi') {
    const e = app.editEntry
    isEdit.value = !!e
    if (e && e.items) {
      form.value = { rows: e.items.map(it => ({ id: Date.now()+Math.random(), itemKey: it.k, grams: it.grams })), ts: e.ts }
    } else {
      form.value = { rows: [defaultRow()], ts: Date.now() }
    }
  }
})

function save() {
  const valid = form.value.rows.filter(r => r.itemKey)
  if (!valid.length) { app.toast('Aggiungi almeno uno stuzzichino'); return }
  const labels = valid.map(r => { const it = APERIDB[r.itemKey]; return `${r.grams}g ${it.l}` })
  const entry = {
    type: 'aperitivi',
    label: labels.join(', '),
    items: valid.map(r => ({ k: r.itemKey, grams: r.grams })),
    carbs: totals.value.c, protein: totals.value.p, fat: totals.value.fat, kcal: totals.value.k,
    ts: form.value.ts
  }
  if (isEdit.value && app.editEntry) { entriesStore.update(app.editEntry.id, entry); app.toast('✅ Aperitivo aggiornato') }
  else { entriesStore.add(entry); app.toast('🥂 Aperitivo salvato') }
  close()
}
function del() { app.confirmDelete(app.editEntry.id); close() }
function close() { app.closePanel() }
</script>
