import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
};

serve(async (req) => {
    const { method } = req;

    // Handle CORS preflight requests
    if (method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    try {
        const url = new URL(req.url);
        let topic = url.searchParams.get("topic") || url.searchParams.get("type");
        let paymentId = url.searchParams.get("id") || url.searchParams.get("data.id");

        // Fallback: If not in URL, try to parse body (Mercado Pago Simulator sometimes sends in body)
        if (!topic || !paymentId) {
            try {
                // Clone the request to avoid consuming the body if we need it later (though we don't here)
                const body = await req.json();
                if (body) {
                    topic = topic || body.topic || body.type;
                    paymentId = paymentId || body.id || body.data?.id;
                }
            } catch (e) {
                // Ignore JSON parse error, maybe body is empty
            }
        }

        // We strictly check for payment notifications
        // If it's just a test ping check from MP (action: test.created), return 200 too
        if (topic !== "payment" || !paymentId) {
            console.log("Ignored event:", topic, "ID:", paymentId);
            return new Response(JSON.stringify({ message: "Ignored non-payment event" }), {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
                status: 200, // Return 200 to satisfy webhook verifiers
            });
        }

        const mpAccessToken = Deno.env.get("MP_ACCESS_TOKEN");
        if (!mpAccessToken) {
            throw new Error("MP_ACCESS_TOKEN not configured");
        }

        // 1. Fetch Payment details from Mercado Pago to verify status
        const mpResponse = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
            headers: {
                "Authorization": `Bearer ${mpAccessToken}`
            }
        });

        if (!mpResponse.ok) {
            throw new Error("Failed to fetch payment info from Mercado Pago");
        }

        const paymentData = await mpResponse.json();

        // 2. Check if approved
        if (paymentData.status === 'approved') {
            const externalRef = JSON.parse(paymentData.external_reference || "{}");
            const userId = externalRef.user_id;
            const planType = externalRef.plan_type;

            if (!userId || !planType) {
                console.error("Missing user_id or plan_type in external_reference");
                return new Response("Missing metadata", { status: 200 }); // Still return 200 so MP doesn't retry forever
            }

            // 3. Initialize Supabase Admin Client
            const supabaseClient = createClient(
                Deno.env.get("SUPABASE_URL") ?? "",
                Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "" // Important: Use Service Role Key to bypass RLS
            );

            // 4. Calculate End Date
            const now = new Date();
            let daysToAdd = 30;
            if (planType === 'quarterly') daysToAdd = 90;
            if (planType === 'semiannual') daysToAdd = 180;

            const endDate = new Date(now.setDate(now.getDate() + daysToAdd));

            // 5. Update User Profile
            const { error } = await supabaseClient
                .from('user_profiles')
                .update({
                    subscription_status: 'active',
                    subscription_plan: planType,
                    subscription_end_date: endDate.toISOString(),
                    subscription_id: paymentId,
                    customer_id: paymentData.payer?.id?.toString()
                })
                .eq('id', userId);

            if (error) {
                console.error("Error updating profile:", error);
                throw error;
            }

            console.log(`User ${userId} upgraded to ${planType} until ${endDate}`);
        }

        return new Response(JSON.stringify({ success: true }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 200,
        });

    } catch (error) {
        console.error("Webhook Error:", error);
        return new Response(JSON.stringify({ error: error.message }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 400,
        });
    }
});
