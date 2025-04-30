
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.36.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get request data
    const { userId, credits } = await req.json();
    
    if (!userId) {
      return new Response(
        JSON.stringify({ error: 'User ID is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    if (typeof credits !== 'number' || credits <= 0) {
      return new Response(
        JSON.stringify({ error: 'Credits must be a positive number' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Try the RPC function first
    const { data: rpcData, error: rpcError } = await supabase.rpc(
      'deduct_user_credits',
      {
        p_user_id: userId,
        p_credits: credits
      }
    );
    
    if (rpcError) {
      console.error('Error in RPC deduct_user_credits:', rpcError);
      
      // Fallback - direct database operations
      // First check if user has a record
      const { data: userCredit, error: selectError } = await supabase
        .from('user_compute_credits')
        .select('id, credit_balance')
        .eq('user_id', userId)
        .maybeSingle();
      
      if (selectError) {
        throw selectError;
      }
      
      if (!userCredit) {
        // Create a new record with initial credits minus the deduction
        const initialBalance = 1000; // Initial credit balance for new users
        const newBalance = Math.max(0, initialBalance - credits);
        
        const { error: insertError } = await supabase
          .from('user_compute_credits')
          .insert([
            {
              user_id: userId,
              credit_balance: newBalance
            }
          ]);
          
        if (insertError) {
          throw insertError;
        }
        
        return new Response(
          JSON.stringify({ 
            message: 'Created new credit record with initial balance', 
            previousBalance: initialBalance,
            deduction: credits,
            newBalance
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      } else {
        // Update existing balance
        const previousBalance = userCredit.credit_balance || 0;
        const newBalance = Math.max(0, previousBalance - credits);
        
        const { error: updateError } = await supabase
          .from('user_compute_credits')
          .update({ 
            credit_balance: newBalance,
            updated_at: new Date().toISOString()
          })
          .eq('id', userCredit.id);
          
        if (updateError) {
          throw updateError;
        }
        
        return new Response(
          JSON.stringify({ 
            message: 'Credits deducted successfully', 
            previousBalance,
            deduction: credits,
            newBalance
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    } else {
      // RPC was successful
      return new Response(
        JSON.stringify({ 
          message: 'Credits deducted successfully via RPC',
          data: rpcData
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
  } catch (error) {
    console.error('Error in deduct-user-credits:', error);
    
    return new Response(
      JSON.stringify({ error: error.message || 'An unexpected error occurred' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
