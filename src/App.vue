<template>
  <div>
    <!-- HEADER -->
    <AppHeader />

    <!-- INSTALL BANNER PWA -->
    <div class="ibar" :class="{ on: showInstallBanner }">
      <div class="ibar-t">
        <strong>Installa GlicoLog</strong>
        Aggiungi all'home screen per un'esperienza ottimale
      </div>
      <button class="ibar-b" @click="doInstall">Installa</button>
      <button class="ibar-x" @click="showInstallBanner = false">✕</button>
    </div>

    <!-- PULL TO REFRESH indicator -->
    <div class="ptr-bar" ref="ptrBar">↻ Rilascia per aggiornare</div>

    <!-- BIG 3 + AZIONI RAPIDE -->
    <Big3Actions />

    <!-- STRIP RIEPILOGO -->
    <SummaryStrip />

    <!-- SEZIONE STATISTICHE (collapsible) -->
    <div class="sw">
      <button class="st-tog" :class="{ open: statsOpen }" @click="statsOpen = !statsOpen">
        <span>📊 Statistiche e grafico</span>
        <span class="arr">▼</span>
      </button>
      <div class="st-body" :class="{ show: statsOpen }">
        <GlucoseChart />
      </div>
    </div>

    <!-- RIEPILOGO MENSILE (collapsible) -->
    <div class="sw">
      <button class="st-tog" :class="{ open: monthOpen }" @click="monthOpen = !monthOpen">
        <span>📅 Riepilogo mensile</span>
        <span class="arr">▼</span>
      </button>
      <div class="st-body" :class="{ show: monthOpen }">
        <MonthlyCalendar />
      </div>
    </div>

    <!-- NUTRIZIONE DI OGGI -->
    <NutritionSection />

    <!-- NAVIGAZIONE GIORNI -->
    <DayNavigation />

    <!-- RIEPILOGO BOXES -->
    <SummaryBoxes />

    <!-- TIMELINE -->
    <Timeline />

    <!-- OVERLAY SCURO -->
    <div class="ov" :class="{ on: appStore.openPanel }" @click="appStore.closePanel()" />

    <!-- PANNELLI (bottom sheets) -->
    <PanelPasto />
    <PanelSpuntino />
    <PanelGlicemia />
    <PanelInsulina />
    <PanelAlcool />
    <PanelSport />
    <PanelCorrezione />
    <PanelAperitivi />
    <PanelProfilo />

    <!-- MODALS -->
    <Modals />

    <!-- TOAST -->
    <Toast />
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { useAppStore } from '@/stores/app.js'
import { useStepsStore } from '@/stores/index.js'
import { getDK } from '@/data/constants.js'

// Components
import AppHeader        from '@/components/AppHeader.vue'
import Big3Actions      from '@/components/Big3Actions.vue'
import SummaryStrip     from '@/components/SummaryStrip.vue'
import NutritionSection from '@/components/NutritionSection.vue'
import DayNavigation    from '@/components/DayNavigation.vue'
import SummaryBoxes     from '@/components/SummaryBoxes.vue'
import Timeline         from '@/components/Timeline.vue'
import Toast            from '@/components/Toast.vue'
import Modals           from '@/components/modals/Modals.vue'
import GlucoseChart     from '@/components/GlucoseChart.vue'
import MonthlyCalendar  from '@/components/MonthlyCalendar.vue'

// Panels
import PanelPasto     from '@/components/panels/PanelPasto.vue'
import PanelSpuntino  from '@/components/panels/PanelSpuntino.vue'
import PanelGlicemia  from '@/components/panels/PanelGlicemia.vue'
import PanelInsulina  from '@/components/panels/PanelInsulina.vue'
import PanelAlcool    from '@/components/panels/PanelAlcool.vue'
import PanelSport     from '@/components/panels/PanelSport.vue'
import PanelCorrezione from '@/components/panels/PanelCorrezione.vue'
import PanelAperitivi from '@/components/panels/PanelAperitivi.vue'
import PanelProfilo   from '@/components/panels/PanelProfilo.vue'

const appStore = useAppStore()

const statsOpen = ref(false)
const monthOpen = ref(false)
const showInstallBanner = ref(false)
const ptrBar = ref(null)

// PWA Install
let deferredInstallPrompt = null
function doInstall() {
  if (!deferredInstallPrompt) return
  deferredInstallPrompt.prompt()
  deferredInstallPrompt = null
  showInstallBanner.value = false
}

// Pull-to-refresh
let startY = 0
let pulling = false
const THRESHOLD = 48

function onTouchStart(e) {
  if (appStore.openPanel) return
  if (window.scrollY > 0) return
  startY = e.touches[0].clientY
  pulling = true
}
function onTouchMove(e) {
  if (!pulling || !ptrBar.value) return
  const dy = e.touches[0].clientY - startY
  if (dy <= 0) { ptrBar.value.style.height = '0'; return }
  const h = Math.min(dy * 0.4, 52)
  ptrBar.value.style.height = h + 'px'
}
function onTouchEnd() {
  if (!pulling || !ptrBar.value) return
  pulling = false
  const h = parseInt(ptrBar.value.style.height) || 0
  ptrBar.value.style.height = '0'
  if (h >= THRESHOLD) {
    appStore.toast('↺ Aggiornamento...')
    setTimeout(() => appStore.toast('✅ Aggiornato'), 400)
  }
}

// Health Connect (auto-sync, Android only)
async function autoSyncHealthConnect() {
  try {
    if (!window.Capacitor?.Plugins?.HealthConnect) return
    const HC = window.Capacitor.Plugins.HealthConnect
    let avail
    try { avail = await HC.checkAvailability() } catch { return }
    if (!avail || avail.availability !== 'Available') return
    // Permessi
    const permRes = await HC.checkHealthPermissions({ permissions: [{ accessType:'read', recordType:'Steps' }] })
    const granted = permRes?.results?.every(r => r.granted)
    if (!granted) return
    // Leggi passi oggi
    const today = new Date()
    today.setHours(0,0,0,0)
    const end = new Date(); end.setHours(23,59,59,999)
    const res = await HC.readRecords({ type:'Steps', timeRangeFilter:{ operator:'between', startTime:today.toISOString(), endTime:end.toISOString() }})
    if (res?.records?.length) {
      const total = res.records.reduce((s,r) => s + (r.count||r.steps||0), 0)
      if (total > 0) useStepsStore().setDay(getDK(0), total)
    }
  } catch {}
}

onMounted(() => {
  // PWA events
  window.addEventListener('beforeinstallprompt', e => {
    e.preventDefault()
    deferredInstallPrompt = e
    showInstallBanner.value = true
  })
  window.addEventListener('appinstalled', () => {
    showInstallBanner.value = false
    deferredInstallPrompt = null
    appStore.toast('✅ App installata!')
  })

  // Pull to refresh
  document.addEventListener('touchstart', onTouchStart, { passive: true })
  document.addEventListener('touchmove', onTouchMove, { passive: true })
  document.addEventListener('touchend', onTouchEnd, { passive: true })

  // Health Connect auto-sync
  if (window.Capacitor) {
    document.addEventListener('deviceready', () => setTimeout(autoSyncHealthConnect, 1200), false)
    setTimeout(autoSyncHealthConnect, 2500)
  }

  // Service Worker
  if ('serviceWorker' in navigator && !(window.Capacitor?.isNativePlatform())) {
    navigator.serviceWorker.register('/sw.js').catch(() => {})
  }
})

onUnmounted(() => {
  document.removeEventListener('touchstart', onTouchStart)
  document.removeEventListener('touchmove', onTouchMove)
  document.removeEventListener('touchend', onTouchEnd)
})
</script>
