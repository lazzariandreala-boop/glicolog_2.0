<template>
  <header class="hdr">
    <div class="logo">Glic<em>o</em>Log</div>

    <div class="clk">
      <div class="clk-t">{{ time }}</div>
      <div class="clk-d">{{ date }}</div>
    </div>

    <div style="display:flex;gap:8px;align-items:center">
      <!-- PDF export -->
      <button
        style="background:none;border:none;color:var(--txt2);font-size:1rem;cursor:pointer;padding:4px"
        @click="appStore.showPdfModal = true"
        title="Esporta PDF"
      >📄</button>

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

const appStore = useAppStore()
const time = ref('')
const date = ref('')

function tick() {
  const n = new Date()
  time.value = `${p2(n.getHours())}:${p2(n.getMinutes())}`
  date.value = `${DI[n.getDay()]} ${p2(n.getDate())} ${MI[n.getMonth()]}`
}

function toggleTheme() {
  appStore.setTheme(appStore.theme === 'dark' ? 'light' : 'dark')
}

let interval
onMounted(() => { tick(); interval = setInterval(tick, 15000) })
onUnmounted(() => clearInterval(interval))
</script>
