<template>
  <div class="food-row">
    <div class="fr-top">
      <!-- Nome alimento + autocomplete -->
      <div class="fr-name-wrap">
        <input
          class="fi fr-name-inp"
          type="text"
          :placeholder="'Alimento ' + (index + 1)"
          v-model="localName"
          @input="onNameInput"
          @focus="showAc = true"
          autocomplete="off"
          autocorrect="off"
        />
        <!-- Dropdown autocomplete -->
        <div class="ac" :class="{ on: showAc && acResults.length > 0 }">
          <div
            v-for="r in acResults"
            :key="r.name"
            class="aci"
            @mousedown.prevent="pickResult(r)"
            @touchstart.prevent="pickResult(r)"
          >
            <div class="aci-name-full">{{ r.name }}<span v-if="r.online" class="aci-src">web</span></div>
            <div v-if="r.mac" class="aci-mac-row">
              <span class="aci-c">C {{ r.mac.c }}g</span>
              <span class="aci-sep">·</span>
              <span>P {{ r.mac.p }}g</span>
              <span class="aci-sep">·</span>
              <span class="aci-k">{{ r.mac.k }} kcal</span>
              <span class="aci-unit">/100g</span>
            </div>
          </div>
          <div v-if="searching" class="aci-spin">🔍 Ricerca online…</div>
          <div v-if="acResults.length > 0" class="aci-footer" @mousedown.prevent="searchOnline">🔍 Ricerca approfondita online…</div>
        </div>
      </div>

      <!-- Quantità -->
      <div class="fr-right">
        <div class="fr-qty-wrap">
          <input
            class="fi fr-qty-inp"
            type="number"
            inputmode="decimal"
            :placeholder="isDrink ? '200' : '100'"
            v-model.number="localGrams"
            @input="recalc"
          />
          <span class="fr-unit">{{ isDrink ? 'ml' : 'g' }}</span>
        </div>
        <button class="fr-scan-btn" @click="scannerOpen = true" title="Scansiona barcode">⬛</button>
        <button class="fr-del-btn" @click="$emit('remove')">×</button>
      </div>
    </div>

    <BarcodeScanner v-model="scannerOpen" @found="onBarcodeFound" />

    <!-- Macro chips -->
    <div class="fr-macros" v-if="localMacros.c > 0 || localMacros.k > 0">
      <span class="food-row-mac-chip fc">
        <span>{{ localMacros.c.toFixed(1) }}g</span> carbo
      </span>
      <span class="food-row-mac-chip">
        <span>{{ localMacros.p.toFixed(1) }}g</span> prot
      </span>
      <span class="food-row-mac-chip">
        <span>{{ localMacros.k }}</span> kcal
      </span>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, computed } from 'vue'
import { useFoodDbStore } from '@/stores/index.js'
import BarcodeScanner from './BarcodeScanner.vue'

const props = defineProps({
  index:    { type: Number, default: 0 },
  name:     { type: String, default: '' },
  grams:    { type: Number, default: 0 },
  c100:     { type: Number, default: 0 },
  p100:     { type: Number, default: 0 },
  g100:     { type: Number, default: 0 },
  f100:     { type: Number, default: 0 },
  k100:     { type: Number, default: 0 },
  isDrink:  { type: Boolean, default: false },
})
const emit = defineEmits(['update:name','update:grams','update:macros','remove'])

const dbStore = useFoodDbStore()

const localName  = ref(props.name)
const localGrams = ref(props.grams || 0)
const isDrink    = ref(props.isDrink)
const mac100     = ref({ c: props.c100, p: props.p100, g: props.g100, f: props.f100, k: props.k100 })

const showAc   = ref(false)
const acResults = ref([])
const searching = ref(false)
const scannerOpen = ref(false)
let acTimer = null

const localMacros = computed(() => {
  const g = localGrams.value || 0
  return {
    c: Math.round((mac100.value.c || 0) * g / 100 * 10) / 10,
    p: Math.round((mac100.value.p || 0) * g / 100 * 10) / 10,
    g: Math.round((mac100.value.g || 0) * g / 100 * 10) / 10,
    f: Math.round((mac100.value.f || 0) * g / 100 * 10) / 10,
    k: Math.round((mac100.value.k || 0) * g / 100),
  }
})

function onNameInput() {
  emit('update:name', localName.value)
  clearTimeout(acTimer)
  const q = localName.value.trim()
  if (q.length < 2) { acResults.value = []; return }
  acResults.value = dbStore.search(q, 6)
  // Auto ricerca online se pochi risultati locali
  if (acResults.value.length < 3) {
    acTimer = setTimeout(() => fetchOnline(q), 600)
  }
}

async function fetchOnline(q) {
  if (q.length < 2) return
  searching.value = true
  try {
    const url = `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(q)}&json=1&page_size=6&search_simple=1&action=process&lc=it&fields=product_name,nutriments`
    const r = await fetch(url, { headers: { 'User-Agent': 'GlicoLog/1.0' } })
    if (!r.ok) return
    const data = await r.json()
    const online = (data.products || [])
      .filter(p => p.product_name && p.nutriments?.['carbohydrates_100g'] != null)
      .slice(0, 5)
      .map(p => ({
        name: (p.product_name || '').trim().substring(0, 50),
        mac: {
          c: Math.round((p.nutriments['carbohydrates_100g'] || 0) * 10) / 10,
          p: Math.round((p.nutriments['proteins_100g'] || 0) * 10) / 10,
          g: Math.round((p.nutriments['fat_100g'] || 0) * 10) / 10,
          f: Math.round((p.nutriments['fiber_100g'] || 0) * 10) / 10,
          k: Math.round(p.nutriments['energy-kcal_100g'] || 0),
        },
        online: true
      }))
    const local = acResults.value.filter(r => !r.online)
    acResults.value = [...local, ...online].slice(0, 8)
  } catch {}
  finally { searching.value = false }
}

async function searchOnline() {
  showAc.value = true
  await fetchOnline(localName.value)
}

function pickResult(r) {
  localName.value = r.name
  if (r.mac) {
    mac100.value = { c: r.mac.c||0, p: r.mac.p||0, g: r.mac.g||0, f: r.mac.f||0, k: r.mac.k||0 }
    // Leggi la porzione di default dal DB (campo "n", es. "300g" o "200ml")
    const nMatch = r.mac.n ? String(r.mac.n).match(/^(\d+(?:\.\d+)?)(g|ml)?/i) : null
    if (nMatch) {
      localGrams.value = parseFloat(nMatch[1])
      isDrink.value = (nMatch[2] || '').toLowerCase() === 'ml'
    } else {
      isDrink.value = r.name.toLowerCase().includes('ml') || r.name.toLowerCase().includes('drink')
      if (!localGrams.value) localGrams.value = isDrink.value ? 200 : 100
    }
    dbStore.learn(r.name, r.mac)
  }
  showAc.value = false
  acResults.value = []
  emit('update:name', localName.value)
  recalc()
}

function recalc() {
  emit('update:grams', localGrams.value)
  emit('update:macros', { ...localMacros.value, ...mac100.value, grams: localGrams.value, name: localName.value })
}

function onBarcodeFound({ name, mac }) {
  localName.value = name
  mac100.value = { c: mac.c||0, p: mac.p||0, g: mac.g||0, f: mac.f||0, k: mac.k||0 }
  if (!localGrams.value) localGrams.value = 100
  dbStore.learn(name, mac)
  emit('update:name', name)
  recalc()
}

// Chiudi dropdown se si clicca fuori
function onClickOutside() { showAc.value = false }
</script>
