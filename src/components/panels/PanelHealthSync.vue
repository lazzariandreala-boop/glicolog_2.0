<template>
  <PanelBase :visible="visible">
    <div class="pt">📱 Health Connect — Attività & Salute</div>

    <!-- Debug info — sempre visibile per diagnostica -->
    <div v-if="hc.debugInfo" class="hc-debug">
      {{ hc.debugInfo }}<br/>
      <span style="color:var(--txt2);font-size:.7rem">giorni in cache: {{ Object.keys(hc.dailyData).length }}</span>
    </div>

    <!-- Non disponibile su web -->
    <div v-if="!isCapacitor" class="hc-unavail">
      <div class="hc-unavail-ico">📱</div>
      <div class="hc-unavail-title">Disponibile solo nell'app Android</div>
      <div class="hc-unavail-sub">
        Installa l'APK sul tuo Google Pixel per accedere ai dati di passi, calorie e frequenza cardiaca.
      </div>
    </div>

    <!-- Capacitor presente ma HC non disponibile -->
    <div v-else-if="checked && !hc.available" class="hc-unavail">
      <div class="hc-unavail-ico">⚠️</div>
      <div class="hc-unavail-title">Health Connect non rilevato</div>
      <div class="hc-unavail-sub">
        Assicurati che Health Connect sia installato e aggiornato dal Play Store.
      </div>
      <button class="bsave" style="margin-top:14px;width:100%" @click="retry">
        🔄 Riprova
      </button>
    </div>

    <!-- Controllo in corso -->
    <div v-else-if="!checked" class="hc-unavail">
      <div class="hc-unavail-ico">⏳</div>
      <div class="hc-unavail-title">Verifica Health Connect...</div>
    </div>

    <!-- Disponibile -->
    <template v-else>

      <!-- Status -->
      <div class="hs-status-card" :class="{ connected: hc.hasPerms }">
        <div class="hs-status-ico">{{ hc.hasPerms ? '🟢' : '🟡' }}</div>
        <div class="hs-status-body">
          <div class="hs-status-title">
            {{ hc.hasPerms ? 'Health Connect autorizzato' : 'Permessi non ancora concessi' }}
          </div>
          <div v-if="hc.lastSync" class="hs-status-sub">Ultima sync: {{ lastSyncLabel }}</div>
          <div v-else-if="!hc.hasPerms" class="hs-status-sub">
            Premi "Richiedi permessi" per autorizzare l'accesso ai dati
          </div>
        </div>
      </div>

      <!-- Richiedi permessi -->
      <button v-if="!hc.hasPerms"
              class="bsave" style="background:var(--g);color:#000;width:100%;margin-bottom:8px"
              :disabled="requesting" @click="doRequestPerms">
        {{ requesting ? '⏳ Apertura Health Connect...' : '🔓 Richiedi permessi' }}
      </button>

      <!-- Sincronizza -->
      <template v-else>
        <div class="hc-sync-row">
          <button class="bsave" style="background:var(--b);color:#000;flex:1"
                  :disabled="hc.syncing" @click="doSync(30)">
            {{ hc.syncing ? '⏳ Sincronizzazione...' : '🔄 Sincronizza (30 giorni)' }}
          </button>
          <button class="bsave" style="flex:0;padding:0 14px;background:var(--card2);color:var(--txt2)"
                  :disabled="hc.syncing" @click="doSync(7)">
            7g
          </button>
        </div>
      </template>

      <div v-if="syncResult" class="hint-box hint-info" style="margin-top:8px">✅ {{ syncResult }}</div>
      <div v-if="error"      class="hint-box hint-warn" style="margin-top:8px">❌ {{ error }}</div>

      <!-- Cosa viene importato -->
      <div class="hc-info">
        <div class="hc-info-title">Dati importati da Health Connect</div>
        <div class="hc-info-rows">
          <div class="hc-info-row"><span>👣</span> Passi giornalieri</div>
          <div class="hc-info-row"><span>🔥</span> Calorie attive</div>
          <div class="hc-info-row"><span>❤️</span> Frequenza cardiaca media</div>
        </div>
      </div>

    </template>

    <button class="bdel" @click="close" style="margin-top:4px">Chiudi</button>
  </PanelBase>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { useAppStore } from '@/stores/app.js'
import { useHealthSyncStore } from '@/stores/healthSync.js'
import PanelBase from './PanelBase.vue'

const app = useAppStore()
const hc  = useHealthSyncStore()

const visible    = ref(false)
const requesting = ref(false)
const syncResult = ref('')
const error      = ref('')
const checked    = ref(false)

const isCapacitor = !!window.Capacitor

const lastSyncLabel = computed(() => {
  if (!hc.lastSync) return ''
  const diff = Math.round((Date.now() - hc.lastSync) / 60000)
  if (diff < 1)    return 'proprio adesso'
  if (diff < 60)   return `${diff} min fa`
  if (diff < 1440) return `${Math.round(diff / 60)} ore fa`
  return `${Math.round(diff / 1440)} giorni fa`
})

async function runCheck() {
  checked.value = false
  await hc.checkAvailability()
  if (hc.available) await hc.checkPermissions()
  checked.value = true
}

async function retry() {
  syncResult.value = ''
  error.value      = ''
  await runCheck()
}

watch(() => app.openPanel, async p => {
  visible.value = p === 'healthsync'
  if (p === 'healthsync') {
    syncResult.value = ''
    error.value      = ''
    if (isCapacitor) await runCheck()
    else checked.value = true
  }
})

async function doRequestPerms() {
  requesting.value = true
  error.value      = ''
  try {
    await hc.requestPermissions()
    app.toast('✅ Permessi concessi!')
    await doSync(30)
  } catch (e) {
    error.value = e.message
  } finally {
    requesting.value = false
  }
}

async function doSync(days) {
  syncResult.value = ''
  error.value      = ''
  try {
    const res = await hc.sync(days)
    syncResult.value = `Sincronizzati ${res.syncedDays} giorni di dati`
    app.toast('✅ Health Connect sincronizzato')
  } catch (e) {
    error.value = e.message
  }
}

function close() { app.closePanel() }
</script>
