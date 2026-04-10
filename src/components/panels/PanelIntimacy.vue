<template>
  <PanelBase :visible="visible">
    <div class="pt">❤️ {{ isEdit ? 'Modifica' : 'Nuova' }} attività intima</div>

    <!-- Con chi -->
    <div class="fr">
      <span class="fl">Con chi</span>
      <div class="sb-row">
        <button v-for="opt in partnerOpts" :key="opt.v"
                class="sb" :class="{ on: form.partner === opt.v }"
                @click="form.partner = opt.v">
          {{ opt.ico }} {{ opt.l }}
        </button>
      </div>
    </div>

    <!-- Durata -->
    <div class="fr">
      <span class="fl">Durata (minuti)</span>
      <div class="dur-row">
        <button v-for="d in durationOpts" :key="d"
                class="sb" :class="{ on: form.duration === d }"
                @click="form.duration = d">
          {{ d }}'
        </button>
        <input class="fi dur-inp" type="number" inputmode="numeric"
               v-model.number="form.duration" min="1" max="300"
               placeholder="altro" />
      </div>
    </div>

    <!-- Intensità -->
    <div class="fr">
      <span class="fl">Intensità</span>
      <div class="sb-row">
        <button v-for="opt in intensityOpts" :key="opt.v"
                class="sb" :class="{ on: form.intensity === opt.v }"
                @click="form.intensity = opt.v">
          {{ opt.ico }} {{ opt.l }}
        </button>
      </div>
    </div>

    <!-- Effetto glicemia stimato -->
    <div class="hint-box" :class="glucEffect.cls" style="margin-top:4px">
      <strong>Effetto glicemia stimato:</strong> {{ glucEffect.txt }}
    </div>

    <!-- Hint gestione glicemia basato su partner -->
    <div class="hint-box" :class="partnerGlucHint.cls" style="margin-top:6px">
      {{ partnerGlucHint.txt }}
      <button v-if="partnerGlucHint.showBolo" class="hint-bolo-btn" @click="saveAndBolo">
        💉 Fai un bolo →
      </button>
    </div>

    <!-- Glicemia al momento -->
    <div class="fr">
      <span class="fl">Glicemia attuale <span class="fl-opt">(opz.)</span></span>
      <div class="glic-row">
        <input class="fi glic-inp" type="number" inputmode="decimal"
               v-model.number="form.glic" min="40" max="400"
               placeholder="mg/dL" />
        <span class="glic-unit">mg/dL</span>
      </div>
    </div>

    <!-- Note -->
    <div class="fr">
      <span class="fl">Note <span class="fl-opt">(opz.)</span></span>
      <input class="fi" type="text" v-model="form.note" placeholder="es. dopo cena, sotto stress..." maxlength="120" />
    </div>

    <!-- Ora -->
    <div class="fr">
      <span class="fl">Ora</span>
      <input class="fi" type="time" v-model="form.time" />
    </div>

    <div v-if="err" class="hint-box hint-warn" style="margin-top:4px">{{ err }}</div>

    <div class="panel-actions">
      <button class="bsave" @click="save">{{ isEdit ? '💾 Salva modifiche' : '✅ Registra' }}</button>
      <button v-if="isEdit" class="bdel" @click="remove">🗑 Elimina</button>
      <button class="bcan" @click="close">Annulla</button>
    </div>
  </PanelBase>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { useAppStore } from '@/stores/app.js'
import { useEntriesStore, useConfigStore } from '@/stores/index.js'
import { getDK, p2 } from '@/data/constants.js'
import PanelBase from './PanelBase.vue'

const app     = useAppStore()
const entries = useEntriesStore()
const cfg     = useConfigStore()

const visible = ref(false)
const err     = ref('')

const DEF = () => ({
  partner:   'partner',
  duration:  20,
  intensity: 'media',
  glic:      null,
  note:      '',
  time:      p2(new Date().getHours()) + ':' + p2(new Date().getMinutes()),
})

const form   = ref(DEF())
const isEdit = computed(() => !!app.editEntry && app.editEntry.type === 'intimacy')

const partnerOpts = [
  { v: 'solo',    ico: '🤲', l: 'Da solo' },
  { v: 'partner', ico: '👫', l: 'Con partner' },
  { v: 'multi',   ico: '👥', l: 'Multiplo' },
]

const durationOpts = [10, 20, 30, 45, 60]

const intensityOpts = [
  { v: 'bassa',  ico: '🌿', l: 'Bassa' },
  { v: 'media',  ico: '🔥', l: 'Media' },
  { v: 'alta',   ico: '⚡', l: 'Alta' },
]

// MET stimati per calcolo effetto glicemico
const MET = { bassa: 2.5, media: 4.5, alta: 7.0 }

const glucEffect = computed(() => {
  const met      = MET[form.value.intensity] || 4.5
  const duration = form.value.duration || 20
  const kcal     = Math.round(met * 80 * duration / 60)  // 80kg default

  if (met >= 6) return {
    cls: 'hint-warn',
    txt: `Attività intensa (≈${kcal} kcal) — può abbassare la glicemia nelle ore successive. Tieni un glucosio a portata di mano.`
  }
  if (met >= 4) return {
    cls: 'hint-info',
    txt: `Attività moderata (≈${kcal} kcal) — effetto simile a una passeggiata veloce. Monitora dopo.`
  }
  return {
    cls: '',
    txt: `Attività leggera (≈${kcal} kcal) — impatto glicemico minimo.`
  }
})

const partnerGlucHint = computed(() => {
  const partner  = form.value.partner
  const glic     = form.value.glic
  const tMin     = cfg.cfg.targetMin || 80
  const tMax     = cfg.cfg.targetMax || 180

  if (partner === 'solo') {
    // Autostimolazione → risposta simile allo stress → tende ad alzare la glicemia
    const hiGlic = glic && glic > tMax
    return {
      cls: hiGlic ? 'hint-warn' : 'hint-info',
      txt: hiGlic
        ? `⬆️ Sei già sopra range (${glic} mg/dL) e l'attività in solitaria tende ad alzare ulteriormente la glicemia (risposta da stress). Valuta un bolo di correzione.`
        : `⬆️ L'attività in solitaria tende ad alzare la glicemia (risposta simile allo stress). Monitora dopo.`,
      showBolo: hiGlic,
    }
  }

  // Con partner o multiplo → attività aerobica → tende ad abbassare la glicemia
  const lowGlic = glic && glic < tMin + 20  // vicino al limite basso
  return {
    cls: lowGlic ? 'hint-warn' : 'hint-info',
    txt: lowGlic
      ? `⬇️ Glicemia vicina al limite basso (${glic} mg/dL). L'attività con partner è aerobica e può farla scendere ancora — mangia 15–20g di carboidrati prima di iniziare.`
      : `⬇️ L'attività con partner è prevalentemente aerobica — può abbassare la glicemia nelle ore successive. Se sei in range basso, mangia qualcosa prima.`,
    showBolo: false,
  }
})

watch(() => app.openPanel, p => {
  visible.value = p === 'intimacy'
  if (p === 'intimacy') {
    err.value = ''
    if (isEdit.value) {
      const e = app.editEntry
      const d = new Date(e.ts)
      form.value = {
        partner:   e.partner   || 'partner',
        duration:  e.duration  || 20,
        intensity: e.intensity || 'media',
        glic:      e.glic      || null,
        note:      e.note      || '',
        time:      p2(d.getHours()) + ':' + p2(d.getMinutes()),
      }
    } else {
      form.value = DEF()
    }
  }
})

function buildTs() {
  const now = new Date()
  const dk  = getDK(app.dayOffset)
  const [hh, mm] = form.value.time.split(':').map(Number)
  return new Date(`${dk}T${p2(hh)}:${p2(mm)}:00`).getTime()
}

function buildEntry() {
  return {
    type:      'intimacy',
    partner:   form.value.partner,
    duration:  form.value.duration,
    intensity: form.value.intensity,
    glic:      form.value.glic || null,
    note:      form.value.note || '',
    ts:        buildTs(),
    // Calorie stimate per la timeline
    kcal:      Math.round((MET[form.value.intensity] || 4.5) * 80 * (form.value.duration || 20) / 60),
  }
}

function save() {
  err.value = ''
  if (!form.value.duration || form.value.duration < 1) {
    err.value = 'Inserisci una durata valida'; return
  }
  if (isEdit.value) {
    entries.update(app.editEntry.id, buildEntry())
    app.toast('✅ Modificato')
  } else {
    entries.add(buildEntry())
    app.toast('✅ Registrato')
  }
  app.closePanel()
}

function saveAndBolo() {
  err.value = ''
  if (!form.value.duration || form.value.duration < 1) {
    err.value = 'Inserisci una durata valida'; return
  }
  entries.add(buildEntry())
  app.closePanel()
  app.openPanelFor('insulina')
}

function remove() {
  entries.remove(app.editEntry.id)
  app.toast('🗑 Eliminato')
  app.closePanel()
}

function close() { app.closePanel() }
</script>

<style scoped>
.hint-bolo-btn {
  display: block;
  margin-top: 8px;
  background: var(--p);
  color: #fff;
  border: none;
  border-radius: 8px;
  font-family: var(--sans);
  font-size: .82rem;
  font-weight: 600;
  padding: 8px 14px;
  cursor: pointer;
}
</style>
