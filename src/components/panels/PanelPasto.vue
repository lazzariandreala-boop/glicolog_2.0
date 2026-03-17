<template>
  <PanelBase :visible="visible">
    <div class="pt" style="text-transform:uppercase;letter-spacing:.5px">🍽️ {{ isEdit ? 'Modifica pasto' : 'Nuovo Pasto' }}</div>

    <!-- Tipo pasto -->
    <div class="fr">
      <span class="fl">Tipo pasto</span>
      <SegmentControl v-model="form.mealType" :options="mealTypes" color-class="g" />
    </div>

    <!-- Food rows -->
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
          :is-drink="row.isDrink"
          @update:macros="m => updateRowMacros(i, m)"
          @remove="removeRow(i)"
        />
      </div>
      <!-- Riepilogo macro totali -->
      <div v-if="form.foodRows.length > 1 && (totals.c > 0 || totals.k > 0)" class="food-rows-total">
        <span class="food-rows-total-lbl">TOTALE</span>
        <span class="food-row-mac-chip fc"><span>{{ totals.c.toFixed(1) }}g</span> C</span>
        <span class="food-row-mac-chip"><span>{{ totals.p.toFixed(1) }}g</span> P</span>
        <span class="food-row-mac-chip"><span>{{ totals.k }}</span> kcal</span>
      </div>
      <div class="add-food-row">
        <button class="add-food-btn" @click="addRow">+ Aggiungi alimento</button>
      </div>
    </div>

    <!-- Glicemia -->
    <div class="fr">
      <span class="fl">🩸 Glicemia (mg/dL)</span>
      <input class="fi big" type="number" inputmode="numeric" v-model.number="form.glic" placeholder="—" />
    </div>

    <!-- Direzionalità -->
    <div class="fr">
      <span class="fl">Direzionalità ↗↘</span>
      <TrendSelector v-model="form.trend" />
    </div>

    <!-- Bolo suggerito -->
    <div class="bolo-box g" :class="{ on: boloUnits > 0 }">
      <div class="bolo-ico">💉</div>
      <div class="bolo-body">
        <div class="bolo-val">{{ boloUnits.toFixed(1) }}U</div>
        <div class="bolo-lbl">Bolo suggerito dai carboidrati</div>
      </div>
      <div class="bolo-edit">
        <input type="number" inputmode="decimal" step="0.5" min="0" placeholder="U" v-model.number="form.boloOverride" />
      </div>
    </div>

    <!-- Macro box -->
    <div class="mbox">
      <div class="mbox-t">
        <span>🥗 Macronutrienti</span>
        <button class="mbox-suggest" @click="resetMacros">✨ Suggerisci macro</button>
      </div>
      <div class="g4">
        <div class="fr"><span class="fl">Carbo g</span><input class="fi" type="number" inputmode="decimal" v-model.number="form.mC" :placeholder="String(totals.c)" /></div>
        <div class="fr"><span class="fl">Prot g</span><input class="fi" type="number" inputmode="decimal" v-model.number="form.mP" :placeholder="String(totals.p)" /></div>
        <div class="fr"><span class="fl">Grassi g</span><input class="fi" type="number" inputmode="decimal" v-model.number="form.mG" :placeholder="String(totals.g)" /></div>
        <div class="fr"><span class="fl">Fibre g</span><input class="fi" type="number" inputmode="decimal" v-model.number="form.mF" :placeholder="String(totals.f)" /></div>
      </div>
    </div>

    <TimeRow v-model="form.ts" />

    <button class="bsave" @click="save">💾 Salva pasto</button>
    <button v-if="isEdit" class="bdel" @click="del">Elimina</button>
    <button class="bdel" @click="close" style="margin-top:4px">Annulla</button>
  </PanelBase>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { useAppStore } from '@/stores/app.js'
import { useEntriesStore, useConfigStore } from '@/stores/index.js'
import PanelBase from './PanelBase.vue'
import SegmentControl from '@/components/shared/SegmentControl.vue'
import TrendSelector from '@/components/shared/TrendSelector.vue'
import FoodRow from '@/components/shared/FoodRow.vue'
import TimeRow from '@/components/shared/TimeRow.vue'

const app = useAppStore()
const entriesStore = useEntriesStore()
const cfgStore = useConfigStore()

const visible = ref(false)
const isEdit = ref(false)

const mealTypes = [
  { value: 'Colazione', label: 'Colazione' },
  { value: 'Pranzo', label: 'Pranzo' },
  { value: 'Cena', label: 'Cena' },
]

const defaultRow = () => ({ id: Date.now() + Math.random(), name: '', grams: 0, c100: 0, p100: 0, g100: 0, f100: 0, k100: 0, isDrink: false, macros: { c: 0, p: 0, g: 0, f: 0, k: 0 } })

const form = ref({
  mealType: 'Pranzo',
  foodRows: [defaultRow()],
  glic: null, trend: '→',
  boloOverride: null,
  mC: null, mP: null, mG: null, mF: null,
  ts: app.defaultTs()
})

// Calcolo totali macro dalle food rows
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
  return {
    c: Math.round(c * 10) / 10,
    p: Math.round(p * 10) / 10,
    g: Math.round(g * 10) / 10,
    f: Math.round(f * 10) / 10,
    k: Math.round(k),
  }
})

// Carboidrati effettivi per il bolo (da food rows o da mC se inserito manualmente)
const effCarbs = computed(() => form.value.mC || totals.value.c || 0)

// Bolo suggerito
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

function addRow() { form.value.foodRows.push(defaultRow()) }
function removeRow(i) { form.value.foodRows.splice(i, 1) }
function triggerScan() { addRow() }  // aggiunge una riga e l'utente scansiona da lì
function resetMacros() { form.value.mC = null; form.value.mP = null; form.value.mG = null; form.value.mF = null }
function updateRowMacros(i, m) {
  if (!form.value.foodRows[i]) return
  // m.c/p/g/f/k are per-100g values emitted by FoodRow
  Object.assign(form.value.foodRows[i], { c100: m.c, p100: m.p, g100: m.g, f100: m.f, k100: m.k })
}

watch(totals, (t) => {
  form.value.mC = t.c || null
  form.value.mP = t.p || null
  form.value.mG = t.g || null
  form.value.mF = t.f || null
})

watch(() => app.openPanel, (p) => {
  visible.value = p === 'pasto'
  if (p === 'pasto') {
    const e = app.editEntry
    isEdit.value = !!e
    if (e) {
      form.value = {
        mealType: e.mealType || 'Pranzo',
        foodRows: e.foodRows?.length ? e.foodRows.map(r => ({ ...defaultRow(), ...r })) : [defaultRow()],
        glic: e.glic || null, trend: e.trend || '',
        boloOverride: e.bolo || null,
        mC: e.carbs || null, mP: e.protein || null, mG: e.fat || null, mF: e.fiber || null,
        ts: e.ts
      }
    } else {
      const h = new Date().getHours()
      const mt = h < 11 ? 'Colazione' : h < 15 ? 'Pranzo' : 'Cena'
      form.value = { mealType: mt, foodRows: [defaultRow()], glic: null, trend: '→', boloOverride: null, mC: null, mP: null, mG: null, mF: null, ts: app.defaultTs() }
    }
  }
})

function getCarbs() { return form.value.mC ?? totals.value.c }
function getKcal()  { return totals.value.k }

function save() {
  const hasFood = form.value.foodRows.some(r => r.name)
  if (!hasFood && !form.value.mealType) { app.toast('Aggiungi almeno un alimento'); return }

  const entry = {
    type:      'pasto',
    mealType:  form.value.mealType,
    foodRows:  form.value.foodRows.filter(r => r.name),
    food:      form.value.foodRows.map(r => r.name).filter(Boolean).join(', '),
    glic:      form.value.glic,
    trend:     form.value.trend,
    bolo:      form.value.boloOverride ?? boloUnits.value,
    carbs:     getCarbs(),
    protein:   form.value.mP ?? totals.value.p,
    fat:       form.value.mG ?? totals.value.g,
    fiber:     form.value.mF ?? totals.value.f,
    kcal:      getKcal(),
    ts:        form.value.ts
  }

  if (isEdit.value && app.editEntry) {
    entriesStore.update(app.editEntry.id, entry)
    app.toast('✅ Pasto aggiornato')
  } else {
    entriesStore.add(entry)
    app.toast('✅ ' + (form.value.mealType || 'Pasto') + ' salvato')
  }
  close()
}

function del() { app.confirmDelete(app.editEntry.id); close() }
function close() { app.closePanel() }
</script>
