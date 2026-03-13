<template>
  <!-- AZIONI PRINCIPALI -->
  <div class="acts" style="grid-template-columns: 1fr 1fr 1fr 1fr; padding: 10px 14px 4px; gap: 8px;">
    <button class="ba ba-p" @click="app.openPanelFor('pasto')">
      <span class="ico">🍽️</span><span class="lbl">Pasto</span>
    </button>
    <button class="ba ba-s" @click="app.openPanelFor('spuntino')">
      <span class="ico">🍎</span><span class="lbl">Spuntino</span>
    </button>
    <button class="ba ba-glic" @click="app.openPanelFor('glicemia')">
      <span class="ico">🩸</span><span class="lbl">Glicemia</span>
    </button>
    <button class="ba ba-ins" @click="app.openPanelFor('insulina')">
      <span class="ico">💉</span><span class="lbl">Insulina</span>
    </button>
  </div>

  <!-- GRIGLIA AZIONI SECONDARIE -->
  <div class="acts" style="grid-template-columns:repeat(4,1fr)">
    <button class="ba ba-o" @click="app.openPanelFor('correzione')">
      <span class="ico">🍬</span><span class="lbl">Correzione</span>
    </button>
    <button class="ba ba-aperi" @click="app.openPanelFor('aperitivi')">
      <span class="ico">🥂</span><span class="lbl">Aperitivo</span>
    </button>
    <button class="ba ba-sport" @click="app.openPanelFor('sport')">
      <span class="ico">🏃</span><span class="lbl">Sport</span>
    </button>
    <button class="ba ba-w" @click="app.showWaterModal = true">
      <span class="ico">💧</span><span class="lbl">Acqua</span>
    </button>
  </div>
</template>

<script setup>
import { useAppStore } from '@/stores/app.js'
const app = useAppStore()
</script>

<style>
.acts .ba .ico {
  font-size: 1.3rem;
  margin-bottom: 4px;
  line-height: 1;
}
/* Override global .ba .lbl so labels inherit the button's color */
.acts .ba .lbl { color: inherit; }

/* Primary actions */
.acts .ba-p    { background: rgba(0, 230, 118, 0.1);   color: var(--g); }
.acts .ba-s    { background: rgba(255, 171, 64, 0.1);  color: var(--o); }
.acts .ba-glic { background: rgba(64, 196, 255, 0.1);  color: var(--b); }
.acts .ba-ins  { background: rgba(206, 147, 216, 0.1); color: var(--p); }

/* Secondary actions */
.acts .ba-o     { background: rgba(255, 171, 64, 0.1);  color: var(--o); }   /* Correzione */
.acts .ba-i     { background: rgba(255, 138, 101, 0.1); color: var(--alc); } /* Alcool */
.acts .ba-aperi { background: rgba(128, 203, 196, 0.1); color: var(--nut); } /* Aperitivo */
.acts .ba-sport { background: rgba(3, 169, 244, 0.1);   color: #03a9f4; }    /* Sport */
.acts .ba-w     { background: rgba(64, 196, 255, 0.1);  color: var(--b); }   /* Acqua */
</style>
