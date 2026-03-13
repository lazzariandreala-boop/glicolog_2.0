<template>
  <div class="daynav">
    <button class="dn-btn" @click="go(-1)">‹</button>
    <div class="dn-lbl">
      {{ dateLabel }}
      <span v-if="app.dayOffset === 0" class="oggi-b">OGGI</span>
    </div>
    <button class="dn-btn" :style="app.dayOffset >= 0 ? 'opacity:0.3;pointer-events:none' : ''" @click="go(1)">›</button>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useAppStore } from '@/stores/app.js'
import { getDF } from '@/data/constants.js'

const app = useAppStore()

const dateLabel = computed(() => getDF(app.dayOffset))

function go(d) {
  if (app.dayOffset === 0 && d === 1) return
  app.dayOffset += d
}
</script>
