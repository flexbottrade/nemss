import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface PaymentNotificationRequest {
  payment_type: "Dues" | "Event" | "Donation";
  payment_id: string;
  member_name: string;
  member_id: string;
  amount: number;
  date: string;
  details: string; // Year/month or event title
  payment_proof_url?: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const { 
      payment_type, 
      payment_id, 
      member_name, 
      member_id,
      amount, 
      date,
      details,
      payment_proof_url
    }: PaymentNotificationRequest = await req.json();

    console.log("Processing payment notification:", { 
      payment_type, 
      payment_id, 
      member_name, 
      member_id,
      amount, 
      date 
    });

    // Validate all required parameters
    if (!payment_type || !payment_id || !member_name || !member_id || !amount || !date || !details) {
      console.error("Missing payment details:", { 
        payment_type, 
        payment_id, 
        member_name, 
        member_id,
        amount, 
        date,
        details 
      });
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "Missing payment details - all fields are required" 
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Format amount with currency
    const formattedAmount = new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 0,
    }).format(amount);

    // Admin dashboard link to transaction page
    const adminDashboardLink = "https://www.nemss09.com/admin/transactions";

    // Create email HTML with brand colors
    const emailHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif;
              line-height: 1.6;
              color: #333;
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
            }
            .header {
              background: linear-gradient(135deg, #0E3B43 0%, #1a5560 100%);
              color: #F8E39C;
              padding: 30px 20px;
              text-align: center;
              border-radius: 8px 8px 0 0;
            }
            .header h1 {
              margin: 0;
              font-size: 24px;
              color: #F8E39C;
            }
            .content {
              background: #ffffff;
              padding: 30px;
              border: 1px solid #e0e0e0;
            }
            .detail-row {
              margin: 15px 0;
              padding: 10px;
              background: #f9f9f9;
              border-left: 4px solid #E7B343;
            }
            .detail-label {
              font-weight: bold;
              color: #0E3B43;
              display: inline-block;
              width: 150px;
            }
            .detail-value {
              color: #333;
            }
            .button {
              display: inline-block;
              padding: 12px 24px;
              background: #E7B343;
              color: #0E3B43;
              text-decoration: none;
              border-radius: 5px;
              font-weight: bold;
              margin-top: 20px;
            }
            .footer {
              background: #0E3B43;
              color: #F8E39C;
              padding: 20px;
              text-align: center;
              font-size: 12px;
              border-radius: 0 0 8px 8px;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>New Payment Submission – NEMSS 09 Set</h1>
          </div>
          <div class="content">
            <p>A new payment has been submitted and requires your review:</p>
            
            <div class="detail-row">
              <span class="detail-label">Member Name:</span>
              <span class="detail-value">${member_name}</span>
            </div>
            
            <div class="detail-row">
              <span class="detail-label">Member ID:</span>
              <span class="detail-value">${member_id}</span>
            </div>
            
            <div class="detail-row">
              <span class="detail-label">Payment Type:</span>
              <span class="detail-value">${payment_type}</span>
            </div>
            
            <div class="detail-row">
              <span class="detail-label">Amount:</span>
              <span class="detail-value">${formattedAmount}</span>
            </div>
            
            <div class="detail-row">
              <span class="detail-label">Details:</span>
              <span class="detail-value">${details}</span>
            </div>
            
            <div class="detail-row">
              <span class="detail-label">Date Submitted:</span>
              <span class="detail-value">${date}</span>
            </div>
            
            <div class="detail-row">
              <span class="detail-label">Transaction Ref:</span>
              <span class="detail-value">${payment_id.substring(0, 8)}</span>
            </div>
            
            <a href="${adminDashboardLink}" class="button">Visit Transaction Page</a>
          </div>
          <div class="footer">
            <p>NEMSS 09 Set Payment Notification System</p>
            <p>This is an automated notification. Please do not reply to this email.</p>
          </div>
        </body>
      </html>
    `;

    console.log("Sending email notification to alert@nemss09.com");

    // Send email using Resend
    const emailResponse = await resend.emails.send({
      from: "NEMSS 09 Set <no-reply@nemss09.com>",
      to: ["alert@nemss09.com"],
      subject: `New Payment Submission – NEMSS 09 Set (${payment_type})`,
      html: emailHtml,
    });

    if (emailResponse.error) {
      throw new Error(`Resend API error: ${JSON.stringify(emailResponse.error)}`);
    }

    console.log("Email sent successfully:", emailResponse);

    // Log success to database
    const { error: logError } = await supabase
      .from("message_logs")
      .insert({
        payment_type: payment_type.toLowerCase(),
        payment_id,
        user_name: member_name,
        amount,
        phone_number: "alert@nemss09.com", // Using email field for email address
        status: "sent",
        whatsapp_message_id: emailResponse.data?.id || null,
      });

    if (logError) {
      console.error("Error logging success:", logError);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Email notification sent successfully",
        email_id: emailResponse.data?.id 
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("Error in send-payment-notification-email function:", error);

    // Try to extract payment info for logging
    let paymentInfo: Partial<PaymentNotificationRequest> = {};
    try {
      const body = await req.clone().json();
      paymentInfo = body;
    } catch (e) {
      console.error("Could not parse request body for error logging");
    }

    // Log failure to database
    if (paymentInfo.payment_id) {
      const supabase = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
      );

      const { error: logError } = await supabase
        .from("message_logs")
        .insert({
          payment_type: paymentInfo.payment_type?.toLowerCase() || "unknown",
          payment_id: paymentInfo.payment_id,
          user_name: paymentInfo.member_name || "Unknown",
          amount: paymentInfo.amount || 0,
          phone_number: "alert@nemss09.com",
          status: "failed",
          error_message: error.message,
        });

      if (logError) {
        console.error("Error logging failure:", logError);
      }
    }

    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
};

serve(handler);
