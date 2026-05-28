# Checkout Mercado Pago + Supabase

Esta versão usa GitHub Pages apenas para o frontend. Pagamentos são processados por uma Supabase Edge Function para manter o `MERCADO_PAGO_ACCESS_TOKEN` fora do navegador.

## 1. Banco de dados

No Supabase SQL Editor, rode o arquivo `supabase.sql` atualizado.

Ele adiciona campos de frete, subtotal, IDs do Mercado Pago e a tabela `payment_events`.

## 2. Configurar segredos da Edge Function

No Supabase, configure:

```bash
supabase secrets set MERCADO_PAGO_ACCESS_TOKEN="APP_USR-..."
supabase secrets set SITE_URL="https://abracedeus.com.br"
supabase secrets set MERCADO_PAGO_WEBHOOK_SECRET="um-segredo-longo-gerado-por-voce"
```

O Supabase já fornece `SUPABASE_URL`. Configure também `SUPABASE_SERVICE_ROLE_KEY` se seu projeto não injetar automaticamente essa variável nas funções.

## 3. Publicar a função

```bash
supabase functions deploy checkout --no-verify-jwt
```

## 4. Configurar o frontend

Em `config.js`, preencha:

```js
mercadoPagoPublicKey: "APP_USR-...",
checkoutFunctionUrl: "https://SEU_PROJECT_REF.supabase.co/functions/v1/checkout"
```

Use credenciais de teste primeiro. Só depois troque para produção.

## 5. Frete

O frete atual é uma tabela por UF, recalculada também na Edge Function para evitar adulteração no navegador.

Para frete real com Correios, Melhor Envio ou Frenet, substitua `shippingForState` no `app.js` e em `supabase/functions/checkout/index.ts` por uma chamada autenticada no backend.

## 6. Próxima etapa recomendada

Configurar o webhook no Mercado Pago:

- URL de produção: `https://svbkrleuqtgzinloaquj.supabase.co/functions/v1/checkout/webhook`
- Eventos: pagamentos criados e atualizados.
- Copie a assinatura secreta gerada pelo Mercado Pago e salve no Supabase como `MERCADO_PAGO_WEBHOOK_SECRET`.

A função também envia `notification_url` automaticamente ao Mercado Pago ao criar preferências e pagamentos. O webhook busca o pagamento no Mercado Pago, confere o `external_reference` do pedido e atualiza `orders` e `payment_events`.
