<template>
  <div class="fr tr-fr">
    <span class="fl tr-lbl">📅 Data &amp; Ora</span>
    <div class="tr-grid">
      <input type="date" class="fi" v-model="localDate" />
      <input type="time" class="fi" v-model="localTime" />
      <button class="time-now-btn tr-now" @click="setNow">ADESSO</button>
    </div>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue'
import { p2 } from '@/data/constants.js'

const props = defineProps({ modelValue: { type: Number, default: 0 } }) // timestamp ms
const emit = defineEmits(['update:modelValue'])

const localDate = ref('')
const localTime = ref('')

function setNow() {
  const n = new Date()
  localDate.value = `${n.getFullYear()}-${p2(n.getMonth()+1)}-${p2(n.getDate())}`
  localTime.value = `${p2(n.getHours())}:${p2(n.getMinutes())}`
  emitTs()
}

function emitTs() {
  if (!localDate.value || !localTime.value) return
  const [y,m,d] = localDate.value.split('-').map(Number)
  const [h,min] = localTime.value.split(':').map(Number)
  emit('update:modelValue', new Date(y, m-1, d, h, min).getTime())
}

watch([localDate, localTime], emitTs)

// Init from props timestamp
watch(() => props.modelValue, (ts) => {
  if (!ts) { setNow(); return }
  const d = new Date(ts)
  localDate.value = `${d.getFullYear()}-${p2(d.getMonth()+1)}-${p2(d.getDate())}`
  localTime.value = `${p2(d.getHours())}:${p2(d.getMinutes())}`
}, { immediate: true })
</script>
