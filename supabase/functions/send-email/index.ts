import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface EmailRequest {
  user: {
    email: string;
  };
  email_data: {
    token: string;
    token_hash: string;
    redirect_to: string;
    email_action_type: string;
    site_url: string;
  };
}

const getEmailTemplate = (emailActionType: string, token: string, tokenHash: string, siteUrl: string, redirectTo: string) => {
  const baseUrl = siteUrl || "https://www.nemss09.com";
  
  if (emailActionType === "signup" || emailActionType === "invite") {
    const confirmationUrl = `${baseUrl}/auth/confirm?token_hash=${tokenHash}&type=email&redirect_to=${redirectTo}`;
    
    return {
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
    };
  } else if (emailActionType === "recovery" || emailActionType === "magiclink") {
    const resetUrl = `${baseUrl}/reset-password?token_hash=${tokenHash}&type=recovery`;
    
    return {
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
    };
  }
  
  return null;
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { user, email_data }: EmailRequest = await req.json();
    
    console.log("Email request received:", { 
      email: user.email, 
      action_type: email_data.email_action_type 
    });

    const emailTemplate = getEmailTemplate(
      email_data.email_action_type,
      email_data.token,
      email_data.token_hash,
      email_data.site_url,
      email_data.redirect_to
    );

    if (!emailTemplate) {
      throw new Error(`Unsupported email action type: ${email_data.email_action_type}`);
    }

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "NEMSS09 Set <noreply@nemss09.com>",
        to: [user.email],
        subject: emailTemplate.subject,
        html: emailTemplate.html,
      }),
    });

    const data = await res.json();
    
    if (!res.ok) {
      console.error("Resend API error:", data);
      throw new Error(data.message || "Failed to send email");
    }

    console.log("Email sent successfully:", data);

    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
    console.error("Error in send-email function:", errorMessage);
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
