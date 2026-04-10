<template>
  <div class="settings-page">
    <header class="top-bar">
      <button class="btn-back" @click="$router.push('/lobby')">← 返回</button>
      <h2>设置</h2>
    </header>

    <main class="settings-main">
      <section class="section">
        <div class="section-header">
          <h3>个人资料</h3>
        </div>
        <div class="profile-form">
          <div class="field">
            <label>用户名</label>
            <input :value="authStore.user?.username" disabled class="disabled-input" />
          </div>
          <div class="field">
            <label>昵称</label>
            <input v-model="profileForm.nickname" placeholder="设置昵称" />
          </div>
          <div class="field">
            <label>性别</label>
            <div class="gender-row">
              <label class="gender-option" :class="{ active: profileForm.gender === 'male' }"><input type="radio" v-model="profileForm.gender" value="male" /><span>男</span></label>
              <label class="gender-option" :class="{ active: profileForm.gender === 'female' }"><input type="radio" v-model="profileForm.gender" value="female" /><span>女</span></label>
              <label class="gender-option" :class="{ active: profileForm.gender === 'other' }"><input type="radio" v-model="profileForm.gender" value="other" /><span>其他</span></label>
              <label class="gender-option" :class="{ active: profileForm.gender === '' }"><input type="radio" v-model="profileForm.gender" value="" /><span>保密</span></label>
            </div>
          </div>
          <button class="btn-save" @click="handleSaveProfile" :disabled="savingProfile">
            {{ savingProfile ? '保存中...' : '保存资料' }}
          </button>
        </div>
      </section>

      <section class="section">
        <h3>账户</h3>
        <button class="btn-logout-full" @click="handleLogout">退出登录</button>
      </section>
    </main>

    <nav class="bottom-nav">
      <router-link to="/lobby" class="nav-item" :class="{ active: route.path === '/lobby' }"><span class="nav-icon">🏠</span><span>大厅</span></router-link>
      <router-link to="/settings" class="nav-item" :class="{ active: route.path === '/settings' }"><span class="nav-icon">⚙️</span><span>设置</span></router-link>
      <router-link to="/more" class="nav-item" :class="{ active: route.path === '/more' }"><span class="nav-icon">⋯</span><span>更多</span></router-link>
    </nav>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { disconnect } from '../socket'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()

const profileForm = reactive({
  nickname: '',
  gender: '',
})
const savingProfile = ref(false)

async function handleSaveProfile() {
  savingProfile.value = true
  try {
    await authStore.updateProfile({
      nickname: profileForm.nickname,
      gender: profileForm.gender,
    })
    alert('资料已保存')
  } catch {
    // error already in store
  } finally {
    savingProfile.value = false
  }
}

function handleLogout() {
  authStore.logout()
  disconnect()
  router.replace('/login')
}

onMounted(() => {
  profileForm.nickname = authStore.user?.nickname || ''
  profileForm.gender = authStore.user?.gender || ''
})
</script>

<style scoped>
.settings-page {
  height: 100vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: var(--color-surface);
}

.top-bar {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  background: var(--color-bg);
  border-bottom: 1px solid var(--color-border);
  flex-shrink: 0;
}
.btn-back {
  padding: 5px 12px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-btn);
  background: transparent;
  font-size: 13px;
  cursor: pointer;
  color: var(--color-label);
}
.top-bar h2 { font-size: 18px; font-weight: 700; }

.settings-main {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
  padding-bottom: 72px;
}

.section { margin-bottom: 20px; }
.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}
.section h3 { font-size: 15px; font-weight: 700; }

/* 个人资料 */
.profile-form { display: flex; flex-direction: column; gap: 10px; }
.disabled-input {
  background: var(--color-surface);
  color: var(--color-body);
  cursor: not-allowed;
}
.gender-row {
  display: flex;
  gap: 6px;
}
.gender-option {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  height: 38px;
  border: 1.5px solid var(--color-border);
  border-radius: var(--radius-input);
  cursor: pointer;
  font-size: 13px;
  font-weight: 500;
  transition: all 0.15s;
}
.gender-option input { display: none; }
.gender-option.active {
  border-color: var(--color-primary);
  background: rgba(83, 58, 253, 0.06);
  color: var(--color-primary);
  font-weight: 600;
}
.btn-save {
  height: 40px;
  border: none;
  border-radius: var(--radius-btn);
  background: var(--color-primary);
  color: white;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
}
.btn-save:disabled { opacity: 0.6; cursor: not-allowed; }

.btn-logout-full {
  width: 100%;
  height: 44px;
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-card);
  font-size: 15px;
  color: var(--color-danger);
  font-weight: 600;
  cursor: pointer;
}

.bottom-nav {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  display: flex;
  background: var(--color-bg);
  border-top: 1px solid var(--color-border);
  padding-bottom: env(safe-area-inset-bottom);
  z-index: 40;
}
.nav-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 8px 0;
  text-decoration: none;
  color: var(--color-body);
  font-size: 11px;
}
.nav-item.active { color: var(--color-primary); }
.nav-icon { font-size: 20px; margin-bottom: 2px; }
</style>
