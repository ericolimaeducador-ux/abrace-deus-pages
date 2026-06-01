# Abrace Deus - mapa do código original

Este arquivo registra o mapeamento dos modelos de dados para as tabelas Supabase
na versão estática publicada em GitHub Pages.

## Modelos extraídos

- `Donation` -> tabela Supabase `donations`
- `ImpactMetric` -> tabela Supabase `impact_metrics`
- `Order` -> tabela Supabase `orders`
- `PartnerInstitution` -> tabela Supabase `partner_institutions`
- `Product` -> tabela Supabase `products`
- `Testimonial` -> tabela Supabase `testimonials`

## Componentes originais mapeados

- `HeroSection` -> seção `#inicio`
- `PainSection` -> seção `#dor`
- `WhatIsSection` -> seção `#sobre`
- `ProductCard` -> cards gerados em `#productGrid`
- `HowToUseSection` -> seção de uso da experiência
- `ImpactCounter` -> cards gerados em `#impactGrid`
- `TestimonialCard` -> cards gerados em `#testimonialGrid`
- `FAQAccordion` -> lista gerada em `#faqList`
- `Footer` e `WhatsAppFloatingButton` -> rodapé e botão flutuante

## Páginas originais mapeadas

- `Home` -> composição principal de `index.html`
- `Kits` e `KitDetail` -> seção `#kits` e seleção no checkout
- `Checkout` -> formulário `#checkoutForm` com PIX copia e cola
- `DoeUmAbraco` -> formulário `#donationForm`
- `Instituicoes` -> formulário `#institutionForm`
- `Depoimentos` -> seção de depoimentos
- `FAQ` -> seção de perguntas frequentes
- `Sobre` -> seção institucional da campanha
- `PoliticaDePrivacidade` e `TermosDeUso` -> pendentes para páginas estáticas futuras
- Rotas administrativas -> pendentes para painel autenticado em Supabase

## Paleta preservada

A versão estática mantém a identidade visual do original:

- Fundo: `hsl(220, 30%, 6%)`
- Cards: `hsl(220, 25%, 10%)`
- Primária/dourado: `hsl(40, 60%, 55%)`
- Acento/bordô: `hsl(330, 45%, 40%)`
- Texto claro: `hsl(40, 20%, 95%)`
- Texto secundário: `hsl(220, 10%, 62%)`

## Arquivos principais

- `index.html`: estrutura visual e formulários.
- `styles.css`: layout, cores e responsividade.
- `app.js`: dados iniciais, renderização, PIX e integração Supabase.
- `supabase.sql`: schema, índices e políticas RLS.
- `config.js`: credenciais públicas do Supabase e dados PIX.
