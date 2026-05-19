import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://zyltfrvtgvacodbhzmhr.supabase.co'
const SUPABASE_ANON_KEY = 'sb_publishable_u5oH85wRHyNEuDjfJzjWbQ_5SAeSzOV'

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

async function check() {
  const { data, error } = await supabase.from('reports').select('*').eq('tracking_code', 'REP-20260510-0002').single()
  console.log(data)
}
check()
