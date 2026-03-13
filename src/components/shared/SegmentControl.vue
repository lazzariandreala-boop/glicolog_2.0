<template>
  <div class="seg">
    <button
      v-for="opt in options"
      :key="opt.value"
      class="sb"
      :class="[colorClass, { on: modelValue === opt.value }]"
      @click="$emit('update:modelValue', opt.value)"
    >
      {{ opt.label }}
    </button>
  </div>
</template>

<script setup>
defineProps({
  options: { type: Array, required: true }, // [{ value, label }]
  modelValue: { type: String, default: '' },
  colorClass: { type: String, default: 'g' }
})
defineEmits(['update:modelValue'])
</script>
