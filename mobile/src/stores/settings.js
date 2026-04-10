import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useSettingsStore = defineStore('settings', () => {
  const aiConfigs = ref([])
  const themeMode = ref('dark')

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

  function setTheme(mode) {
    themeMode.value = 'dark'
    localStorage.setItem('theme_mode', 'dark')
  }

  function toggleTheme() {
    themeMode.value = 'dark'
    localStorage.setItem('theme_mode', 'dark')
  }

  return { aiConfigs, themeMode, load, save, setTheme, toggleTheme }
})
