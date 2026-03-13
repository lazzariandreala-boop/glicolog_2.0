<template>
  <div class="trend-sel">
    <button v-for="t in trends" :key="t.val" class="tsb" :class="[t.cls, { on: modelValue === t.val }]" @click="$emit('update:modelValue', t.val)">
      {{ t.ico }}
    </button>
  </div>
</template>

<script setup>
defineProps({ modelValue: { type: String, default: '' } })
defineEmits(['update:modelValue'])

const trends = [
  { val: '⬇', ico: '⬇', cls: 't-d2' },
  { val: '↘', ico: '↘', cls: 't-d1' },
  { val: '→', ico: '→', cls: 't-fl' },
  { val: '↗', ico: '↗', cls: 't-u1' },
  { val: '⬆', ico: '⬆', cls: 't-u2' },
]
</script>
