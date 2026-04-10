import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useSettingsStore = defineStore('settings', () => {
  const aiConfigs = ref([])

  function load() {
    try {
      aiConfigs.value = JSON.parse(localStorage.getItem('ai_configs') || '[]')
    } catch {
      aiConfigs.value = []
    }
  }

  function save(configs) {
    aiConfigs.value = configs
    localStorage.setItem('ai_configs', JSON.stringify(configs))
  }

  return { aiConfigs, load, save }
})
