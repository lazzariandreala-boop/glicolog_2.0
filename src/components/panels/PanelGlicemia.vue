<template>
  <PanelBase :visible="visible">
    <div class="pt">🩸 {{ isEdit ? 'Modifica glicemia' : 'Nuova glicemia' }}</div>

    <div class="fr">
      <span class="fl">Glicemia (mg/dL)</span>
      <input class="fi big" type="number" inputmode="numeric" v-model.number="form.glic" placeholder="mg/dL" ref="inputRef" />
    </div>
    <!-- Alert inline -->
    <div v-if="form.glic && form.glic < 70" class="glic-action-alert glic-action-low">
      <div class="gaa-body">
        <div class="gaa-icon">🍬</div>
        <div>
          <div class="gaa-title">Troppo bassa!</div>
          <div class="gaa-sub">Mangia subito qualcosa di dolce.</div>
        </div>
      </div>
      <button class="gaa-btn" @click="saveAndCorrectLow">Correggi →</button>
    </div>
    <div v-else-if="form.glic && form.glic > cfgStore.cfg.targetMax && !isTrendFalling" class="glic-action-alert glic-action-high">
      <div class="gaa-body">
        <div class="gaa-icon">📈</div>
        <div>
          <div class="gaa-title">Sopra il range</div>
          <div class="gaa-sub">{{ cfgStore.cfg.targetMin }}–{{ cfgStore.cfg.targetMax }} mg/dL</div>
        </div>
      </div>
      <button class="gaa-btn" @click="saveAndCorrectHigh">Correggi →</button>
    </div>
    <div v-else-if="form.glic && form.glic > cfgStore.cfg.targetMax && isTrendFalling" class="hint-box hint-info">
      ↘️ Sopra il range ma sta già scendendo da sola — aspetta e ricontrolla tra poco prima di correggere.
    </div>
    <div v-else-if="glucoseHint" :class="['hint-box', glucoseHint.type === 'warn' ? 'hint-warn' : 'hint-info']">
      {{ glucoseHint.msg }}
    </div>

    <div class="fr">
      <span class="fl">Sta salendo o scendendo?</span>
      <TrendSelector v-model="form.trend" />
    </div>

    <!-- Contesto sport -->
    <div class="fr">
      <span class="fl">Stai facendo sport oggi?</span>
      <label class="tog-sw">
        <input type="checkbox" v-model="form.sport" />
        <span class="tog-track"><span class="tog-thumb"></span></span>
        <span class="tog-lbl">{{ form.sport ? 'Sì' : 'No' }}</span>
      </label>
    </div>
    <template v-if="form.sport">
      <div class="fr">
        <span class="fl">Misuri prima o dopo lo sport?</span>
        <SegmentControl v-model="form.sportTiming" :options="sportTimingOptions" />
      </div>
      <div class="fr">
        <span class="fl">Che tipo di sport?</span>
        <SegmentControl v-model="form.sportType" :options="sportTypeOptions" />
      </div>
      <div v-if="sportHint" :class="['hint-box', sportHint.type === 'warn' ? 'hint-warn' : 'hint-info']">
        {{ sportHint.msg }}
      </div>
    </template>

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
import { ref, computed, watch, nextTick } from 'vue'
import { useAppStore } from '@/stores/app.js'
import { useEntriesStore, useConfigStore } from '@/stores/index.js'
import PanelBase from './PanelBase.vue'
import TrendSelector from '@/components/shared/TrendSelector.vue'
import SegmentControl from '@/components/shared/SegmentControl.vue'
import TimeRow from '@/components/shared/TimeRow.vue'
import { glucoseOnlySuggestion, sportGlicSuggestion } from '@/utils/glucoseSuggestions.js'

const app = useAppStore()
const entriesStore = useEntriesStore()
const cfgStore = useConfigStore()

const visible = ref(false)
const isEdit  = ref(false)
const inputRef = ref(null)

const sportTimingOptions = [
  { value: 'before', label: 'Prima' },
  { value: 'after',  label: 'Dopo' },
]
const sportTypeOptions = [
  { value: 'aerobico',   label: 'Corsa / Bici / Nuoto' },
  { value: 'anaerobico', label: 'Pesi / HIIT' },
]

const form = ref({ glic: null, trend: '→', note: '', ts: app.defaultTs(), sport: false, sportTiming: 'before', sportType: 'aerobico' })

const isTrendFalling = computed(() => form.value.trend === '↘' || form.value.trend === '⬇')

const glucoseHint = computed(() => {
  if (form.value.sport) return null // sport section handles its own hint
  return glucoseOnlySuggestion(form.value.glic, form.value.trend, cfgStore.cfg)
})

const sportHint = computed(() =>
  form.value.sport
    ? sportGlicSuggestion(form.value.glic, form.value.trend, form.value.sportTiming, form.value.sportType, cfgStore.cfg)
    : null
)

watch(() => app.openPanel, (p) => {
  visible.value = p === 'glicemia'
  if (p === 'glicemia') {
    const e = app.editEntry
    isEdit.value = !!e
    if (e) {
      form.value = { glic: e.glic, trend: e.trend||'→', note: e.note||'', ts: e.ts, sport: e.sport||false, sportTiming: e.sportTiming||'before', sportType: e.sportType||'aerobico' }
    } else {
      form.value = { glic: null, trend: '→', note: '', ts: app.defaultTs(), sport: false, sportTiming: 'before', sportType: 'aerobico' }
    }
    nextTick(() => inputRef.value?.focus())
  }
})

function buildEntry() {
  const glic = Number(form.value.glic)
  return { type: 'glicemia', glic, trend: form.value.trend, note: form.value.note, ts: form.value.ts, sport: form.value.sport || false, sportTiming: form.value.sport ? form.value.sportTiming : null, sportType: form.value.sport ? form.value.sportType : null }
}

function triggerAlertIfNeeded(glic, trend) {
  const cfg = cfgStore.cfg
  const glucoseTs = form.value.ts
  if (glic < 70) {
    app.triggerGlicAlert({ type: 'low', glic, glucoseTs,
      title: '🍬 Glicemia troppo bassa!',
      msg: `${glic} mg/dL — mangia subito qualcosa di dolce: zucchero, succo, caramelle.`
    })
  } else if (cfg.targetMax && glic > cfg.targetMax) {
    // If already falling, no correction needed — it will come down on its own
    if (trend === '↘' || trend === '⬇') return
    const units = cfg.fsi ? Math.max(0.5, Math.round(((glic - (cfg.targetMin || 100)) / cfg.fsi) * 2) / 2) : null
    app.triggerGlicAlert({ type: 'high', glic, glucoseTs, suggestedUnits: units,
      title: '📈 Glicemia alta',
      msg: `${glic} mg/dL (il tuo range è fino a ${cfg.targetMax} mg/dL).${units ? ' Insulina di correzione suggerita:' : ' Valuta se fare una correzione.'}`
    })
  }
}

function save() {
  if (!form.value.glic) { app.toast('Inserisci il valore glicemico'); return }
  const glic = Number(form.value.glic)
  const entry = buildEntry()
  if (isEdit.value && app.editEntry) {
    entriesStore.update(app.editEntry.id, entry)
    app.toast('✅ Glicemia aggiornata')
  } else {
    entriesStore.add(entry)
    app.toast('✅ Glicemia salvata — ' + glic + ' mg/dL')
    triggerAlertIfNeeded(glic, form.value.trend)
  }
  close()
}

// Pulsanti "Correggi →" sugli alert inline: salva e apre direttamente il pannello corretto
function saveAndCorrectLow() {
  if (!form.value.glic) return
  const glic = Number(form.value.glic)
  entriesStore.add(buildEntry())
  close()
  app.triggerGlicAlert({ type: 'low', glic, glucoseTs: form.value.ts,
    title: '🍬 Glicemia troppo bassa!',
    msg: `${glic} mg/dL — cosa vuoi assumere per correggere?`
  })
}

function saveAndCorrectHigh() {
  if (!form.value.glic || isTrendFalling.value) return
  const glic = Number(form.value.glic)
  const cfg = cfgStore.cfg
  const units = cfg.fsi ? Math.max(0.5, Math.round(((glic - (cfg.targetMin || 100)) / cfg.fsi) * 2) / 2) : null
  entriesStore.add(buildEntry())
  close()
  app.triggerGlicAlert({ type: 'high', glic, glucoseTs: form.value.ts, suggestedUnits: units,
    title: '📈 Glicemia alta',
    msg: `${glic} mg/dL.${units ? ' Insulina di correzione suggerita:' : ' Valuta se fare una correzione.'}`
  })
}

function del() {
  app.confirmDelete(app.editEntry.id)
  close()
}

function close() { app.closePanel() }
</script>
