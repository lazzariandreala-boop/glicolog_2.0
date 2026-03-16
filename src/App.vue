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

    <!-- TAB CONTENT -->
    <div class="tab-content">

      <!-- GIORNALE (home): chip riepilogo + navigazione giorno + timeline -->
      <template v-if="activeTab === 'entries'">
        <SummaryStrip />
        <DayNavigation />
        <Timeline />
      </template>

      <!-- STATISTICHE: grafico + storico -->
      <template v-else-if="activeTab === 'stats'">
        <div class="tab-pad">
          <GlucoseChart />
        </div>
      </template>

      <!-- RIEPILOGO MENSILE -->
      <template v-else-if="activeTab === 'calendar'">
        <div class="tab-pad">
          <MonthlyCalendar />
        </div>
      </template>

      <!-- NUTRIZIONE: macro + 3 box riepilogo -->
      <template v-else-if="activeTab === 'nutrition'">
        <NutritionSection />
        <SummaryBoxes />
      </template>

    </div>

    <!-- BOTTOM NAVBAR -->
    <nav class="bnav">
      <button class="bnav-tab" :class="{ active: activeTab === 'entries' }" @click="activeTab = 'entries'">
        <span class="bnav-ico">📋</span><span class="bnav-lbl">Giornale</span>
      </button>
      <button class="bnav-tab" :class="{ active: activeTab === 'stats' }" @click="activeTab = 'stats'">
        <span class="bnav-ico">📊</span><span class="bnav-lbl">Grafici</span>
      </button>
      <button class="bnav-add" @click="showQuickAdd = true">+</button>
      <button class="bnav-tab" :class="{ active: activeTab === 'calendar' }" @click="activeTab = 'calendar'">
        <span class="bnav-ico">📅</span><span class="bnav-lbl">Mensile</span>
      </button>
      <button class="bnav-tab" :class="{ active: activeTab === 'nutrition' }" @click="activeTab = 'nutrition'">
        <span class="bnav-ico">🥗</span><span class="bnav-lbl">Nutrizione</span>
      </button>
    </nav>

    <!-- OVERLAY (pannelli + quick add) -->
    <div class="ov" :class="{ on: appStore.openPanel || showQuickAdd }" @click="closeOverlay()" />

    <!-- QUICK ADD SHEET -->
    <div class="qa-sheet" :class="{ on: showQuickAdd }">
      <div class="qa-handle"></div>
      <div class="qa-title">Inserimento rapido</div>
      <div class="home-grid">
        <button class="hg-btn hg-p"     @click="appStore.openPanelFor('pasto')">
          <span class="hg-ico">🍽️</span><span class="hg-lbl">Pasto</span>
        </button>
        <button class="hg-btn hg-s"     @click="appStore.openPanelFor('spuntino')">
          <span class="hg-ico">🍎</span><span class="hg-lbl">Spuntino</span>
        </button>
        <button class="hg-btn hg-glic"  @click="appStore.openPanelFor('glicemia')">
          <span class="hg-ico">🩸</span><span class="hg-lbl">Glicemia</span>
        </button>
        <button class="hg-btn hg-ins"   @click="appStore.openPanelFor('insulina')">
          <span class="hg-ico">💉</span><span class="hg-lbl">Insulina</span>
        </button>
        <button class="hg-btn hg-cor"   @click="appStore.openPanelFor('correzione')">
          <span class="hg-ico">🍬</span><span class="hg-lbl">Correzione</span>
        </button>
        <button class="hg-btn hg-aperi" @click="appStore.openPanelFor('aperitivi')">
          <span class="hg-ico">🥂</span><span class="hg-lbl">Aperitivo</span>
        </button>
      </div>
    </div>

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
import { ref, watch, onMounted, onUnmounted } from 'vue'
import { useAppStore } from '@/stores/app.js'
import { useStepsStore } from '@/stores/index.js'
import { getDK } from '@/data/constants.js'

// Components
import AppHeader        from '@/components/AppHeader.vue'
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
import PanelPasto      from '@/components/panels/PanelPasto.vue'
import PanelSpuntino   from '@/components/panels/PanelSpuntino.vue'
import PanelGlicemia   from '@/components/panels/PanelGlicemia.vue'
import PanelInsulina   from '@/components/panels/PanelInsulina.vue'
import PanelAlcool     from '@/components/panels/PanelAlcool.vue'
import PanelSport      from '@/components/panels/PanelSport.vue'
import PanelCorrezione from '@/components/panels/PanelCorrezione.vue'
import PanelAperitivi  from '@/components/panels/PanelAperitivi.vue'
import PanelProfilo    from '@/components/panels/PanelProfilo.vue'

const appStore = useAppStore()

const activeTab         = ref('entries')
const showInstallBanner = ref(false)
const showQuickAdd      = ref(false)
const ptrBar            = ref(null)

// Chiudi quick add quando si apre un pannello
watch(() => appStore.openPanel, val => { if (val) showQuickAdd.value = false })

function closeOverlay() {
  if (appStore.openPanel) appStore.closePanel()
  else showQuickAdd.value = false
}

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
  const h = Math.min(dy * 0.4, 68)
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
    const permRes = await HC.checkHealthPermissions({ permissions: [{ accessType: 'read', recordType: 'Steps' }] })
    const granted = permRes?.results?.every(r => r.granted)
    if (!granted) return
    const today = new Date(); today.setHours(0, 0, 0, 0)
    const end = new Date(); end.setHours(23, 59, 59, 999)
    const res = await HC.readRecords({ type: 'Steps', timeRangeFilter: { operator: 'between', startTime: today.toISOString(), endTime: end.toISOString() } })
    if (res?.records?.length) {
      const total = res.records.reduce((s, r) => s + (r.count || r.steps || 0), 0)
      if (total > 0) useStepsStore().setDay(getDK(0), total)
    }
  } catch {}
}

onMounted(() => {
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

  document.addEventListener('touchstart', onTouchStart, { passive: true })
  document.addEventListener('touchmove', onTouchMove, { passive: true })
  document.addEventListener('touchend', onTouchEnd, { passive: true })

  if (window.Capacitor) {
    document.addEventListener('deviceready', () => setTimeout(autoSyncHealthConnect, 1200), false)
    setTimeout(autoSyncHealthConnect, 2500)
  }

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
