# GlicoLog — Vue 3

Migrazione da single-file HTML a Vue 3 + Vite + Pinia.

## Stack

- **Vue 3** (Composition API + `<script setup>`)
- **Pinia** — state management (entries, config, food DB, app UI)
- **Vite** — bundler + dev server
- **vite-plugin-pwa** — manifest + service worker automatici

## Setup

```bash
npm install
npm run dev        # sviluppo locale → http://localhost:5173
npm run build      # build produzione → dist/
npm run preview    # preview build
```

## Struttura

```
src/
├── main.js              # entry point
├── App.vue              # root component
├── assets/
│   └── main.css         # design tokens + stili globali
├── data/
│   └── constants.js     # KEY, DEF, ALCDB, APERIDB, DI, MI, helpers
├── stores/
│   ├── index.js         # useEntriesStore, useConfigStore, useFoodDbStore, useStepsStore
│   └── app.js           # useAppStore (UI state: panel, toast, theme, modals)
└── components/
    ├── AppHeader.vue
    ├── Big3Actions.vue        # Glicemia / Insulina / Pasto + azioni secondarie
    ├── SummaryStrip.vue       # chip orizzontali riepilogo giornaliero
    ├── DayNavigation.vue      # frecce ‹ ›
    ├── NutritionSection.vue   # barre macro collassabili
    ├── SummaryBoxes.vue       # box glicemia, alcool settimana, sport, passi
    ├── Timeline.vue           # lista voci con swipe-to-delete
    ├── Toast.vue
    ├── shared/
    │   ├── SegmentControl.vue
    │   ├── TrendSelector.vue
    │   ├── FoodRow.vue        # riga alimento con autocomplete + macro
    │   └── TimeRow.vue
    ├── panels/
    │   ├── PanelBase.vue
    │   ├── PanelPasto.vue
    │   ├── PanelSpuntino.vue
    │   ├── PanelGlicemia.vue
    │   ├── PanelInsulina.vue
    │   ├── PanelAlcool.vue
    │   ├── PanelSport.vue
    │   ├── PanelAperitivi.vue
    │   └── PanelProfilo.vue
    └── modals/
        └── Modals.vue         # DeleteConfirm + Steps + Water modals
```

## Compatibilità Android

- `manifest.json` generato automaticamente da `vite-plugin-pwa`
- `safe-area-inset-*` gestiti nel CSS per notch/status bar
- Touch events passivi (`passive: true`) per scroll fluido
- Health Connect: integrazione via `window.Capacitor.Plugins.HealthConnect` (invariata)
- `overscroll-behavior: none` per evitare bounce Android

## Feature non ancora migrate

- **Grafico glicemia** (Canvas) → da portare con Chart.js o vue-chartjs
- **Calendario mensile** → da implementare come componente
- **Scanner barcode** → da portare con html5-qrcode o ZXing
- **Export PDF** → da portare con jsPDF
- **Overlay chart multi-giorno** → da implementare

## Dati

Il localStorage è 100% compatibile con la versione originale:
- `glicolog_v2` — array voci
- `glicolog_cfg6` — configurazione utente
- `glicolog_fooddb7` — alimenti personalizzati
- `gl_steps` — passi giornalieri

Il database nutrizionale (`CREA_DB` da `db_crea.js`) viene caricato
via `window.CREA_DB` se il file è incluso nell'HTML — da ottimizzare
in un import ES module diretto.

## Note sulla migrazione

Il database nutrizionale (`db_crea.js`, ~8900 voci) è ancora nella
versione global `window.CREA_DB`. Per una migrazione completa si può
convertirlo in un ES module:

```js
// db_crea.js → export const CREA_DB = { ... }
// useFoodDbStore.js → import { CREA_DB } from './db_crea.js'
```
