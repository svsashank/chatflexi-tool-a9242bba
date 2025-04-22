
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const PLUNK_PUBLIC_KEY = Deno.env.get("PLUNK_PUBLIC_KEY");
const PLUNK_SECRET_KEY = Deno.env.get("PLUNK_SECRET_KEY");

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
    console.log(`Redirect URL: ${redirectUrl}`);

    // Generate a token that will be valid for 24 hours
    const token = crypto.randomUUID();
    const encodedEmail = encodeURIComponent(email);
    const resetLink = `${redirectUrl}?token=${token}&email=${encodedEmail}`;

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
          <h1>Reset Password</h1>
          <p>Follow this link to reset the password for your user:</p>
          <p><a href="${resetLink}">Reset Password</a></p>
          <p>If you didn't request this, you can safely ignore this email.</p>
          <p>The link will expire in 24 hours.</p>
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

    const data = await response.json();
    console.log("Plunk email sent successfully:", data);

    return new Response(
      JSON.stringify({ success: true, message: "Reset password email sent" }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error) {
    console.error("Error in send-password-reset function:", error);
    return new Response(
      JSON.stringify({ error: error.message || "An error occurred" }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
