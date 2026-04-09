<template>
  <PanelBase :visible="visible">
    <div class="pt">📱 Google Fit — Connessione</div>

    <!-- Status card -->
    <div class="hs-status-card" :class="{ connected: hsStore.isConnected }">
      <div class="hs-status-ico">{{ hsStore.isConnected ? '🟢' : '🔴' }}</div>
      <div class="hs-status-body">
        <div class="hs-status-title">
          {{ hsStore.isConnected ? 'Connesso a Google Fit' : 'Non connesso' }}
        </div>
        <div v-if="hsStore.lastSync" class="hs-status-sub">Ultima sync: {{ lastSyncLabel }}</div>
        <div v-else-if="!hsStore.isConnected" class="hs-status-sub">
          Inserisci le credenziali e premi "Connetti"
        </div>
      </div>
    </div>

    <!-- Credenziali OAuth -->
    <div class="hs-section">
      <div class="hs-section-lbl">Credenziali OAuth 2.0</div>
      <div class="fr">
        <span class="fl">Client ID</span>
        <input class="fi" type="text" v-model="form.clientId"
               placeholder="xxx.apps.googleusercontent.com" autocomplete="off" />
      </div>
      <div class="fr">
        <span class="fl">Client Secret</span>
        <input class="fi" :type="showSecret ? 'text' : 'password'" v-model="form.clientSecret"
               placeholder="GOCSPX-..." autocomplete="off" />
      </div>
      <div style="display:flex;gap:8px;margin-top:4px">
        <button class="bsave" style="background:var(--g);color:#000;flex:1" @click="saveConfig">
          💾 Salva credenziali
        </button>
        <button class="bdel" style="flex:0;padding:0 14px" @click="showSecret = !showSecret">
          {{ showSecret ? '🙈' : '👁️' }}
        </button>
      </div>
    </div>

    <!-- Azioni -->
    <div class="hs-actions">
      <button v-if="!hsStore.isConnected"
              class="bsave" style="background:#4285f4;color:#fff"
              :disabled="!hsStore.isConfigured || connecting"
              @click="connect">
        {{ connecting ? '⏳ Reindirizzamento...' : '🔗 Connetti Google Fit' }}
      </button>
      <template v-else>
        <button class="bsave" style="background:var(--b);color:#000"
                :disabled="syncing" @click="doSync">
          {{ syncing ? '⏳ Sincronizzazione...' : '🔄 Sincronizza ora (30 giorni)' }}
        </button>
        <button class="bdel" @click="disconnect" style="margin-top:6px">
          🔌 Disconnetti Google Fit
        </button>
      </template>
    </div>

    <div v-if="syncResult" class="hint-box hint-info" style="margin-top:10px">
      ✅ {{ syncResult }}
    </div>
    <div v-if="error" class="hint-box hint-warn" style="margin-top:10px">
      ❌ {{ error }}
    </div>

    <!-- Guida configurazione -->
    <div class="hs-guide">
      <div class="hs-guide-title">📋 Come configurare (una tantum)</div>
      <ol class="hs-guide-steps">
        <li>Vai su <strong>console.cloud.google.com</strong> → crea progetto</li>
        <li>API e servizi → Abilita API → cerca <strong>Fitness API</strong> → attiva</li>
        <li>Credenziali → Crea → <strong>ID client OAuth 2.0</strong> → tipo "Applicazione web"</li>
        <li>URI di reindirizzamento autorizzati: aggiungi<br/>
          <code class="hs-uri">{{ redirectUri }}</code>
        </li>
        <li>Copia <strong>Client ID</strong> e <strong>Client Secret</strong> qui sopra</li>
        <li>Premi "Salva credenziali" poi "Connetti Google Fit"</li>
      </ol>
    </div>

    <button class="bdel" @click="close" style="margin-top:4px">Chiudi</button>
  </PanelBase>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { useAppStore } from '@/stores/app.js'
import { useHealthSyncStore } from '@/stores/healthSync.js'
import PanelBase from './PanelBase.vue'

const app     = useAppStore()
const hsStore = useHealthSyncStore()

const visible    = ref(false)
const showSecret = ref(false)
const connecting = ref(false)
const syncing    = ref(false)
const syncResult = ref('')
const error      = ref('')

const form = ref({ clientId: '', clientSecret: '' })

const redirectUri = window.location.origin + window.location.pathname.replace(/\/$/, '')

const lastSyncLabel = computed(() => {
  if (!hsStore.lastSync) return ''
  const diff = Math.round((Date.now() - hsStore.lastSync) / 60000)
  if (diff < 1)    return 'proprio adesso'
  if (diff < 60)   return `${diff} minuti fa`
  if (diff < 1440) return `${Math.round(diff / 60)} ore fa`
  return `${Math.round(diff / 1440)} giorni fa`
})

watch(() => app.openPanel, p => {
  visible.value = p === 'healthsync'
  if (p === 'healthsync') {
    form.value.clientId     = hsStore.cfg.clientId     || ''
    form.value.clientSecret = hsStore.cfg.clientSecret || ''
    syncResult.value        = ''
    error.value             = ''
  }
})

function saveConfig() {
  if (!form.value.clientId || !form.value.clientSecret) {
    error.value = 'Inserisci sia il Client ID che il Client Secret'
    return
  }
  hsStore.saveConfig(form.value.clientId, form.value.clientSecret)
  app.toast('✅ Credenziali salvate')
  error.value = ''
}

async function connect() {
  error.value   = ''
  connecting.value = true
  try {
    await hsStore.connect()
    // → redirect a Google, pagina lascia l'app
  } catch (e) {
    error.value      = e.message
    connecting.value = false
  }
}

async function doSync() {
  syncing.value    = true
  syncResult.value = ''
  error.value      = ''
  try {
    const res        = await hsStore.sync(30)
    syncResult.value = `Sincronizzati ${res.syncedDays} giorni · ${res.newSessions} nuove sessioni importate`
    app.toast('✅ Google Fit sincronizzato')
  } catch (e) {
    error.value = e.message
  } finally {
    syncing.value = false
  }
}

function disconnect() {
  hsStore.disconnect()
  app.toast('🔌 Disconnesso da Google Fit')
}

function close() { app.closePanel() }
</script>
