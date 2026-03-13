import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useAppStore = defineStore('app', () => {
  // Offset giorno: 0=oggi, -1=ieri, ecc.
  const dayOffset = ref(0)

  // Pannello aperto (nome: 'pasto'|'spuntino'|'glicemia'|'insulina'|'alcool'|'sport'|'aperitivi'|'profilo'|null)
  const openPanel = ref(null)

  // Voce in modifica
  const editEntry = ref(null)

  // Toast
  const toastMsg = ref('')
  const toastVisible = ref(false)
  let _toastTimer = null

  function toast(msg) {
    toastMsg.value = msg
    toastVisible.value = true
    if (_toastTimer) clearTimeout(_toastTimer)
    _toastTimer = setTimeout(() => { toastVisible.value = false }, 2800)
  }

  // Tema
  const theme = ref(localStorage.getItem('glicolog_theme') || 'dark')
  function setTheme(t) {
    theme.value = t
    localStorage.setItem('glicolog_theme', t)
    document.body.classList.toggle('light-mode', t === 'light')
  }
  // Applica subito
  document.body.classList.toggle('light-mode', theme.value === 'light')

  // Modal
  const showDeleteConfirm = ref(false)
  const deleteTarget = ref(null)
  const deleteMsg = ref('')
  const showStepsModal = ref(false)
  const showWaterModal = ref(false)
  const showPdfModal = ref(false)
  const showScanner = ref(false)
  const scannerTarget = ref(null) // 'P' | 'S'

  // Panel open/close
  function openPanelFor(name, entry = null) {
    openPanel.value = name
    editEntry.value = entry
  }
  function closePanel() {
    openPanel.value = null
    editEntry.value = null
  }

  // Delete flow
  function confirmDelete(entryId, msg = 'Vuoi eliminare questa voce?') {
    deleteTarget.value = entryId
    deleteMsg.value = msg
    showDeleteConfirm.value = true
  }
  function cancelDelete() {
    showDeleteConfirm.value = false
    deleteTarget.value = null
  }

  return {
    dayOffset, openPanel, editEntry,
    toastMsg, toastVisible, toast,
    theme, setTheme,
    showDeleteConfirm, deleteTarget, deleteMsg, showStepsModal,
    showWaterModal, showPdfModal, showScanner, scannerTarget,
    openPanelFor, closePanel, confirmDelete, cancelDelete
  }
})
