import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://zyltfrvtgvacodbhzmhr.supabase.co'
const SUPABASE_ANON_KEY = 'sb_publishable_u5oH85wRHyNEuDjfJzjWbQ_5SAeSzOV'

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

async function testUpdate() {
  const { data: authData, error: authErr } = await supabase.auth.signInWithPassword({
    email: 'operador@essmar.gov.co',
    password: 'Password123!'
  })
  
  if (authErr) {
    console.error("LOGIN ERROR:", authErr.message)
    return
  }

  const { data: report } = await supabase.from('reports').select('id, status').eq('tracking_code', 'REP-20260510-0002').single()
  
  console.log("Current status:", report.status)

  const { data, error } = await supabase
    .from('reports')
    .update({ status: 'RESUELTO' })
    .eq('id', report.id)
    .select()
    
  console.log("Error:", error)
  console.log("Data after update:", data?.[0]?.status)
}
testUpdate()
