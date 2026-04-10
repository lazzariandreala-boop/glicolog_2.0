<template>
  <header class="hdr">
    <div class="logo">Glic<em>o</em>Log</div>

    <div class="clk">
      <div class="clk-t">{{ time }}</div>
      <div class="clk-d">{{ date }}</div>
    </div>

    <div style="display:flex;gap:8px;align-items:center">
      <!-- Sync Gist (pull → merge → push) -->
      <button
        class="hdr-sync-btn"
        :class="{ spinning: syncing }"
        :disabled="syncing"
        @click="syncGist"
        title="Sincronizza con Gist"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="25" height="25" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8"/>
          <path d="M21 3v5h-5"/>
        </svg>
      </button>

      <!-- Theme toggle -->
      <button
        style="background:none;border:none;cursor:pointer;font-size:1.1rem;padding:4px"
        @click="toggleTheme"
        :title="appStore.theme === 'dark' ? 'Modalità chiara' : 'Modalità scura'"
      >{{ appStore.theme === 'dark' ? '☀️' : '🌙' }}</button>

      <!-- Profilo -->
      <button
        style="background:none;border:none;color:var(--txt2);font-size:1.1rem;cursor:pointer;padding:4px"
        @click="appStore.openPanelFor('profilo')"
        title="Profilo"
      >⚙️</button>
    </div>
  </header>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { useAppStore } from '@/stores/app.js'
import { DI, MI, p2 } from '@/data/constants.js'
import { syncWithGist, getToken, getGistId } from '@/utils/gistSync.js'

const appStore = useAppStore()
const time = ref('')
const date = ref('')
const syncing = ref(false)

function tick() {
  const n = new Date()
  time.value = `${p2(n.getHours())}:${p2(n.getMinutes())}`
  date.value = `${DI[n.getDay()]} ${p2(n.getDate())} ${MI[n.getMonth()]}`
}

function toggleTheme() {
  appStore.setTheme(appStore.theme === 'dark' ? 'light' : 'dark')
}

async function syncGist() {
  if (!getToken() || !getGistId()) {
    appStore.toast('⚠️ Token e Gist ID richiesti — configurali nel Profilo')
    return
  }
  syncing.value = true
  try {
    await syncWithGist()
    appStore.toast('✅ Sync completato')
    window.location.reload()
  } catch (e) {
    appStore.toast('❌ ' + e.message)
  } finally {
    syncing.value = false
  }
}

let interval
onMounted(() => { tick(); interval = setInterval(tick, 15000) })
onUnmounted(() => clearInterval(interval))
</script>

<style scoped>
.hdr-sync-btn {
  background: none;
  border: none;
  color: var(--txt2);
  font-size: 1.2rem;
  cursor: pointer;
  padding: 4px;
  display: inline-flex;
  align-items: center;
}
.hdr-sync-btn.spinning {
  opacity: 0.5;
  animation: spin 1s linear infinite;
}
</style>
