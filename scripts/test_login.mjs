import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://zyltfrvtgvacodbhzmhr.supabase.co'
const SUPABASE_ANON_KEY = 'sb_publishable_u5oH85wRHyNEuDjfJzjWbQ_5SAeSzOV'

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

async function testLogin() {
  const { data, error } = await supabase.auth.signInWithPassword({
    email: 'operador@essmar.gov.co',
    password: 'Password123!'
  })
  
  if (error) {
    console.error("LOGIN ERROR:", error.message)
  } else {
    console.log("LOGIN SUCCESSFUL! User ID:", data.user.id)
  }
}
testLogin()
