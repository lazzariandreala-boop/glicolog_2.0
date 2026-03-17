<template>
  <PanelBase :visible="visible">
    <div class="pt" style="text-transform:uppercase;letter-spacing:.5px">🍎 {{ isEdit ? 'Modifica spuntino' : 'Nuovo Spuntino' }}</div>

    <div class="fr">
      <span class="fl">Cosa hai mangiato?</span>
      <div class="food-rows">
        <FoodRow
          v-for="(row, i) in form.foodRows"
          :key="row.id"
          :index="i"
          v-model:name="row.name"
          v-model:grams="row.grams"
          :c100="row.c100" :p100="row.p100" :g100="row.g100" :f100="row.f100" :k100="row.k100"
          @update:macros="m => updateRowMacros(i, m)"
          @remove="removeRow(i)"
        />
      </div>
      <div class="add-food-row">
        <button class="add-food-btn" @click="addRow">+ Aggiungi alimento</button>
      </div>
    </div>

    <div class="fr">
      <span class="fl">🩸 Glicemia (mg/dL)</span>
      <input class="fi big" type="number" inputmode="numeric" v-model.number="form.glic" placeholder="-" />
    </div>

    <div class="fr">
      <span class="fl">Direzionalità ↗↘</span>
      <TrendSelector v-model="form.trend" />
    </div>

    <!-- Bolo suggerito -->
    <div class="bolo-box o" :class="{ on: boloUnits > 0 }">
      <div class="bolo-ico">💉</div>
      <div class="bolo-body">
        <div class="bolo-val">{{ boloUnits.toFixed(1) }}U</div>
        <div class="bolo-lbl">Bolo suggerito dai carboidrati</div>
      </div>
      <div class="bolo-edit">
        <input type="number" inputmode="decimal" step="0.5" min="0" placeholder="U" v-model.number="form.boloOverride" />
      </div>
    </div>

    <div class="mbox">
      <div class="mbox-t">
        <span>🥗 Macronutrienti</span>
        <button class="mbox-suggest" @click="form.mC=null;form.mP=null;form.mG=null;form.mF=null">✨ Suggerisci macro</button>
      </div>
      <div class="g4">
        <div class="fr"><span class="fl">Carbo g</span><input class="fi" type="number" inputmode="decimal" v-model.number="form.mC" :placeholder="String(totals.c)" /></div>
        <div class="fr"><span class="fl">Prot g</span><input class="fi" type="number" inputmode="decimal" v-model.number="form.mP" :placeholder="String(totals.p)" /></div>
        <div class="fr"><span class="fl">Grassi g</span><input class="fi" type="number" inputmode="decimal" v-model.number="form.mG" :placeholder="String(totals.g)" /></div>
        <div class="fr"><span class="fl">Fibre g</span><input class="fi" type="number" inputmode="decimal" v-model.number="form.mF" :placeholder="String(totals.f)" /></div>
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
import { useEntriesStore, useConfigStore } from '@/stores/index.js'
import PanelBase from './PanelBase.vue'
import FoodRow from '@/components/shared/FoodRow.vue'
import TimeRow from '@/components/shared/TimeRow.vue'
import TrendSelector from '@/components/shared/TrendSelector.vue'

const app = useAppStore()
const entriesStore = useEntriesStore()
const cfgStore = useConfigStore()
const visible = ref(false)
const isEdit = ref(false)

const defaultRow = () => ({ id: Date.now() + Math.random(), name: '', grams: 0, c100:0, p100:0, g100:0, f100:0, k100:0, isDrink:false })
const form = ref({ foodRows: [defaultRow()], glic: null, trend: '→', boloOverride: null, mC: null, mP: null, mG: null, mF: null, ts: app.defaultTs() })

const totals = computed(() => {
  let c=0,p=0,g=0,f=0,k=0
  form.value.foodRows.forEach(row => {
    const gr = row.grams||0
    c+=(row.c100||0)*gr/100; p+=(row.p100||0)*gr/100; g+=(row.g100||0)*gr/100; f+=(row.f100||0)*gr/100; k+=(row.k100||0)*gr/100
  })
  return { c: Math.round(c*10)/10, p: Math.round(p*10)/10, g: Math.round(g*10)/10, f: Math.round(f*10)/10, k: Math.round(k) }
})

function addRow() { form.value.foodRows.push(defaultRow()) }
function removeRow(i) { form.value.foodRows.splice(i, 1) }
function updateRowMacros(i, m) {
  if (!form.value.foodRows[i]) return
  Object.assign(form.value.foodRows[i], { c100: m.c, p100: m.p, g100: m.g, f100: m.f, k100: m.k })
}

const effCarbs = computed(() => form.value.mC || totals.value.c || 0)
const boloUnits = computed(() => {
  const cfg = cfgStore.cfg
  if (!effCarbs.value || !cfg.ic) return 0
  let bolo = effCarbs.value / cfg.ic
  if (form.value.glic && cfg.targetMax && cfg.fsi) {
    const excess = form.value.glic - cfg.targetMax
    if (excess > 0) bolo += excess / cfg.fsi
  }
  return Math.round(bolo * 2) / 2
})

watch(totals, (t) => {
  form.value.mC = t.c || null
  form.value.mP = t.p || null
  form.value.mG = t.g || null
  form.value.mF = t.f || null
})

watch(() => app.openPanel, (p) => {
  visible.value = p === 'spuntino'
  if (p === 'spuntino') {
    const e = app.editEntry
    isEdit.value = !!e
    if (e) form.value = { foodRows: e.foodRows?.length ? e.foodRows.map(r=>({...defaultRow(),...r})) : [defaultRow()], glic: e.glic||null, trend: e.trend||'→', boloOverride: e.bolo||null, mC: e.carbs||null, mP: e.protein||null, mG: e.fat||null, mF: e.fiber||null, ts: e.ts }
    else form.value = { foodRows: [defaultRow()], glic: null, trend: '→', boloOverride: null, mC: null, mP: null, mG: null, mF: null, ts: app.defaultTs() }
  }
})

function save() {
  const entry = { type: 'spuntino', foodRows: form.value.foodRows.filter(r=>r.name), food: form.value.foodRows.map(r=>r.name).filter(Boolean).join(', '), glic: form.value.glic, trend: form.value.glic ? form.value.trend : null, bolo: form.value.boloOverride ?? boloUnits.value, carbs: form.value.mC??totals.value.c, protein: form.value.mP??totals.value.p, fat: form.value.mG??totals.value.g, fiber: form.value.mF??totals.value.f, kcal: totals.value.k, ts: form.value.ts }
  if (isEdit.value && app.editEntry) { entriesStore.update(app.editEntry.id, entry); app.toast('✅ Spuntino aggiornato') }
  else { entriesStore.add(entry); app.toast('🍎 Spuntino salvato') }
  close()
}
function del() { app.confirmDelete(app.editEntry.id); close() }
function close() { app.closePanel() }
</script>
