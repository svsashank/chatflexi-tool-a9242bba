
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";

const PLUNK_PUBLIC_KEY = Deno.env.get("PLUNK_PUBLIC_KEY");
const PLUNK_SECRET_KEY = Deno.env.get("PLUNK_SECRET_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ResetPasswordRequest {
  email: string;
  redirectUrl: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Parse request
  try {
    const { email, redirectUrl }: ResetPasswordRequest = await req.json();
    
    if (!email) {
      return new Response(
        JSON.stringify({ error: "Email is required" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log(`Processing reset password request for: ${email}`);

    // Initialize the Supabase client with the service role key
    const supabase = createClient(
      SUPABASE_URL || "",
      SUPABASE_SERVICE_ROLE_KEY || ""
    );

    try {
      // Generate a password reset token using Supabase's admin API
      // Important: Using recovery type, not magiclink type
      const { data, error } = await supabase.auth.admin.generateLink({
        type: 'recovery',
        email: email,
        options: {
          // Make sure redirectTo points to the reset password page, not the root
          redirectTo: redirectUrl,
        }
      });

      if (error) throw error;
      
      if (!data || !data.properties || !data.properties.action_link) {
        throw new Error("Failed to generate reset link");
      }
      
      const resetLink = data.properties.action_link;
      console.log(`Generated reset link: ${resetLink}`);

      // Send email using Plunk
      const response = await fetch("https://api.useplunk.com/v1/send", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${PLUNK_SECRET_KEY}`,
        },
        body: JSON.stringify({
          to: email,
          subject: "Reset Your Password",
          body: `
            <h1>Reset Your Krix AI Password</h1>
            <p>We received a request to reset your password. Click the button below to set a new password:</p>
            <p style="text-align:center;">
              <a href="${resetLink}" style="display:inline-block;padding:12px 24px;background-color:#9b87f5;color:white;text-decoration:none;border-radius:4px;font-weight:bold;">
                Reset Password
              </a>
            </p>
            <p>If you didn't request this, you can safely ignore this email.</p>
            <p>The link will expire in 1 hour for security reasons.</p>
          `,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error("Failed to send email via Plunk:", errorData);
        return new Response(
          JSON.stringify({ error: "Failed to send reset email" }),
          { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      const plunkData = await response.json();
      console.log("Plunk email sent successfully:", plunkData);

      return new Response(
        JSON.stringify({ success: true, message: "Reset password email sent" }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    } catch (error) {
      console.error("Error generating reset link:", error);
      return new Response(
        JSON.stringify({ error: error.message || "Failed to generate reset link" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }
  } catch (error) {
    console.error("Error in send-password-reset function:", error);
    return new Response(
      JSON.stringify({ error: error.message || "An error occurred" }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
