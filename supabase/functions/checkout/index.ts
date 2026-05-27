import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-signature, x-request-id",
  "Access-Control-Allow-Methods": "POST, OPTIONS"
};

type Product = {
  id: string;
  name: string;
  price: number;
};

type NormalizedOrder = {
  order_id: string;
  order_number: string;
  product_id: string;
  product_name: string;
  quantity: number;
  subtotal_cents: number;
  shipping_cents: number;
  total_cents: number;
  total_amount: number;
  buyer_name: string;
  buyer_email: string;
  buyer_phone: string;
  buyer_cpf: string;
  buyer_cpf_cnpj: string;
  recipient_name: string;
  recipient_phone: string;
  shipping_address: string;
  shipping_zip_code: string;
  shipping_city: string;
  shipping_state: string;
  recipient_zipcode: string;
  recipient_address: string;
  recipient_number: string;
  recipient_complement: string;
  recipient_district: string;
  recipient_city: string;
  recipient_state: string;
  reason: string;
  personal_message: string;
  message_signature: string;
  notes: string;
  pix_key: string;
  pix_payload: string;
  payment_method: "mercado_pago";
  payment_status: "pending";
  order_status: "created";
  shipping_status: "aguardando_pagamento";
  disclaimer_accepted: boolean;
};

const products: Product[] = [
  { id: "abraco-essencial", name: "Abraço Essencial", price: 6990 },
  { id: "abraco-luto", name: "Abraço para Luto", price: 8990 },
  { id: "doe-um-abraco", name: "Doe um Abraço", price: 4990 }
];

const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const mercadoPagoAccessToken = Deno.env.get("MERCADO_PAGO_ACCESS_TOKEN") || "";
const siteUrl = Deno.env.get("SITE_URL") || "https://abracedeus.com.br";
const mercadoPagoWebhookSecret = Deno.env.get("MERCADO_PAGO_WEBHOOK_SECRET") || "";

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json"
    }
  });
}

function onlyDigits(value: unknown) {
  return String(value || "").replace(/\D/g, "");
}

function cleanText(value: unknown, maxLength: number) {
  return String(value || "")
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);
}

function requireText(value: unknown, label: string, maxLength: number, minLength = 2) {
  const text = cleanText(value, maxLength);
  if (text.length < minLength) throw new Error(`${label} é obrigatório.`);
  return text;
}

function requireEmail(value: unknown) {
  const email = cleanText(value, 180).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error("E-mail inválido.");
  }
  return email;
}

function requireCpf(value: unknown) {
  const cpf = onlyDigits(value);
  if (cpf.length !== 11 || /^(\d)\1+$/.test(cpf)) {
    throw new Error("CPF inválido.");
  }
  return cpf;
}

function requireZipCode(value: unknown) {
  const zipCode = onlyDigits(value);
  if (zipCode.length !== 8) throw new Error("CEP inválido.");
  return zipCode;
}

function requireState(value: unknown) {
  const state = cleanText(value, 2).toUpperCase();
  if (!/^[A-Z]{2}$/.test(state)) throw new Error("UF inválida.");
  return state;
}

function makeOrderId() {
  return `ABD-${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
}

function shippingForState(state: string) {
  const rates: Record<string, number> = {
    SP: 1890,
    RJ: 2490,
    MG: 2490,
    ES: 2690,
    PR: 2690,
    SC: 2990,
    RS: 3290,
    DF: 3290,
    GO: 3490,
    MS: 3490,
    MT: 3990,
    BA: 3990,
    SE: 4290,
    AL: 4290,
    PE: 4490,
    PB: 4490,
    RN: 4690,
    CE: 4690,
    PI: 4990,
    MA: 4990,
    TO: 4990,
    PA: 5490,
    AP: 5990,
    AM: 5990,
    RR: 6490,
    RO: 6490,
    AC: 6990
  };

  return rates[String(state || "").toUpperCase()] || 4990;
}

function normalizeOrder(input: Record<string, unknown>): NormalizedOrder {
  const product = products.find((item) => item.id === input.product_id);
  if (!product) throw new Error("Produto inválido.");

  const quantity = Math.floor(Number(input.quantity) || 0);
  if (quantity < 1 || quantity > 20) throw new Error("Quantidade inválida.");

  const buyerCpf = requireCpf(input.buyer_cpf || input.buyer_cpf_cnpj);
  const zipCode = requireZipCode(input.shipping_zip_code || input.recipient_zipcode);
  const state = requireState(input.shipping_state || input.recipient_state);
  const subtotalCents = product.price * quantity;
  const shippingCents = shippingForState(state);
  const totalCents = subtotalCents + shippingCents;
  const orderId = makeOrderId();

  return {
    order_id: orderId,
    order_number: orderId,
    product_id: product.id,
    product_name: product.name,
    quantity,
    subtotal_cents: subtotalCents,
    shipping_cents: shippingCents,
    total_cents: totalCents,
    total_amount: totalCents / 100,
    buyer_name: requireText(input.buyer_name, "Nome do comprador", 160),
    buyer_email: requireEmail(input.buyer_email),
    buyer_phone: requireText(input.buyer_phone, "WhatsApp do comprador", 30, 8),
    buyer_cpf: buyerCpf,
    buyer_cpf_cnpj: buyerCpf,
    recipient_name: requireText(input.recipient_name, "Nome do destinatário", 160),
    recipient_phone: cleanText(input.recipient_phone, 30),
    shipping_address: requireText(input.shipping_address || input.recipient_address, "Endereço", 220),
    shipping_zip_code: zipCode,
    shipping_city: requireText(input.shipping_city || input.recipient_city, "Cidade", 120),
    shipping_state: state,
    recipient_zipcode: zipCode,
    recipient_address: requireText(input.recipient_address || input.shipping_address, "Endereço", 220),
    recipient_number: requireText(input.recipient_number, "Número", 20, 1),
    recipient_complement: cleanText(input.recipient_complement, 120),
    recipient_district: requireText(input.recipient_district, "Bairro", 120),
    recipient_city: requireText(input.recipient_city || input.shipping_city, "Cidade", 120),
    recipient_state: state,
    reason: cleanText(input.reason, 80),
    personal_message: cleanText(input.personal_message, 1000),
    message_signature: cleanText(input.signature || input.message_signature, 160),
    notes: cleanText(input.notes || input.personal_message, 1000),
    payment_method: "mercado_pago",
    payment_status: "pending",
    order_status: "created",
    shipping_status: "aguardando_pagamento",
    pix_key: "",
    pix_payload: "",
    disclaimer_accepted: input.disclaimer_accepted === true
  };
}

async function mercadoPago(path: string, body?: unknown, idempotencyKey?: string) {
  if (!mercadoPagoAccessToken) throw new Error("MERCADO_PAGO_ACCESS_TOKEN não configurado.");

  const response = await fetch(`https://api.mercadopago.com${path}`, {
    method: body === undefined ? "GET" : "POST",
    headers: {
      Authorization: `Bearer ${mercadoPagoAccessToken}`,
      "Content-Type": "application/json",
      ...(idempotencyKey ? { "X-Idempotency-Key": idempotencyKey } : {})
    },
    body: body === undefined ? undefined : JSON.stringify(body)
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.message || data.error || "Erro ao chamar Mercado Pago.");
  }

  return data;
}

function paymentStatusFromMercadoPago(status: unknown) {
  if (status === "approved") return "paid";
  if (status === "rejected") return "rejected";
  if (status === "cancelled") return "cancelled";
  if (status === "refunded") return "refunded";
  if (status === "charged_back") return "charged_back";
  return "pending";
}

function orderStatusFromPaymentStatus(status: string) {
  if (status === "paid") return "paid";
  if (["rejected", "cancelled", "refunded", "charged_back"].includes(status)) return "payment_failed";
  return "payment_pending";
}

async function updateOrderFromPayment(paymentResult: Record<string, unknown>, eventType: string) {
  const orderId = String(paymentResult.external_reference || "");
  if (!orderId) throw new Error("Pagamento sem external_reference.");

  const paymentStatus = paymentStatusFromMercadoPago(paymentResult.status);
  const paymentId = String(paymentResult.id || "");

  const { error } = await supabase
    .from("orders")
    .update({
      mercado_pago_payment_id: paymentId,
      mercado_pago_status: String(paymentResult.status || ""),
      mercado_pago_status_detail: String(paymentResult.status_detail || ""),
      payment_status: paymentStatus,
      order_status: orderStatusFromPaymentStatus(paymentStatus),
      shipping_status: paymentStatus === "paid" ? "aguardando_separacao" : "aguardando_pagamento"
    })
    .eq("order_id", orderId);

  if (error) throw error;

  await supabase.from("payment_events").insert({
    order_id: orderId,
    provider_payment_id: paymentId,
    event_type: eventType,
    status: String(paymentResult.status || ""),
    payload: paymentResult
  });

  return {
    orderId,
    paymentId,
    status: paymentResult.status,
    paymentStatus
  };
}

async function createPreference(order: Record<string, unknown>) {
  return await mercadoPago("/checkout/preferences", {
    external_reference: order.order_id,
    statement_descriptor: "ABRACE DEUS",
    items: [
      {
        id: order.product_id,
        title: order.product_name,
        quantity: order.quantity,
        currency_id: "BRL",
        unit_price: Number(order.subtotal_cents) / 100 / Number(order.quantity)
      },
      {
        id: "frete",
        title: "Frete",
        quantity: 1,
        currency_id: "BRL",
        unit_price: Number(order.shipping_cents) / 100
      }
    ],
    payer: {
      name: order.buyer_name,
      email: order.buyer_email,
      phone: { number: onlyDigits(order.buyer_phone) },
      identification: {
        type: "CPF",
        number: onlyDigits(order.buyer_cpf)
      },
      address: {
        zip_code: order.shipping_zip_code,
        street_name: order.shipping_address,
        street_number: order.recipient_number
      }
    },
    back_urls: {
      success: `${siteUrl}/#checkout`,
      pending: `${siteUrl}/#checkout`,
      failure: `${siteUrl}/#checkout`
    },
    auto_return: "approved"
  }, `pref-${order.order_id}`);
}

async function createOrder(payload: Record<string, unknown>) {
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Supabase não configurado na função.");
  }

  const orderInput = typeof payload.order === "object" && payload.order
    ? payload.order as Record<string, unknown>
    : null;
  if (!orderInput) throw new Error("Pedido inválido.");

  const order = normalizeOrder(orderInput);
  const preference = await createPreference(order);

  const { error } = await supabase.from("orders").insert({
    ...order,
    mercado_pago_preference_id: preference.id
  });

  if (error) throw error;

  return json({
    orderId: order.order_id,
    preferenceId: preference.id,
    totalAmount: Number(order.total_cents) / 100
  });
}

async function processPayment(payload: Record<string, unknown>) {
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Supabase não configurado na função.");
  }

  const orderId = String(payload.orderId || "");
  const payment = payload.payment as Record<string, unknown>;
  if (!orderId || !payment) throw new Error("Pagamento inválido.");

  const { data: order, error } = await supabase
    .from("orders")
    .select("*")
    .eq("order_id", orderId)
    .single();

  if (error || !order) throw new Error("Pedido não encontrado.");
  if (!["pending", "in_process", "rejected"].includes(String(order.payment_status))) {
    throw new Error("Este pedido não está disponível para novo pagamento.");
  }

  const allowedPaymentKeys = new Set([
    "token",
    "issuer_id",
    "payment_method_id",
    "transaction_amount",
    "installments",
    "description",
    "payer",
    "binary_mode"
  ]);
  const sanitizedPayment: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(payment)) {
    if (allowedPaymentKeys.has(key)) sanitizedPayment[key] = value;
  }

  const payerFromBrick = typeof sanitizedPayment.payer === "object" && sanitizedPayment.payer
    ? sanitizedPayment.payer as Record<string, unknown>
    : {};

  const paymentPayload = {
    ...sanitizedPayment,
    transaction_amount: Number(order.total_cents) / 100,
    description: `${order.product_name} - ${order.order_id}`,
    external_reference: order.order_id,
    statement_descriptor: "ABRACE DEUS",
    payer: {
      ...payerFromBrick,
      email: order.buyer_email,
      first_name: order.buyer_name,
      identification: {
        type: "CPF",
        number: onlyDigits(order.buyer_cpf)
      }
    },
    additional_info: {
      items: [
        {
          id: order.product_id,
          title: order.product_name,
          quantity: order.quantity,
          unit_price: Number(order.subtotal_cents || 0) / 100 / Number(order.quantity || 1)
        },
        {
          id: "frete",
          title: "Frete",
          quantity: 1,
          unit_price: Number(order.shipping_cents || 0) / 100
        }
      ],
      payer: {
        first_name: order.buyer_name,
        phone: { number: onlyDigits(order.buyer_phone) },
        address: {
          zip_code: order.shipping_zip_code,
          street_name: order.shipping_address,
          street_number: order.recipient_number
        }
      }
    }
  };

  const attemptKey = typeof sanitizedPayment.token === "string" && sanitizedPayment.token
    ? sanitizedPayment.token
    : crypto.randomUUID();
  const paymentResult = await mercadoPago("/v1/payments", paymentPayload, `pay-${order.order_id}-${attemptKey}`);
  const syncedPayment = await updateOrderFromPayment(paymentResult, "payment_created");

  return json({
    id: paymentResult.id,
    status: paymentResult.status,
    statusDetail: paymentResult.status_detail,
    message: syncedPayment.paymentStatus === "paid"
      ? "Pagamento aprovado. Pedido liberado para separação."
      : "Pagamento recebido pelo Mercado Pago. Aguarde a confirmação."
  });
}

async function handleWebhook(request: Request, payload: Record<string, unknown>) {
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Supabase não configurado na função.");
  }

  const url = new URL(request.url);
  if (mercadoPagoWebhookSecret) {
    const requestSecret = request.headers.get("x-webhook-secret") || url.searchParams.get("secret") || "";
    if (requestSecret !== mercadoPagoWebhookSecret) {
      return json({ error: "Webhook não autorizado." }, 401);
    }
  }

  const type = String(
    payload.type ||
    payload.topic ||
    payload.action ||
    url.searchParams.get("type") ||
    url.searchParams.get("topic") ||
    ""
  );
  const data = payload.data as Record<string, unknown> | undefined;
  const paymentId = String(
    data?.id ||
    payload.id ||
    payload["data.id"] ||
    url.searchParams.get("id") ||
    url.searchParams.get("data.id") ||
    ""
  );

  if (!paymentId) {
    return json({ received: true, ignored: "missing_payment_id" });
  }

  if (type && !["payment", "payment.updated", "payment.created"].includes(type)) {
    return json({ received: true, ignored: type });
  }

  const paymentResult = await mercadoPago(`/v1/payments/${encodeURIComponent(paymentId)}`) as Record<string, unknown>;
  const result = await updateOrderFromPayment(paymentResult, `webhook_${type || "payment"}`);

  return json({
    received: true,
    ...result
  });
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const url = new URL(request.url);
    const isWebhook = url.pathname.endsWith("/webhook");
    let payload: Record<string, unknown> = {};

    if (request.method !== "GET") {
      const rawBody = await request.text();
      if (rawBody.trim()) {
        payload = JSON.parse(rawBody);
      }
    }

    if (isWebhook || payload.action === "webhook") {
      return await handleWebhook(request, payload);
    }

    if (payload.action === "create_order") {
      return await createOrder(payload);
    }

    if (payload.action === "process_payment") {
      return await processPayment(payload);
    }

    return json({ error: "Ação inválida." }, 400);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro inesperado.";
    return json({ error: message }, 400);
  }
});
