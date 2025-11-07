import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface EmailRequest {
  email: string;
  resetUrl: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, resetUrl }: EmailRequest = await req.json();

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "NEMSS09 Set <onboarding@resend.dev>",
        to: [email],
        subject: "Reset Your Password - NEMSS09 Set",
        html: `
          <!DOCTYPE html>
          <html>
            <head>
              <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
              <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #0E3B43; background-color: #f4f4f4; margin: 0; padding: 0; }
                .container { max-width: 600px; margin: 20px auto; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
                .header { background: #0E3B43; color: #F8E39C; padding: 30px; text-align: center; }
                .content { padding: 40px 30px; }
                .button { display: inline-block; padding: 14px 32px; background: #0E3B43; color: #F8E39C !important; text-decoration: none; border-radius: 6px; font-weight: bold; margin: 20px 0; }
                .footer { background: #f8f8f8; padding: 20px; text-align: center; font-size: 12px; color: #666; }
                .warning { background: #fff3cd; border-left: 4px solid #ffc107; padding: 12px; margin: 20px 0; }
                @media only screen and (max-width: 600px) {
                  .content { padding: 30px 20px; }
                  .button { display: block; }
                }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="header">
                  <h1 style="margin: 0; font-size: 28px;">Password Reset Request</h1>
                </div>
                <div class="content">
                  <p style="font-size: 16px;">Hello,</p>
                  <p style="font-size: 16px;">We received a request to reset your password for your NEMSS09 Set account. Click the button below to create a new password.</p>
                  <div style="text-align: center;">
                    <a href="${resetUrl}" class="button">Reset Password</a>
                  </div>
                  <p style="font-size: 14px; color: #666; margin-top: 30px;">If the button doesn't work, copy and paste this link into your browser:</p>
                  <p style="font-size: 12px; color: #999; word-break: break-all;">${resetUrl}</p>
                  <div class="warning">
                    <p style="margin: 0; font-size: 14px;"><strong>Security Notice:</strong> This link will expire in 60 minutes. If you didn't request a password reset, please ignore this email and your password will remain unchanged.</p>
                  </div>
                </div>
                <div class="footer">
                  <p>© 2024 NEMSS09 Set. All rights reserved.</p>
                </div>
              </div>
            </body>
          </html>
        `,
      }),
    });

    const data = await res.json();

    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
