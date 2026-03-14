<template>
  <Teleport to="body">
    <div class="scanner-overlay" :class="{ on: modelValue }">
      <div class="scanner-header">
        <span class="scanner-title">📷 Scansiona barcode</span>
        <button class="scanner-close" @click="close">✕</button>
      </div>
      <div class="scanner-body">
        <video ref="videoEl" class="scanner-video" autoplay playsinline muted></video>
        <div class="scanner-frame">
          <div class="scanner-line"></div>
        </div>
        <p class="scanner-hint">Inquadra il barcode del prodotto</p>
        <p v-if="error" class="scanner-error">{{ error }}</p>
        <p v-if="searching" class="scanner-searching">🔍 Ricerca prodotto…</p>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { ref, watch, nextTick } from 'vue'

const props = defineProps({
  modelValue: { type: Boolean, default: false }
})
const emit = defineEmits(['update:modelValue', 'found'])

const videoEl = ref(null)
const error = ref('')
const searching = ref(false)

let stream = null
let detector = null
let rafId = null
let found = false

watch(() => props.modelValue, async (open) => {
  if (open) {
    error.value = ''
    found = false
    await startCamera()
  } else {
    stopCamera()
  }
})

async function startCamera() {
  if (!('BarcodeDetector' in window)) {
    error.value = 'Scansione barcode non supportata da questo browser (usa Chrome su Android)'
    return
  }
  try {
    stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } } })
    detector = new BarcodeDetector({ formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128', 'code_39'] })
    await nextTick()
    if (videoEl.value) {
      videoEl.value.srcObject = stream
      await videoEl.value.play()
      scanLoop()
    }
  } catch (e) {
    error.value = 'Impossibile accedere alla fotocamera'
  }
}

async function scanLoop() {
  if (!videoEl.value || !props.modelValue || found) return
  if (videoEl.value.readyState >= 2) {
    try {
      const results = await detector.detect(videoEl.value)
      if (results.length > 0 && !found) {
        found = true
        await lookupBarcode(results[0].rawValue)
        return
      }
    } catch {}
  }
  rafId = requestAnimationFrame(scanLoop)
}

async function lookupBarcode(barcode) {
  searching.value = true
  try {
    const r = await fetch(`https://world.openfoodfacts.org/api/v0/product/${barcode}.json?fields=product_name,nutriments`)
    const data = await r.json()
    if (data.status === 1 && data.product) {
      const p = data.product
      const n = p.nutriments || {}
      const name = (p.product_name || '').trim().substring(0, 60) || `Prodotto ${barcode}`
      const mac = {
        c: Math.round((n['carbohydrates_100g'] || 0) * 10) / 10,
        p: Math.round((n['proteins_100g'] || 0) * 10) / 10,
        g: Math.round((n['fat_100g'] || 0) * 10) / 10,
        f: Math.round((n['fiber_100g'] || 0) * 10) / 10,
        k: Math.round(n['energy-kcal_100g'] || 0),
      }
      close()
      emit('found', { name, mac })
    } else {
      error.value = `Prodotto (${barcode}) non trovato`
      found = false
      scanLoop()
    }
  } catch {
    error.value = 'Errore di rete durante la ricerca'
    found = false
    scanLoop()
  } finally {
    searching.value = false
  }
}

function stopCamera() {
  if (rafId) { cancelAnimationFrame(rafId); rafId = null }
  if (stream) { stream.getTracks().forEach(t => t.stop()); stream = null }
}

function close() {
  stopCamera()
  emit('update:modelValue', false)
}
</script>

<style scoped>
.scanner-overlay {
  position: fixed; inset: 0; background: #000; z-index: 10000;
  display: flex; flex-direction: column;
  opacity: 0; pointer-events: none; transition: opacity .2s;
}
.scanner-overlay.on { opacity: 1; pointer-events: all; }

.scanner-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 16px 20px 12px; background: rgba(0,0,0,.7);
  border-bottom: 1px solid rgba(255,255,255,.1);
}
.scanner-title { font-size: .95rem; font-weight: 700; color: #fff; }
.scanner-close {
  background: rgba(255,255,255,.12); border: none; color: #fff;
  width: 34px; height: 34px; border-radius: 50%; font-size: 1rem;
  cursor: pointer; display: flex; align-items: center; justify-content: center;
}

.scanner-body {
  flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center;
  position: relative; overflow: hidden;
}

.scanner-video {
  width: 100%; height: 100%; object-fit: cover; position: absolute; inset: 0;
}

.scanner-frame {
  position: relative; z-index: 1;
  width: 260px; height: 160px; border-radius: 12px;
  border: 2px solid rgba(34,211,238,.8);
  box-shadow: 0 0 0 9999px rgba(0,0,0,.55);
  overflow: hidden;
}
.scanner-line {
  position: absolute; left: 0; right: 0; height: 2px;
  background: rgba(34,211,238,.9);
  animation: scan-move 1.8s linear infinite;
}
@keyframes scan-move {
  0%   { top: 10%; }
  50%  { top: 88%; }
  100% { top: 10%; }
}

.scanner-hint {
  position: relative; z-index: 1; margin-top: 18px;
  color: rgba(255,255,255,.7); font-size: .82rem; text-align: center;
}
.scanner-error {
  position: relative; z-index: 1; margin-top: 8px;
  color: #ff6b6b; font-size: .8rem; text-align: center; padding: 0 20px;
}
.scanner-searching {
  position: relative; z-index: 1; margin-top: 8px;
  color: #22d3ee; font-size: .82rem; text-align: center;
}
</style>
