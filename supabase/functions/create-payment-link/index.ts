
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

console.log('Create payment link function started')

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { credits } = await req.json()
    const pricePerCredit = 0.1 // $0.1 per credit
    const amount = credits * pricePerCredit

    // Create payment link using Cashfree API
    const response = await fetch('https://sandbox.cashfree.com/pg/links', {
      method: 'POST',
      headers: {
        'x-client-id': Deno.env.get('CASHFREE_APP_ID') || '',
        'x-client-secret': Deno.env.get('CASHFREE_SECRET_KEY') || '',
        'x-api-version': '2022-09-01',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        link_id: crypto.randomUUID(),
        link_amount: amount,
        link_currency: 'USD',
        link_purpose: `Purchase ${credits} compute credits`,
        customer_details: {
          customer_phone: '9999999999',
          customer_email: 'customer@example.com',
          customer_name: 'John Doe'
        },
        link_notify: {
          send_sms: false,
          send_email: false
        },
        link_meta: {
          credits: credits
        }
      })
    })

    const data = await response.json()
    console.log('Payment link created:', data)

    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    console.error('Error creating payment link:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})
