import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Helper to generate a valid CPF for Sandbox testing
const generateCPF = () => {
    const r = () => Math.floor(Math.random() * 9);
    const n = Array(9).fill(0).map(r);
    const d1 = n.reduce((a, b, i) => a + b * (10 - i), 0) % 11;
    const v1 = d1 < 2 ? 0 : 11 - d1;
    n.push(v1);
    const d2 = n.reduce((a, b, i) => a + b * (11 - i), 0) % 11;
    const v2 = d2 < 2 ? 0 : 11 - d2;
    n.push(v2);
    return n.join('');
};

serve(async (req) => {
    // Handle CORS preflight requests
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corHeaders });
    }

    try {
        const supabaseClient = createClient(
            Deno.env.get("SUPABASE_URL") ?? "",
            Deno.env.get("SUPABASE_ANON_KEY") ?? "",
            {
                global: {
                    headers: { Authorization: req.headers.get("Authorization")! },
                },
            }
        );

        const {
            data: { user },
        } = await supabaseClient.auth.getUser();

        if (!user) {
            console.error("User not found or token invalid");
            return new Response(JSON.stringify({ error: "Usuário não autenticado" }), {
                headers: { ...corHeaders, "Content-Type": "application/json" },
                status: 401,
            });
        }

        const { plan_type, return_url } = await req.json();
        const mpAccessToken = Deno.env.get("MP_ACCESS_TOKEN")?.trim();
        let origin = return_url || "http://localhost:5173"; // Fallback

        // Remove trailing slash if present to avoid double slash in back_urls
        if (origin.endsWith('/')) {
            origin = origin.slice(0, -1);
        }

        // WORKAROUND: Mercado Pago rejects 'localhost' in auto_return.
        // If we are in localhost, we switch to a public URL to allow the payment link to be generated.
        if (origin.includes("localhost") || origin.includes("127.0.0.1")) {
            console.log("Localhost detected, switching to google.com for MP validation");
            origin = "https://google.com";
        }

        if (!mpAccessToken) {
            console.error("MP_ACCESS_TOKEN not set");
            return new Response(JSON.stringify({ error: "MP_ACCESS_TOKEN não configurado no servidor" }), {
                headers: { ...corHeaders, "Content-Type": "application/json" },
                status: 500,
            });
        }

        let title = "";
        let price = 0;

        // Define plans
        switch (plan_type) {
            case "monthly":
                title = "PMMG Premium - Mensal (30 dias)";
                price = 29.90;
                break;
            case "quarterly":
                title = "PMMG Premium - Trimestral (90 dias)";
                price = 24.90 * 3;
                break;
            case "semiannual":
                title = "PMMG Premium - Semestral (180 dias)";
                price = 19.90 * 6;
                break;
            default:
                return new Response(JSON.stringify({ error: "Plano inválido" }), {
                    headers: { ...corHeaders, "Content-Type": "application/json" },
                    status: 400,
                });
        }

        // Use a fixed email for stability, but generate a new CPF for uniqueness risk checks
        // Use real user email for production receipts and identification
        const payerEmail = user.email || `user_${user.id}@pmmg.app`;
        const testCPF = generateCPF(); // In production, ideally we'd ask the user for CPF. For now, we generate/dummy it or let MP handle if not required for strict checking.

        // Mercado Pago Preference Payload
        // Determine max installments based on plan
        let maxInstallments = 1;
        if (plan_type === 'quarterly') maxInstallments = 3;
        if (plan_type === 'semiannual') maxInstallments = 6;

        // Mercado Pago Preference Payload
        const preferenceData = {
            // binary_mode: false, // Default is false (allow pending). Good for Pix.
            items: [
                {
                    title: title,
                    quantity: 1,
                    currency_id: "BRL",
                    unit_price: Number(price.toFixed(2)),
                },
            ],
            payer: {
                name: "Test",
                surname: "User",
                email: payerEmail,
                identification: {
                    type: "CPF",
                    number: testCPF
                }
            },
            payment_methods: {
                excluded_payment_types: [],
                excluded_payment_methods: [],
                installments: maxInstallments,
                default_installments: maxInstallments
            },
            // payment_methods removed to allow ALL methods (Credit Card, Pix, Boleto)
            back_urls: {
                success: `${origin}/?status=success`,
                failure: `${origin}/?status=failure`,
                pending: `${origin}/?status=pending`,
            },
            auto_return: "approved",
            notification_url: `${Deno.env.get("SUPABASE_URL")}/functions/v1/webhook-handler`,
            external_reference: JSON.stringify({
                user_id: user.id,
                plan_type: plan_type
            }),
        };

        console.log("Creating preference for:", user.email, plan_type);

        // Create Preference
        const response = await fetch("https://api.mercadopago.com/checkout/preferences", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${mpAccessToken}`,
            },
            body: JSON.stringify(preferenceData),
        });

        const data = await response.json();

        if (!response.ok) {
            console.error("Mercado Pago Error:", data);
            return new Response(JSON.stringify({
                error: "Erro ao criar preferência no Mercado Pago",
                details: data,
                sent_payload: preferenceData,
                token_debug_last4: mpAccessToken ? mpAccessToken.slice(-4) : 'NULL'
            }), {
                headers: { ...corHeaders, "Content-Type": "application/json" },
                status: 502,
            });
        }

        return new Response(
            JSON.stringify({ checkout_url: data.init_point, sandbox_url: data.sandbox_init_point }),
            {
                headers: { ...corHeaders, "Content-Type": "application/json" },
                status: 200,
            }
        );

    } catch (error) {
        console.error("Function Error:", error);
        return new Response(
            JSON.stringify({ error: error.message || "Erro interno do servidor" }),
            {
                headers: { ...corHeaders, "Content-Type": "application/json" },
                status: 500,
            }
        );
    }
});
