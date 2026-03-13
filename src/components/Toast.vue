<template>
  <div class="toast" :class="{ on: app.toastVisible }">{{ app.toastMsg }}</div>
</template>

<script setup>
import { useAppStore } from '@/stores/app.js'
const app = useAppStore()
</script>
