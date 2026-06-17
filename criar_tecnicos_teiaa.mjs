import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'

function loadEnvFile(file) {
  const out = {}
  if (!fs.existsSync(file)) return out
  const txt = fs.readFileSync(file, 'utf8')
  for (const line of txt.split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) continue
    const [key, ...rest] = trimmed.split('=')
    out[key.trim()] = rest.join('=').trim().replace(/^['"]|['"]$/g, '')
  }
  return out
}

const env = {
  ...loadEnvFile(path.resolve('.env')),
  ...loadEnvFile(path.resolve('.env.local')),
  ...process.env,
}

const SUPABASE_URL = env.SUPABASE_URL || env.VITE_SUPABASE_URL
const SERVICE_ROLE_KEY = env.SUPABASE_SERVICE_ROLE_KEY || env.SERVICE_ROLE_KEY
const SENHA_TEMPORARIA = env.SENHA_TEMPORARIA || 'Teiaa@2026'

if (!SUPABASE_URL) {
  console.error('ERRO: não achei SUPABASE_URL nem VITE_SUPABASE_URL no .env/.env.local.')
  process.exit(1)
}
if (!SERVICE_ROLE_KEY) {
  console.error('ERRO: informe SUPABASE_SERVICE_ROLE_KEY no ambiente. Exemplo:')
  console.error('set SUPABASE_SERVICE_ROLE_KEY=sua_service_role_key')
  process.exit(1)
}

const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const tecnicos = [
  { equipe_id: 15, nome: 'Adriana Augusta de Souza Porto', email: 'adriana.porto@associacaoteiaa.com' },
  { equipe_id: 3,  nome: 'Aline da Costa Rodrigues', email: 'aline.rodrigues@associacaoteiaa.com' },
  { equipe_id: 16, nome: 'Ane Caroline Monteiro de Lima', email: 'ane.lima@associacaoteiaa.com' },
  { equipe_id: 6,  nome: 'Keili de Freitas Tavares Machado', email: 'keili.machado@associacaoteiaa.com' },
  { equipe_id: 7,  nome: 'Maria Eduarda Ribeiro de Lima', email: 'mariaeduarda.lima@associacaoteiaa.com' },
  { equipe_id: 8,  nome: 'Nathany Duarte Teixeira', email: 'nathany.teixeira@associacaoteiaa.com' },
]

async function findUserByEmail(email) {
  let page = 1
  const perPage = 1000
  while (true) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage })
    if (error) throw error
    const found = data.users.find(u => String(u.email || '').toLowerCase() === email.toLowerCase())
    if (found) return found
    if (!data.users || data.users.length < perPage) return null
    page++
  }
}

for (const t of tecnicos) {
  try {
    let authUser = await findUserByEmail(t.email)

    if (!authUser) {
      const { data, error } = await admin.auth.admin.createUser({
        email: t.email,
        password: SENHA_TEMPORARIA,
        email_confirm: true,
        user_metadata: { nome: t.nome, perfil: 'tecnico', equipe_id: t.equipe_id },
      })
      if (error) throw error
      authUser = data.user
      console.log('CRIADO AUTH:', t.email)
    } else {
      const { data, error } = await admin.auth.admin.updateUserById(authUser.id, {
        password: SENHA_TEMPORARIA,
        email_confirm: true,
        user_metadata: { nome: t.nome, perfil: 'tecnico', equipe_id: t.equipe_id },
      })
      if (error) throw error
      authUser = data.user
      console.log('ATUALIZADO AUTH:', t.email)
    }

    const { error: perfilError } = await admin.from('usuarios').upsert({
      id: authUser.id,
      email: t.email,
      nome: t.nome,
      perfil: 'tecnico',
      equipe_id: t.equipe_id,
      bio: 'Técnico TEAcolher',
    }, { onConflict: 'id' })

    if (perfilError) throw perfilError
    console.log('OK PERFIL:', t.nome, '=> tecnico / equipe_id', t.equipe_id)
  } catch (e) {
    console.error('ERRO EM', t.email, '-', e.message || e)
    process.exitCode = 1
  }
}

console.log('\nFINALIZADO.')
console.log('Senha temporária para todos:', SENHA_TEMPORARIA)
console.log('Perfis criados como: tecnico')
console.log('E-mails já confirmados: sim')
