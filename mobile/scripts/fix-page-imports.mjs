import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const base = path.join(__dirname, '..', 'src', 'pages')
const dirs = [
  'login-page',
  'lobby-page',
  'game-page',
  'profile-page',
  'teams-page',
  'settings-page',
  'more-page',
]

function fix(s) {
  return s
    .replace(/from '\.\.\/components\//g, "from '@/components/")
    .replace(/from "\.\.\/components\//g, 'from "@/components/')
    .replace(/from '\.\.\/stores\//g, "from '@/stores/")
    .replace(/from "\.\.\/stores\//g, 'from "@/stores/')
    .replace(/from '\.\.\/socket'/g, "from '@/shared/socket'")
    .replace(/from "\.\.\/socket"/g, 'from "@/shared/socket"')
    .replace(/from '\.\.\/utils\/socketAuth'/g, "from '@/shared/utils/socketAuth'")
    .replace(/from "\.\.\/utils\/socketAuth"/g, 'from "@/shared/utils/socketAuth"')
    .replace(/from '\.\.\/utils\/actionFormat'/g, "from '@/shared/utils/actionFormat'")
    .replace(/from "\.\.\/utils\/actionFormat"/g, 'from "@/shared/utils/actionFormat"')
    .replace(/from '\.\.\/utils\/authPersistence'/g, "from '@/shared/utils/authPersistence'")
    .replace(/from "\.\.\/utils\/authPersistence"/g, 'from "@/shared/utils/authPersistence"')
    .replace(/from '\.\.\/api\//g, "from '@/api/")
    .replace(/from "\.\.\/api\//g, 'from "@/api/')
}

for (const d of dirs) {
  const f = path.join(base, d, 'index.vue')
  const t = fix(fs.readFileSync(f, 'utf8'))
  fs.writeFileSync(f, t)
}
console.log('fix-page-imports ok')
