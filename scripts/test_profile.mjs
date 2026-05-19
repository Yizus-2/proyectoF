import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://zyltfrvtgvacodbhzmhr.supabase.co'
const SUPABASE_ANON_KEY = 'sb_publishable_u5oH85wRHyNEuDjfJzjWbQ_5SAeSzOV'

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

async function testProf() {
  const { data: authData, error: authErr } = await supabase.auth.signInWithPassword({
    email: 'operador@essmar.gov.co',
    password: 'Password123!'
  })
  
  if (authErr) {
    console.error("LOGIN ERROR:", authErr.message)
    return
  }

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', authData.user.id).single()
  console.log("Profile:", profile)
}
testProf()
