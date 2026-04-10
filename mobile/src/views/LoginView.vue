<template>
  <div class="login-page">
    <div class="brand">
      <div class="logo">♠♥</div>
      <h1>德州扑克</h1>
    </div>

    <form class="form" @submit.prevent="handleSubmit">
      <!-- 用户名 -->
      <div class="field">
        <label for="username">用户名</label>
        <input
          id="username"
          v-model="form.username"
          type="text"
          placeholder="请输入用户名"
          autocomplete="username"
        />
      </div>

      <!-- 密码 -->
      <div class="field">
        <label for="password">密码</label>
        <input
          id="password"
          v-model="form.password"
          :type="showPwd ? 'text' : 'password'"
          placeholder="请输入密码"
          autocomplete="current-password"
        />
        <button type="button" class="toggle-pwd" @click="showPwd = !showPwd">
          {{ showPwd ? '隐藏' : '显示' }}
        </button>
      </div>

      <label class="remember-row">
        <input v-model="rememberMe" type="checkbox" />
        <span>记住我</span>
      </label>

      <!-- 注册时的额外字段 -->
      <template v-if="!isLoginMode">
        <div class="field">
          <label for="nickname">昵称 <span class="optional">（选填）</span></label>
          <input
            id="nickname"
            v-model="form.nickname"
            type="text"
            placeholder="请输入昵称"
          />
        </div>

        <div class="field">
          <label>性别 <span class="optional">（选填）</span></label>
          <div class="gender-row">
            <label class="gender-option" :class="{ active: form.gender === 'male' }">
              <input type="radio" v-model="form.gender" value="male" />
              <span>男</span>
            </label>
            <label class="gender-option" :class="{ active: form.gender === 'female' }">
              <input type="radio" v-model="form.gender" value="female" />
              <span>女</span>
            </label>
            <label class="gender-option" :class="{ active: form.gender === 'other' }">
              <input type="radio" v-model="form.gender" value="other" />
              <span>其他</span>
            </label>
            <label class="gender-option" :class="{ active: form.gender === '' }">
              <input type="radio" v-model="form.gender" value="" />
              <span>保密</span>
            </label>
          </div>
        </div>
      </template>

      <!-- 错误提示 -->
      <p v-if="authStore.error" class="error-msg">{{ authStore.error }}</p>

      <!-- 提交按钮 -->
      <button type="submit" class="btn-submit" :disabled="authStore.loading || !isValid">
        {{ authStore.loading ? '处理中...' : (isLoginMode ? '登 录' : '注 册') }}
      </button>

      <!-- 切换模式 -->
      <p class="switch-mode">
        {{ isLoginMode ? '还没有账号？' : '已有账号？' }}
        <a href="#" @click.prevent="isLoginMode = !isLoginMode">{{ isLoginMode ? '立即注册' : '去登录' }}</a>
      </p>
    </form>
  </div>
</template>

<script setup>
import { reactive, ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { loadSavedCredentials, loadRememberFlag } from '../utils/authPersistence'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()

const isLoginMode = ref(true)
const showPwd = ref(false)
const rememberMe = ref(false)

const form = reactive({ username: '', password: '', nickname: '', gender: '' })

onMounted(() => {
  rememberMe.value = loadRememberFlag()
  const saved = loadSavedCredentials()
  if (saved?.username) {
    form.username = saved.username
    if (saved.password) {
      form.password = saved.password
    }
  }
})

const isValid = computed(() => {
  const uOk = form.username.length >= 1 && form.username.length <= 20 && !/\s/.test(form.username) && !/[<>"'&\\\/]/.test(form.username)
  const pOk = form.password.length >= 1 && form.password.length <= 20 && !/\s/.test(form.password)
  return uOk && pOk
})

function postAuthRedirect() {
  const r = route.query.redirect
  const path = typeof r === 'string' && r.startsWith('/') ? r : '/lobby'
  router.replace(path)
}

async function handleSubmit() {
  if (!isValid.value) return
  const ok = isLoginMode.value
    ? await authStore.login(form.username, form.password, rememberMe.value)
    : await authStore.register(
        form.username,
        form.password,
        form.nickname,
        form.gender,
        rememberMe.value
      )

  if (ok) {
    postAuthRedirect()
  }
}
</script>

<style scoped>
.login-page {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  padding: 24px;
  background: var(--color-surface);
}

.brand {
  text-align: center;
  margin-bottom: 36px;
}
.logo {
  font-size: 48px;
  line-height: 1;
}
.brand h1 {
  font-size: 26px;
  font-weight: 800;
  color: var(--color-heading);
  margin-top: 8px;
  letter-spacing: -0.5px;
}

.form {
  width: 100%;
  max-width: 380px;
  padding: 28px 24px;
  background: var(--color-bg);
  border-radius: var(--radius-card);
  box-shadow: var(--shadow-card);
}

.field {
  position: relative;
  margin-bottom: 18px;
}
.field label {
  display: block;
  font-size: 13px;
  font-weight: 600;
  color: var(--color-label);
  margin-bottom: 6px;
}
.optional {
  font-weight: 400;
  color: var(--color-body);
  font-size: 12px;
}
.field input[type="text"],
.field input[type="password"] {
  width: 100%;
  height: 44px;
  padding: 0 12px;
  border: 1.5px solid var(--color-border);
  border-radius: var(--radius-input);
  font-size: 15px;
  outline: none;
  transition: border-color 0.2s;
}
.field input:focus {
  border-color: var(--color-primary);
}
.toggle-pwd {
  position: absolute;
  right: 8px;
  top: 32px;
  font-size: 12px;
  color: var(--color-body);
  background: none;
  border: none;
  cursor: pointer;
  padding: 4px 8px;
}

.gender-row {
  display: flex;
  gap: 8px;
}
.gender-option {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  height: 40px;
  border: 1.5px solid var(--color-border);
  border-radius: var(--radius-input);
  cursor: pointer;
  font-size: 13px;
  font-weight: 500;
  transition: all 0.15s;
}
.gender-option input {
  display: none;
}
.gender-option.active {
  border-color: var(--color-primary);
  background: rgba(83, 58, 253, 0.06);
  color: var(--color-primary);
  font-weight: 600;
}

.error-msg {
  color: var(--color-danger);
  font-size: 13px;
  margin-bottom: 12px;
}

.btn-submit {
  width: 100%;
  height: 48px;
  background: var(--color-primary);
  color: white;
  border: none;
  border-radius: var(--radius-btn);
  font-size: 16px;
  font-weight: 700;
  cursor: pointer;
  transition: background 0.15s;
}
.btn-submit:hover:not(:disabled) { background: var(--color-primary-hover); }
.btn-submit:disabled { opacity: 0.5; cursor: not-allowed; }

.switch-mode {
  text-align: center;
  margin-top: 16px;
  font-size: 13px;
  color: var(--color-body);
}
.switch-mode a {
  color: var(--color-primary);
  text-decoration: none;
  font-weight: 600;
}

.remember-row {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  font-size: 12px;
  color: var(--color-body);
  margin-bottom: 10px;
  cursor: pointer;
  line-height: 1.4;
}
.remember-row input {
  margin-top: 2px;
  flex-shrink: 0;
}
.remember-hint {
  font-size: 11px;
  color: var(--color-body);
  opacity: 0.85;
  margin: -4px 0 12px;
  line-height: 1.35;
}
</style>
