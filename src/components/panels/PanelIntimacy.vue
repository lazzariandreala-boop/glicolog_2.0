<template>
  <PanelBase :visible="visible">
    <div class="pt">❤️ {{ isEdit ? 'Modifica' : 'Nuova' }} attività intima</div>

    <!-- Hero card: calorie + kcal stimate -->
    <div class="intim-hero">
      <div class="intim-hero-val">~{{ estimatedKcal }} <span class="intim-hero-unit">kcal</span></div>
      <div class="intim-hero-sub">Calorie stimate — {{ intensityLabel }}</div>
    </div>

    <!-- Con chi -->
    <div class="fr">
      <span class="fl">Con chi</span>
      <div class="sb-row">
        <button v-for="opt in partnerOpts" :key="opt.v"
                class="sb" :class="[{ on: form.partner === opt.v }, opt.cls]"
                @click="form.partner = opt.v">
          {{ opt.ico }} {{ opt.l }}
        </button>
      </div>
    </div>

    <!-- Intensità -->
    <div class="fr">
      <span class="fl">Intensità</span>
      <div class="sb-row">
        <button v-for="opt in intensityOpts" :key="opt.v"
                class="sb" :class="[{ on: form.intensity === opt.v }, opt.cls]"
                @click="form.intensity = opt.v">
          {{ opt.ico }} {{ opt.l }}
        </button>
      </div>
    </div>

    <!-- Durata -->
    <div class="fr">
      <span class="fl">Durata (minuti)</span>
      <div class="intim-dur-row">
        <button v-for="d in durationOpts" :key="d"
                class="sb intim-dur-btn" :class="{ on: form.duration === d }"
                @click="form.duration = d">
          {{ d }}'
        </button>
        <input class="fi intim-dur-inp" type="number" inputmode="numeric"
               v-model.number="form.duration" min="1" max="300"
               placeholder="altro" />
      </div>
    </div>

    <!-- Hint glicemia partner -->
    <div class="hint-box" :class="partnerGlucHint.cls">
      {{ partnerGlucHint.txt }}
      <button v-if="partnerGlucHint.showBolo" class="intim-bolo-btn" @click="saveAndBolo">
        💉 Fai un bolo →
      </button>
    </div>

    <!-- Glicemia al momento -->
    <div class="fr">
      <span class="fl">Glicemia attuale <span class="fl-opt">(opz.)</span></span>
      <div class="intim-glic-row">
        <input class="fi intim-glic-inp" type="number" inputmode="decimal"
               v-model.number="form.glic" min="40" max="400"
               placeholder="—" />
        <span class="intim-glic-unit">mg/dL</span>
      </div>
    </div>

    <!-- Note -->
    <div class="fr">
      <span class="fl">Note <span class="fl-opt">(opz.)</span></span>
      <input class="fi" type="text" v-model="form.note"
             placeholder="es. dopo cena, sotto stress…" maxlength="120" />
    </div>

    <!-- Ora -->
    <TimeRow v-model="form.ts" />

    <div v-if="err" class="hint-box hint-warn">{{ err }}</div>

    <button class="bsave" style="background:linear-gradient(135deg,#f06292,#e91e63);color:#fff;box-shadow:0 6px 24px rgba(233,30,99,.35)" @click="save">
      {{ isEdit ? '💾 Salva modifiche' : '❤️ Registra' }}
    </button>
    <button v-if="isEdit" class="bdel" @click="remove">🗑 Elimina</button>
    <button class="bdel" @click="close" style="margin-top:8px">Annulla</button>
  </PanelBase>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { useAppStore } from '@/stores/app.js'
import { useEntriesStore, useConfigStore } from '@/stores/index.js'
import { getDK, p2 } from '@/data/constants.js'
import PanelBase from './PanelBase.vue'
import TimeRow from '@/components/shared/TimeRow.vue'

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
  ts:        app.defaultTs(),
})

const form   = ref(DEF())
const isEdit = computed(() => !!app.editEntry && app.editEntry.type === 'intimacy')

const partnerOpts = [
  { v: 'solo',    ico: '🤲', l: 'Da solo',    cls: 'o' },
  { v: 'partner', ico: '👫', l: 'Con partner', cls: 'p' },
  { v: 'multi',   ico: '👥', l: 'Multiplo',   cls: 'p' },
]

const durationOpts = [10, 20, 30, 45, 60]

const intensityOpts = [
  { v: 'bassa', ico: '🌿', l: 'Bassa', cls: 'g' },
  { v: 'media', ico: '🔥', l: 'Media', cls: 'o' },
  { v: 'alta',  ico: '⚡', l: 'Alta',  cls: 'b' },
]

const MET = { bassa: 2.5, media: 4.5, alta: 7.0 }

const intensityLabel = computed(() => {
  const map = { bassa: 'leggera', media: 'moderata', alta: 'intensa' }
  return map[form.value.intensity] || 'moderata'
})

const estimatedKcal = computed(() => {
  const met = MET[form.value.intensity] || 4.5
  const dur = form.value.duration || 20
  const w   = cfg.cfg.weight || 80
  return Math.round(met * w * dur / 60)
})

const partnerGlucHint = computed(() => {
  const partner = form.value.partner
  const glic    = form.value.glic
  const tMin    = cfg.cfg.targetMin || 80
  const tMax    = cfg.cfg.targetMax || 180

  if (partner === 'solo') {
    const hiGlic = glic && glic > tMax
    return {
      cls: hiGlic ? 'hint-warn' : 'hint-info',
      txt: hiGlic
        ? `⬆️ Sei già sopra range (${glic} mg/dL). L'attività in solitaria tende ad alzare la glicemia — valuta un bolo di correzione.`
        : '⬆️ L\'attività in solitaria tende ad alzare la glicemia (risposta simile allo stress). Monitora dopo.',
      showBolo: hiGlic,
    }
  }

  const lowGlic = glic && glic < tMin + 20
  return {
    cls: lowGlic ? 'hint-warn' : 'hint-info',
    txt: lowGlic
      ? `⬇️ Glicemia vicina al limite basso (${glic} mg/dL). L'attività con partner è aerobica — mangia 15–20g di carboidrati prima.`
      : '⬇️ L\'attività con partner è aerobica e può abbassare la glicemia nelle ore successive. Se sei in range basso, mangia qualcosa prima.',
    showBolo: false,
  }
})

watch(() => app.openPanel, p => {
  visible.value = p === 'intimacy'
  if (p === 'intimacy') {
    err.value = ''
    if (isEdit.value) {
      const e = app.editEntry
      form.value = {
        partner:   e.partner   || 'partner',
        duration:  e.duration  || 20,
        intensity: e.intensity || 'media',
        glic:      e.glic      || null,
        note:      e.note      || '',
        ts:        e.ts,
      }
    } else {
      form.value = DEF()
    }
  }
})

function buildEntry() {
  return {
    type:      'intimacy',
    partner:   form.value.partner,
    duration:  form.value.duration,
    intensity: form.value.intensity,
    glic:      form.value.glic || null,
    note:      form.value.note || '',
    ts:        form.value.ts,
    kcal:      estimatedKcal.value,
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
    app.toast('❤️ Registrato')
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
/* Hero card */
.intim-hero {
  background: linear-gradient(135deg, rgba(233,30,99,.12) 0%, rgba(240,98,146,.06) 100%);
  border: 1px solid rgba(233,30,99,.25);
  border-radius: 16px;
  padding: 18px 20px;
  text-align: center;
  margin-bottom: 16px;
}
.intim-hero-val {
  font-family: var(--mono);
  font-size: 2.4rem;
  font-weight: 700;
  color: #f06292;
  line-height: 1;
}
.intim-hero-unit {
  font-size: 1rem;
  font-weight: 400;
  opacity: .7;
}
.intim-hero-sub {
  font-size: .72rem;
  color: var(--txt2);
  margin-top: 5px;
  text-transform: uppercase;
  letter-spacing: .5px;
}

/* Durata row */
.intim-dur-row {
  display: flex;
  align-items: center;
  gap: 4px;
  flex: 1;
  min-width: 0;
}
.intim-dur-btn {
  flex: 0 0 auto;
  padding: 9px 10px;
  min-width: 38px;
}
.intim-dur-inp {
  flex: 1;
  min-width: 64px;
  text-align: center;
}

/* Glicemia inline */
.intim-glic-row {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
  min-width: 0;
}
.intim-glic-inp {
  flex: 1;
  min-width: 0;
  font-size: 1.4rem;
  font-family: var(--mono);
  font-weight: 600;
  text-align: center;
  padding: 12px 15px;
}
.intim-glic-unit {
  font-size: .75rem;
  color: var(--txt2);
  font-weight: 600;
  white-space: nowrap;
  flex-shrink: 0;
}

/* Bolo button inside hint */
.intim-bolo-btn {
  display: block;
  margin-top: 10px;
  width: 100%;
  background: var(--p);
  color: #fff;
  border: none;
  border-radius: 10px;
  font-family: var(--sans);
  font-size: .85rem;
  font-weight: 700;
  padding: 10px 16px;
  cursor: pointer;
  transition: opacity .15s;
}
.intim-bolo-btn:active { opacity: .8 }
</style>
