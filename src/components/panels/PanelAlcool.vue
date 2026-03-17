<template>
  <PanelBase :visible="visible">
    <div class="pt">🍷 {{ isEdit ? 'Modifica consumo' : 'Nuovo consumo alcolico' }}</div>

    <!-- Righe bevande -->
    <div class="fr">
      <span class="fl">Bevande</span>
      <div>
        <div v-for="(row, i) in form.rows" :key="row.id" class="food-row">
          <div class="fr-top">
            <div class="fr-name-wrap" style="flex:1">
              <select class="fi fr-name-inp" v-model="row.typeKey" @change="recalc">
                <option value="">— bevanda —</option>
                <template v-for="(keys, grp) in alcGroups" :key="grp">
                  <optgroup :label="grp">
                    <option v-for="k in keys" :key="k" :value="k">{{ alcDb[k]?.ico }} {{ alcDb[k]?.l }}</option>
                  </optgroup>
                </template>
              </select>
            </div>
            <div class="fr-right">
              <div class="fr-qty-wrap">
                <input class="fi fr-qty-inp" type="number" inputmode="numeric" v-model.number="row.qty" min="1" max="20" @input="recalc" />
                <span class="fr-unit">×</span>
              </div>
              <button class="fr-del-btn" @click="removeRow(i)">×</button>
            </div>
          </div>
          <!-- Macro chip riga -->
          <div class="fr-macros" v-if="row.typeKey && alcDb[row.typeKey]">
            <span class="food-row-mac-chip"><span>{{ (alcDb[row.typeKey].u * row.qty).toFixed(1) }}</span> U alc</span>
            <span class="food-row-mac-chip"><span>{{ Math.round(alcDb[row.typeKey].k * row.qty) }}</span> kcal</span>
          </div>
        </div>
        <div class="add-food-row">
          <button class="add-food-btn" @click="addRow">+ Aggiungi bevanda</button>
        </div>
      </div>
    </div>

    <!-- Riepilogo totale -->
    <div class="alc-info-box" v-if="totals.units > 0">
      <div class="alc-info-row">
        <span>Unità alcool totali</span>
        <span class="alc-info-val">{{ totals.units.toFixed(1) }} U</span>
      </div>
      <div class="alc-info-row">
        <span>Calorie totali</span>
        <span class="alc-info-val">{{ totals.kcal }} kcal</span>
      </div>
      <div class="alc-info-row">
        <span>Questa settimana</span>
        <span :style="{ color: weekUnits > cfgStore.cfg.alcMax ? 'var(--r)' : 'var(--alc)' }">{{ weekUnits.toFixed(1) }}/{{ cfgStore.cfg.alcMax }} U</span>
      </div>
    </div>

    <TimeRow v-model="form.ts" />

    <button class="bsave" style="background:var(--alc);color:#000" @click="save">💾 Salva</button>
    <button v-if="isEdit" class="bdel" @click="del">Elimina</button>
    <button class="bdel" @click="close" style="margin-top:4px">Annulla</button>
  </PanelBase>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { useAppStore } from '@/stores/app.js'
import { useEntriesStore, useConfigStore } from '@/stores/index.js'
import { ALCDB, ALC_GROUPS } from '@/data/constants.js'
import PanelBase from './PanelBase.vue'
import TimeRow from '@/components/shared/TimeRow.vue'

const app = useAppStore()
const entriesStore = useEntriesStore()
const cfgStore = useConfigStore()

const visible = ref(false)
const isEdit = ref(false)
const alcDb = ALCDB
const alcGroups = ALC_GROUPS

const defaultRow = () => ({ id: Date.now() + Math.random(), typeKey: '', qty: 1 })
const form = ref({ rows: [defaultRow()], ts: app.defaultTs() })

const totals = computed(() => {
  let units = 0, kcal = 0, carbs = 0, protein = 0, fat = 0
  form.value.rows.forEach(r => {
    const a = alcDb[r.typeKey]
    if (!a) return
    units  += a.u * r.qty
    kcal   += a.k * r.qty
    carbs  += (a.c || 0) * r.qty
    protein+= (a.p || 0) * r.qty
    fat    += (a.g || 0) * r.qty
  })
  return { units: Math.round(units*10)/10, kcal: Math.round(kcal), carbs: Math.round(carbs*10)/10, protein: Math.round(protein*10)/10, fat: Math.round(fat*10)/10 }
})

const weekUnits = computed(() => entriesStore.weekAlcUnits())

function addRow() { form.value.rows.push(defaultRow()) }
function removeRow(i) { form.value.rows.splice(i, 1) }
function recalc() {}

watch(() => app.openPanel, (p) => {
  visible.value = p === 'alcool'
  if (p === 'alcool') {
    const e = app.editEntry
    isEdit.value = !!e
    if (e && e.drinks) {
      form.value = { rows: e.drinks.map(d => ({ id: Date.now()+Math.random(), typeKey: d.k, qty: d.qty })), ts: e.ts }
    } else {
      form.value = { rows: [defaultRow()], ts: app.defaultTs() }
    }
  }
})

function save() {
  const validRows = form.value.rows.filter(r => r.typeKey)
  if (!validRows.length) { app.toast('Aggiungi almeno una bevanda'); return }
  const labels = validRows.map(r => { const a = alcDb[r.typeKey]; return r.qty > 1 ? `${r.qty}× ${a.l}` : a.l })
  const entry = {
    type:    'alcool',
    units:   totals.value.units,
    kcal:    totals.value.kcal,
    carbs:   totals.value.carbs,
    protein: totals.value.protein,
    fat:     totals.value.fat,
    label:   labels.join(', '),
    drinks:  validRows.map(r => ({ k: r.typeKey, qty: r.qty })),
    ts:      form.value.ts
  }
  if (isEdit.value && app.editEntry) { entriesStore.update(app.editEntry.id, entry); app.toast('✅ Consumo aggiornato') }
  else {
    entriesStore.add(entry)
    const max = cfgStore.cfg.alcMax
    const week = weekUnits.value + totals.value.units
    week > max
      ? app.toast(`⚠️ Limite superato! ${week.toFixed(1)}/${max}U`)
      : app.toast(`🍷 Salvato — ${Math.max(0, max - week).toFixed(1)}U rimasti`)
  }
  close()
}
function del() { app.confirmDelete(app.editEntry.id); close() }
function close() { app.closePanel() }
</script>
