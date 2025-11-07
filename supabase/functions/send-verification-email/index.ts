import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface EmailRequest {
  email: string;
  confirmationUrl: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, confirmationUrl }: EmailRequest = await req.json();

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "NEMSS09 Set <onboarding@resend.dev>",
        to: [email],
        subject: "Verify Your Email - NEMSS09 Set",
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
                @media only screen and (max-width: 600px) {
                  .content { padding: 30px 20px; }
                  .button { display: block; }
                }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="header">
                  <h1 style="margin: 0; font-size: 28px;">Welcome to NEMSS09 Set!</h1>
                </div>
                <div class="content">
                  <p style="font-size: 16px;">Hello,</p>
                  <p style="font-size: 16px;">Thank you for joining the NEMSS09 Set alumni platform. Please verify your email address to activate your account and access all features.</p>
                  <div style="text-align: center;">
                    <a href="${confirmationUrl}" class="button">Verify Email Address</a>
                  </div>
                  <p style="font-size: 14px; color: #666; margin-top: 30px;">If the button doesn't work, copy and paste this link into your browser:</p>
                  <p style="font-size: 12px; color: #999; word-break: break-all;">${confirmationUrl}</p>
                  <p style="font-size: 14px; color: #666; margin-top: 30px;">If you didn't create an account, please ignore this email.</p>
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
