<template>
  <PanelBase :visible="visible">
    <div class="pt">🍬 Nuova Correzione Cibo</div>

    <!-- Food rows -->
    <div class="fr">
      <span class="fl">Cosa hai mangiato/bevuto?</span>
      <div class="food-rows">
        <FoodRow
          v-for="(row, i) in form.foodRows"
          :key="row.id"
          :index="i"
          v-model:name="row.name"
          v-model:grams="row.grams"
          :c100="row.c100" :p100="row.p100" :g100="row.g100" :f100="row.f100" :k100="row.k100"
          :is-drink="row.isDrink"
          @update:macros="m => updateRowMacros(i, m)"
          @remove="removeRow(i)"
        />
      </div>
      <div class="add-food-row">
        <button class="add-food-btn" @click="addRow">+ Aggiungi alimento</button>
      </div>
    </div>

    <!-- Macro box -->
    <div class="mbox">
      <div class="mbox-t">
        <span>🥗 Macronutrienti (opzionale override)</span>
      </div>
      <div class="g4">
        <div class="fr"><span class="fl">Carbo g</span><input class="fi" type="number" inputmode="decimal" v-model.number="form.mC" placeholder="0" /></div>
        <div class="fr"><span class="fl">Prot g</span><input class="fi" type="number" inputmode="decimal" v-model.number="form.mP" placeholder="0" /></div>
        <div class="fr"><span class="fl">Grassi g</span><input class="fi" type="number" inputmode="decimal" v-model.number="form.mG" placeholder="0" /></div>
        <div class="fr"><span class="fl">Fibre g</span><input class="fi" type="number" inputmode="decimal" v-model.number="form.mF" placeholder="0" /></div>
      </div>
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
import PanelBase from './PanelBase.vue'
import FoodRow from '@/components/shared/FoodRow.vue'
import TimeRow from '@/components/shared/TimeRow.vue'

const app = useAppStore()
const entriesStore = useEntriesStore()

const visible = ref(false)
const isEdit = ref(false)

const defaultRow = () => ({ id: Date.now() + Math.random(), name: '', grams: 0, c100: 0, p100: 0, g100: 0, f100: 0, k100: 0, isDrink: false })

const form = ref({ foodRows: [defaultRow()], mC: null, mP: null, mG: null, mF: null, ts: Date.now() })

const totals = computed(() => {
  let c = 0, p = 0, g = 0, f = 0, k = 0
  form.value.foodRows.forEach(row => {
    const grams = row.grams || 0
    c += (row.c100 || 0) * grams / 100
    p += (row.p100 || 0) * grams / 100
    g += (row.g100 || 0) * grams / 100
    f += (row.f100 || 0) * grams / 100
    k += (row.k100 || 0) * grams / 100
  })
  return { c: Math.round(c * 10) / 10, p: Math.round(p * 10) / 10, g: Math.round(g * 10) / 10, f: Math.round(f * 10) / 10, k: Math.round(k) }
})

function addRow() { form.value.foodRows.push(defaultRow()) }
function removeRow(i) { form.value.foodRows.splice(i, 1) }
function updateRowMacros(i, m) { if (form.value.foodRows[i]) form.value.foodRows[i].c100 = m.c ? Math.round(m.c / (m.grams||1) * 100 * 10) / 10 : form.value.foodRows[i].c100 }

watch(() => app.openPanel, (p) => {
  visible.value = p === 'correzione'
  if (p === 'correzione') {
    const e = app.editEntry
    isEdit.value = !!e
    if (e) form.value = { foodRows: e.foodRows?.length ? e.foodRows.map(r => ({ ...defaultRow(), ...r })) : [defaultRow()], mC: e.carbs || null, mP: e.protein || null, mG: e.fat || null, mF: e.fiber || null, ts: e.ts }
    else form.value = { foodRows: [defaultRow()], mC: null, mP: null, mG: null, mF: null, ts: Date.now() }
  }
})

function save() {
  const entry = { type: 'correzione', foodRows: form.value.foodRows.filter(r => r.name), food: form.value.foodRows.map(r => r.name).filter(Boolean).join(', '), carbs: form.value.mC ?? totals.value.c, protein: form.value.mP ?? totals.value.p, fat: form.value.mG ?? totals.value.g, fiber: form.value.mF ?? totals.value.f, kcal: totals.value.k, ts: form.value.ts }
  if (isEdit.value && app.editEntry) { entriesStore.update(app.editEntry.id, entry); app.toast('✅ Correzione aggiornata') }
  else { entriesStore.add(entry); app.toast('🍬 Correzione salvata') }
  close()
}

function del() { app.confirmDelete(app.editEntry.id); close() }
function close() { app.closePanel() }
</script>