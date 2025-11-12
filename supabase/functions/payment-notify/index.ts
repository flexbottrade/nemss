import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface PaymentNotificationRequest {
  payment_type: "Dues" | "Event" | "Donation";
  payment_id: string;
  user_name: string;
  amount: number;
  date: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const whatsappToken = Deno.env.get("WHATSAPP_TOKEN")!;
  const phoneNumberId = Deno.env.get("PHONE_NUMBER_ID")!;

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  // Fetch recipient phone number from database
  const { data: recipients, error: recipientError } = await supabase
    .from("alert_recipients")
    .select("phone_number")
    .limit(1)
    .single();

  if (recipientError || !recipients) {
    console.error("Error fetching recipient phone number:", recipientError);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: "No recipient phone number configured" 
      }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }

  const recipientPhone = recipients.phone_number;

  try {
    const { payment_type, payment_id, user_name, amount, date }: PaymentNotificationRequest = await req.json();

    console.log("Processing payment notification:", { payment_type, payment_id, user_name, amount, date });

    // Validate all required parameters
    if (!payment_type || !payment_id || !user_name || !amount || !date) {
      console.error("Missing payment details:", { payment_type, payment_id, user_name, amount, date });
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "Missing payment details - all fields (payment_type, payment_id, user_name, amount, date) are required" 
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
    }).format(amount).replace('NGN', '').trim();

    const whatsappPayload = {
      messaging_product: "whatsapp",
      to: recipientPhone,
      type: "template",
      template: {
        name: "payment_alert",
        language: {
          code: "en"
        },
        components: [
          {
            type: "body",
            parameters: [
              {
                type: "text",
                name: "payment_type",
                text: String(payment_type)
              },
              {
                type: "text",
                name: "user_name",
                text: String(user_name)
              },
              {
                type: "text",
                name: "amount",
                text: String(formattedAmount)
              },
              {
                type: "text",
                name: "date",
                text: String(date)
              }
            ]
          }
        ]
      }
    };

    console.log("Sending WhatsApp message with payload:", JSON.stringify(whatsappPayload, null, 2));

    // Send WhatsApp message using Meta Cloud API
    const whatsappResponse = await fetch(
      `https://graph.facebook.com/v21.0/${phoneNumberId}/messages`,
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${whatsappToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(whatsappPayload),
      }
    );

    const whatsappData = await whatsappResponse.json();

    if (!whatsappResponse.ok) {
      throw new Error(`WhatsApp API error: ${JSON.stringify(whatsappData)}`);
    }

    console.log("WhatsApp message sent successfully:", whatsappData);

    // Log success
    const { error: logError } = await supabase
      .from("message_logs")
      .insert({
        payment_type: payment_type.toLowerCase(),
        payment_id,
        user_name,
        amount,
        phone_number: recipientPhone,
        status: "sent",
        whatsapp_message_id: whatsappData.messages?.[0]?.id || null,
      });

    if (logError) {
      console.error("Error logging success:", logError);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "WhatsApp notification sent successfully",
        message_id: whatsappData.messages?.[0]?.id 
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("Error in payment-notify function:", error);

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
      const { error: logError } = await supabase
        .from("message_logs")
        .insert({
          payment_type: paymentInfo.payment_type?.toLowerCase() || "unknown",
          payment_id: paymentInfo.payment_id,
          user_name: paymentInfo.user_name || "Unknown",
          amount: paymentInfo.amount || 0,
          phone_number: recipientPhone,
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
