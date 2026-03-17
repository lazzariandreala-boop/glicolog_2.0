<template>
  <PanelBase :visible="visible">
    <div class="pt">🥂 {{ isEdit ? 'Modifica aperitivo' : 'Nuovo aperitivo' }}</div>

    <!-- BEVANDE ALCOLICHE -->
    <div class="pdiv">🍷 Bevande</div>
    <div class="food-rows">
      <div v-for="(row, i) in form.drinks" :key="row.id" class="food-row">
        <div class="aperi-row">
          <select class="fi aperi-sel" v-model="row.typeKey">
            <option value="">— bevanda —</option>
            <template v-for="(keys, grp) in alcGroups" :key="grp">
              <optgroup :label="grp">
                <option v-for="k in keys" :key="k" :value="k">{{ alcDb[k]?.ico }} {{ alcDb[k]?.l }}</option>
              </optgroup>
            </template>
          </select>
          <div class="fr-qty-wrap aperi-qty">
            <input class="fi fr-qty-inp" type="number" inputmode="numeric" v-model.number="row.qty" min="1" max="20" />
            <span class="fr-unit">×</span>
          </div>
          <button class="fr-del-btn" @click="removeDrink(i)">×</button>
        </div>
        <div class="fr-macros" v-if="row.typeKey && alcDb[row.typeKey]">
          <span class="food-row-mac-chip"><span>{{ (alcDb[row.typeKey].u * row.qty).toFixed(1) }}</span> U alc</span>
          <span class="food-row-mac-chip fc"><span>{{ Math.round((alcDb[row.typeKey].c||0) * row.qty) }}g</span> carbo</span>
          <span class="food-row-mac-chip"><span>{{ Math.round(alcDb[row.typeKey].k * row.qty) }}</span> kcal</span>
        </div>
      </div>
      <div class="add-food-row">
        <button class="add-food-btn" @click="addDrink">+ Aggiungi bevanda</button>
      </div>
    </div>

    <!-- STUZZICHINI -->
    <div class="pdiv">🍟 Cibo</div>
    <div class="food-rows">
      <div v-for="(row, i) in form.items" :key="row.id" class="food-row">
        <div class="aperi-row">
          <select class="fi aperi-sel" v-model="row.itemKey" @change="onChangeItem(i)">
            <option value="">— stuzzichino —</option>
            <template v-for="(items, grp) in aperiGroups" :key="grp">
              <optgroup :label="grp">
                <option v-for="item in items" :key="item.k" :value="item.k">{{ item.ico }} {{ item.l }}</option>
              </optgroup>
            </template>
          </select>
          <div class="fr-qty-wrap aperi-qty">
            <input class="fi fr-qty-inp" type="number" inputmode="numeric" v-model.number="row.grams" min="1" max="500" />
            <span class="fr-unit">g</span>
          </div>
          <button class="fr-del-btn" @click="removeItem(i)">×</button>
        </div>
        <div class="fr-macros" v-if="row.itemKey && macForItem(row)">
          <span class="food-row-mac-chip fc"><span>{{ macForItem(row).c.toFixed(1) }}g</span> C</span>
          <span class="food-row-mac-chip"><span>{{ macForItem(row).k }}</span> kcal</span>
        </div>
      </div>
      <div class="add-food-row">
        <button class="add-food-btn" @click="addItem">+ Aggiungi stuzzichino</button>
      </div>
    </div>

    <!-- Riepilogo totale -->
    <div class="alc-info-box" v-if="totals.units > 0 || totals.carbs > 0">
      <div class="alc-info-row" v-if="totals.units > 0">
        <span>Unità alcool</span>
        <span class="alc-info-val">{{ totals.units.toFixed(1) }} U</span>
      </div>
      <div class="alc-info-row">
        <span>Carboidrati totali</span>
        <span class="alc-info-val fc">{{ totals.carbs.toFixed(1) }}g</span>
      </div>
      <div class="alc-info-row">
        <span>Calorie totali</span>
        <span class="alc-info-val">{{ totals.kcal }} kcal</span>
      </div>
      <div class="alc-info-row" v-if="totals.units > 0">
        <span>Questa settimana</span>
        <span :style="{ color: weekUnits > cfgStore.cfg.alcMax ? 'var(--r)' : 'var(--alc)' }">{{ weekUnits.toFixed(1) }}/{{ cfgStore.cfg.alcMax }} U</span>
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
import { ALCDB, ALC_GROUPS, APERIDB } from '@/data/constants.js'
import PanelBase from './PanelBase.vue'
import TimeRow from '@/components/shared/TimeRow.vue'

const app = useAppStore()
const entriesStore = useEntriesStore()
const cfgStore = useConfigStore()
const visible = ref(false)
const isEdit = ref(false)

const alcDb = ALCDB
const alcGroups = ALC_GROUPS

const aperiGroups = computed(() => {
  const groups = {}
  Object.entries(APERIDB).forEach(([k, v]) => {
    if (!groups[v.grp]) groups[v.grp] = []
    groups[v.grp].push({ k, ...v })
  })
  return groups
})

const defaultDrink = () => ({ id: Date.now() + Math.random(), typeKey: '', qty: 1 })
const defaultItem  = () => ({ id: Date.now() + Math.random(), itemKey: '', grams: 30 })

const form = ref({ drinks: [defaultDrink()], items: [], ts: app.defaultTs() })

function addDrink() { form.value.drinks.push(defaultDrink()) }
function removeDrink(i) { form.value.drinks.splice(i, 1) }
function addItem() { form.value.items.push(defaultItem()) }
function removeItem(i) { form.value.items.splice(i, 1) }

function onChangeItem(i) {
  const k = form.value.items[i].itemKey
  if (k && APERIDB[k]) form.value.items[i].grams = APERIDB[k].def || 30
}

function macForItem(row) {
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
  let units = 0, alcCarbs = 0, alcKcal = 0
  form.value.drinks.forEach(r => {
    const a = alcDb[r.typeKey]
    if (!a) return
    units += a.u * r.qty
    alcCarbs += (a.c || 0) * r.qty
    alcKcal += a.k * r.qty
  })
  let foodCarbs = 0, foodKcal = 0
  form.value.items.forEach(row => {
    const m = macForItem(row)
    if (m) { foodCarbs += m.c; foodKcal += m.k }
  })
  return {
    units: Math.round(units * 10) / 10,
    carbs: Math.round((alcCarbs + foodCarbs) * 10) / 10,
    kcal: Math.round(alcKcal + foodKcal),
  }
})

const weekUnits = computed(() => entriesStore.weekAlcUnits())

watch(() => app.openPanel, (p) => {
  visible.value = p === 'aperitivi'
  if (p === 'aperitivi') {
    const e = app.editEntry
    isEdit.value = !!e
    if (e) {
      form.value = {
        drinks: e.drinks?.length ? e.drinks.map(d => ({ id: Date.now()+Math.random(), typeKey: d.k, qty: d.qty })) : [defaultDrink()],
        items: e.items?.length ? e.items.map(it => ({ id: Date.now()+Math.random(), itemKey: it.k, grams: it.grams })) : [],
        ts: e.ts
      }
    } else {
      form.value = { drinks: [defaultDrink()], items: [], ts: app.defaultTs() }
    }
  }
})

function save() {
  const validDrinks = form.value.drinks.filter(r => r.typeKey)
  const validItems  = form.value.items.filter(r => r.itemKey)
  if (!validDrinks.length && !validItems.length) { app.toast('Aggiungi almeno una bevanda o stuzzichino'); return }

  const drinkLabels = validDrinks.map(r => { const a = alcDb[r.typeKey]; return r.qty > 1 ? `${r.qty}× ${a.l}` : a.l })
  const itemLabels  = validItems.map(r => { const it = APERIDB[r.itemKey]; return `${r.grams}g ${it.l}` })
  const label = [...drinkLabels, ...itemLabels].join(', ')

  const entry = {
    type: 'aperitivi',
    label,
    drinks: validDrinks.map(r => ({ k: r.typeKey, qty: r.qty })),
    items:  validItems.map(r => ({ k: r.itemKey, grams: r.grams })),
    units:  totals.value.units,
    carbs:  totals.value.carbs,
    kcal:   totals.value.kcal,
    ts: form.value.ts
  }

  if (isEdit.value && app.editEntry) {
    entriesStore.update(app.editEntry.id, entry)
    app.toast('✅ Aperitivo aggiornato')
  } else {
    entriesStore.add(entry)
    const max = cfgStore.cfg.alcMax
    const week = weekUnits.value + totals.value.units
    week > max
      ? app.toast(`⚠️ Limite superato! ${week.toFixed(1)}/${max}U`)
      : app.toast(`🥂 Aperitivo salvato`)
  }

  // Proponi insulina se ci sono carboidrati
  const carbs = totals.value.carbs
  if (!isEdit.value && carbs > 5 && cfgStore.cfg.ic) {
    const units = Math.max(0.5, Math.round(carbs / cfgStore.cfg.ic * 2) / 2)
    app.triggerGlicAlert({
      type: 'insulin_prompt',
      title: '💉 Bolo per l\'aperitivo?',
      msg: `${carbs.toFixed(1)}g di carboidrati totali. Vuoi fare il bolo?`,
      suggestedUnits: units,
      note: `Bolo aperitivo (${label})`,
      glucoseTs: form.value.ts
    })
  }
  close()
}
function del() { app.confirmDelete(app.editEntry.id); close() }
function close() { app.closePanel() }
</script>
