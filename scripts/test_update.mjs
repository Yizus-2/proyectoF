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

  // Find a report
  const { data: reports } = await supabase.from('reports').select('id, status').limit(1)
  if (!reports || reports.length === 0) {
    console.log("No reports found.")
    return
  }

  const report = reports[0]
  console.log("Updating report", report.id)

  const { data, error } = await supabase
    .from('reports')
    .update({ status: 'RESUELTO', work_order: 'cuadrilla a - camion 1' })
    .eq('id', report.id)
    
  console.log("Error:", error)
  console.log("Data:", data)
}
testUpdate()
