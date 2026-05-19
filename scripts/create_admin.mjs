import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://zyltfrvtgvacodbhzmhr.supabase.co'
const SUPABASE_ANON_KEY = 'sb_publishable_u5oH85wRHyNEuDjfJzjWbQ_5SAeSzOV'

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

async function createAdmin() {
  const email = 'admin@essmar.gov.co'
  const password = 'Password123!'

  const { data: authData, error: authErr } = await supabase.auth.signUp({
    email,
    password
  })

  if (authErr) return

  await new Promise(r => setTimeout(r, 2000))

  await supabase
    .from('profiles')
    .update({ role: 'admin', full_name: 'Administrador ESSMAR' })
    .eq('id', authData.user.id)
    
  console.log('Admin creado.')
}

createAdmin()
