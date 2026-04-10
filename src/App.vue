<template>
  <div>

    <!-- ═══════════════════════════════════════════
         DESKTOP APP  ≥ 900px
         Sidebar + Topbar + Content area
         ═══════════════════════════════════════════ -->
    <template v-if="isDesktop">
      <div class="desk-app">

        <!-- ── Sidebar ── -->
        <aside class="desk-sidebar">
          <!-- Logo -->
          <div class="desk-logo">Glic<em>o</em>Log</div>

          <!-- Navigazione viste -->
          <div class="desk-nav-group">
            <div class="desk-nav-label">VISTE</div>
            <button v-for="t in deskTabs" :key="t.v"
                    class="desk-nav-btn" :class="{ on: activeTab === t.v }"
                    @click="activeTab = t.v">
              <span class="desk-nav-ico">{{ t.ico }}</span>{{ t.lbl }}
            </button>
          </div>

          <!-- Inserimento rapido -->
          <div class="desk-nav-group">
            <div class="desk-nav-label">INSERIMENTO RAPIDO</div>
            <button v-for="a in deskActions" :key="a.panel"
                    class="desk-action-btn"
                    @click="appStore.openPanelFor(a.panel)">
              <span class="desk-nav-ico">{{ a.ico }}</span>{{ a.lbl }}
            </button>
          </div>

          <!-- Footer sidebar -->
          <div class="desk-sidebar-footer">
            <button class="desk-footer-btn" @click="appStore.openPanelFor('profilo')">
              <span class="desk-nav-ico">⚙️</span> Profilo & Config
            </button>
            <button class="desk-footer-btn" :class="{ spinning: deskSyncing }" @click="deskSyncGist" :disabled="deskSyncing">
              <span class="desk-nav-ico">🔄</span> Sincronizza Gist
            </button>
            <button class="desk-footer-btn" @click="appStore.setTheme(appStore.theme === 'dark' ? 'light' : 'dark')">
              <span class="desk-nav-ico">{{ appStore.theme === 'dark' ? '☀️' : '🌙' }}</span>
              {{ appStore.theme === 'dark' ? 'Modalità chiara' : 'Modalità scura' }}
            </button>
          </div>
        </aside>

        <!-- ── Main area ── -->
        <div class="desk-main">

          <!-- Topbar -->
          <div class="desk-topbar">
            <div class="desk-topbar-title">{{ deskCurrentTitle }}</div>
            <div class="desk-topbar-daynav">
              <button class="desk-dn-btn" @click="appStore.dayOffset--">‹</button>
              <span class="desk-dn-lbl">{{ deskDateLabel }}<span v-if="appStore.dayOffset === 0" class="desk-oggi"> OGGI</span></span>
              <button class="desk-dn-btn" :disabled="appStore.dayOffset >= 0" @click="appStore.dayOffset++">›</button>
            </div>
            <div class="desk-topbar-clock">{{ deskTime }}</div>
          </div>

          <!-- Content -->
          <div class="desk-content">
            <template v-if="activeTab === 'entries'">
              <SummaryStrip />
              <Timeline />
            </template>
            <GlucoseChart    v-else-if="activeTab === 'stats'" />
            <MonthlyCalendar v-else-if="activeTab === 'calendar'" />
            <HealthSummary   v-else-if="activeTab === 'health'" />
            <template v-else-if="activeTab === 'nutrition'">
              <NutritionSection />
              <SummaryBoxes />
            </template>
          </div>
        </div>
      </div>
    </template>

    <!-- ═══════════════════════════════════════════
         MOBILE LAYOUT  < 900px
         ═══════════════════════════════════════════ -->
    <template v-else>
      <!-- HEADER mobile -->
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

      <!-- NAVIGAZIONE GIORNO -->
      <DayNavigation />

      <!-- TAB CONTENT -->
      <div class="tab-content">
        <template v-if="activeTab === 'entries'">
          <SummaryStrip />
          <Timeline />
        </template>
        <template v-else-if="activeTab === 'stats'">
          <div class="tab-pad"><GlucoseChart /></div>
        </template>
        <template v-else-if="activeTab === 'calendar'">
          <div class="tab-pad"><MonthlyCalendar /></div>
        </template>
        <template v-else-if="activeTab === 'nutrition'">
          <NutritionSection />
          <SummaryBoxes />
        </template>
        <template v-else-if="activeTab === 'health'">
          <div class="tab-pad"><HealthSummary /></div>
        </template>
      </div>

      <!-- BOTTOM NAVBAR -->
      <nav class="bnav">
        <button class="bnav-tab" :class="{ active: activeTab === 'entries' }" @click="activeTab = 'entries'">
          <span class="bnav-ico">📋</span><span class="bnav-lbl">TimeLine</span>
        </button>
        <button class="bnav-tab" :class="{ active: activeTab === 'stats' }" @click="activeTab = 'stats'">
          <span class="bnav-ico">📊</span><span class="bnav-lbl">Grafici</span>
        </button>
        <button class="bnav-tab" :class="{ active: activeTab === 'calendar' }" @click="activeTab = 'calendar'">
          <span class="bnav-ico">📅</span><span class="bnav-lbl">Mensile</span>
        </button>
        <button class="bnav-tab" :class="{ active: activeTab === 'health' }" @click="activeTab = 'health'">
          <span class="bnav-ico">🏃</span><span class="bnav-lbl">Salute</span>
        </button>
        <button class="bnav-tab" :class="{ active: activeTab === 'nutrition' }" @click="activeTab = 'nutrition'">
          <span class="bnav-ico">🥗</span><span class="bnav-lbl">Nutrizione</span>
        </button>
      </nav>

      <!-- FAB + fisso in basso a destra -->
      <button class="fab-add" @click="showQuickAdd = true" aria-label="Inserimento rapido">+</button>

      <!-- QUICK ADD SHEET -->
      <div class="qa-sheet" :class="{ on: showQuickAdd }">
        <div class="qa-handle"></div>
        <div class="qa-title">Inserimento rapido</div>
        <div class="home-grid">
          <button class="hg-btn hg-p"     @click="appStore.openPanelFor('pasto')"><span class="hg-ico">🍽️</span><span class="hg-lbl">Pasto</span></button>
          <button class="hg-btn hg-s"     @click="appStore.openPanelFor('spuntino')"><span class="hg-ico">🍎</span><span class="hg-lbl">Spuntino</span></button>
          <button class="hg-btn hg-sport" @click="appStore.openPanelFor('sport')"><span class="hg-ico">🏃</span><span class="hg-lbl">Sport</span></button>
          <button class="hg-btn hg-ins"   @click="appStore.openPanelFor('insulina')"><span class="hg-ico">💉</span><span class="hg-lbl">Insulina</span></button>
          <button class="hg-btn hg-cor"   @click="appStore.openPanelFor('correzione')"><span class="hg-ico">🍬</span><span class="hg-lbl">Correzione</span></button>
          <button class="hg-btn hg-aperi" @click="appStore.openPanelFor('aperitivi')"><span class="hg-ico">🥂</span><span class="hg-lbl">Aperitivo</span></button>
          <button class="hg-btn hg-glic hg-full" @click="appStore.openPanelFor('glicemia')"><span class="hg-ico">🩸</span><span class="hg-lbl">Glicemia</span></button>
        </div>
      </div>
    </template>

    <!-- OVERLAY (pannelli + quick add) — sempre presente -->
    <div class="ov" :class="{ on: appStore.openPanel || showQuickAdd }" @click="closeOverlay()" />

    <!-- PANNELLI (sempre presenti per entrambi i layout) -->
    <PanelPasto />
    <PanelSpuntino />
    <PanelGlicemia />
    <PanelInsulina />
    <PanelAlcool />
    <PanelSport />
    <PanelCorrezione />
    <PanelAperitivi />
    <PanelProfilo />
    <PanelHealthSync />

    <!-- MODALS -->
    <Modals />

    <!-- TOAST -->
    <Toast />
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { useAppStore } from '@/stores/app.js'
import { getDF, p2 } from '@/data/constants.js'
import { getToken, getGistId, syncWithGist, exportToGist } from '@/utils/gistSync.js'
import { useHealthSyncStore } from '@/stores/healthSync.js'

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
import HealthSummary    from '@/components/HealthSummary.vue'

// Panels
import PanelPasto       from '@/components/panels/PanelPasto.vue'
import PanelSpuntino    from '@/components/panels/PanelSpuntino.vue'
import PanelGlicemia    from '@/components/panels/PanelGlicemia.vue'
import PanelInsulina    from '@/components/panels/PanelInsulina.vue'
import PanelAlcool      from '@/components/panels/PanelAlcool.vue'
import PanelSport       from '@/components/panels/PanelSport.vue'
import PanelCorrezione  from '@/components/panels/PanelCorrezione.vue'
import PanelAperitivi   from '@/components/panels/PanelAperitivi.vue'
import PanelProfilo     from '@/components/panels/PanelProfilo.vue'
import PanelHealthSync  from '@/components/panels/PanelHealthSync.vue'

const appStore = useAppStore()
const hsStore  = useHealthSyncStore()

const activeTab         = ref('entries')
const showInstallBanner = ref(false)
const showQuickAdd      = ref(false)
const deskSyncing       = ref(false)

// Rilevamento desktop (≥ 900px)
const mq        = window.matchMedia('(min-width: 900px)')
const isDesktop = ref(mq.matches)
mq.addEventListener('change', e => { isDesktop.value = e.matches })

// ── Desktop: clock ────────────────────────────────────────────
const deskTime = ref('')
function tickDesk() {
  const n = new Date()
  deskTime.value = `${p2(n.getHours())}:${p2(n.getMinutes())}`
}
let clockInterval = null

// ── Desktop: nav data ─────────────────────────────────────────
const deskTabs = [
  { v: 'entries',   ico: '📋', lbl: 'TimeLine' },
  { v: 'stats',     ico: '📊', lbl: 'Grafici glicemia' },
  { v: 'calendar',  ico: '📅', lbl: 'Riepilogo mensile' },
  { v: 'health',    ico: '🏃', lbl: 'Attività & Salute' },
  { v: 'nutrition', ico: '🥗', lbl: 'Nutrizione' },
]
const deskActions = [
  { panel: 'glicemia',   ico: '🩸', lbl: 'Misura glicemia' },
  { panel: 'pasto',      ico: '🍽️', lbl: 'Nuovo pasto' },
  { panel: 'insulina',   ico: '💉', lbl: 'Insulina' },
  { panel: 'sport',      ico: '🏃', lbl: 'Attività sportiva' },
  { panel: 'correzione', ico: '🍬', lbl: 'Correzione ipo' },
  { panel: 'spuntino',   ico: '🍎', lbl: 'Spuntino' },
  { panel: 'aperitivi',  ico: '🥂', lbl: 'Aperitivo / Alcool' },
]

const deskCurrentTitle = computed(() => deskTabs.find(t => t.v === activeTab.value)?.lbl ?? '')
const deskDateLabel    = computed(() => getDF(appStore.dayOffset))

// ── Desktop: Gist sync ────────────────────────────────────────
async function deskSyncGist() {
  if (!getToken() || !getGistId()) {
    appStore.toast('⚠️ Token e Gist ID richiesti — configurali nel Profilo')
    return
  }
  deskSyncing.value = true
  try {
    await syncWithGist()
    appStore.toast('✅ Sync completato')
    window.location.reload()
  } catch (e) {
    appStore.toast('❌ ' + e.message)
  } finally {
    deskSyncing.value = false
  }
}

// ── Chiudi overlay ─────────────────────────────────────────────
function closeOverlay() {
  if (appStore.openPanel) appStore.closePanel()
  else showQuickAdd.value = false
}

watch(() => appStore.openPanel, val => { if (val) showQuickAdd.value = false })

watch(() => appStore.dayOffset, async () => {
  if (!getToken() || !getGistId()) return
  try { await exportToGist() } catch {}
})

// ── PWA Install ────────────────────────────────────────────────
let deferredInstallPrompt = null
function doInstall() {
  if (!deferredInstallPrompt) return
  deferredInstallPrompt.prompt()
  deferredInstallPrompt = null
  showInstallBanner.value = false
}

// ── Health Connect auto-sync all'avvio ───────────────────────
async function autoSyncHealthConnect() {
  try {
    await hsStore.checkAvailability()
    if (!hsStore.available) return
    await hsStore.checkPermissions()
    if (!hsStore.hasPerms) return
    await hsStore.sync(7)
  } catch {}
}

onMounted(async () => {
  tickDesk()
  clockInterval = setInterval(tickDesk, 15000)

  window.addEventListener('beforeinstallprompt', e => {
    e.preventDefault(); deferredInstallPrompt = e; showInstallBanner.value = true
  })
  window.addEventListener('appinstalled', () => {
    showInstallBanner.value = false; deferredInstallPrompt = null
    appStore.toast('✅ App installata!')
  })

  if (window.Capacitor) {
    document.addEventListener('deviceready', () => setTimeout(autoSyncHealthConnect, 1200), false)
    setTimeout(autoSyncHealthConnect, 2500)
  }

  if ('serviceWorker' in navigator && !window.Capacitor?.isNativePlatform()) {
    navigator.serviceWorker.register('/sw.js').catch(() => {})
  }
})

onUnmounted(() => { if (clockInterval) clearInterval(clockInterval) })
</script>
