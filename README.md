# Abrace Deus - GitHub Pages

Site estático para vitrine, campanha, cadastro de instituições, doações e checkout com PIX.
Os dados são salvos no Supabase quando `config.js` estiver configurado.

## Configuração

1. Crie um projeto no Supabase.
2. Rode o conteúdo de `supabase.sql` no SQL Editor.
3. Copie `config.example.js` para `config.js`.
4. Preencha `supabaseUrl` e `supabaseAnonKey` com os dados públicos do projeto.
5. Confirme os dados PIX:
   - `pixKey`: CPF `03294572689`
   - `merchantName`: nome do recebedor exibido no app do banco
   - `merchantCity`: cidade do recebedor

O QR Code PIX usa um `txid` único gerado para cada pedido.

## Tabelas Supabase

O arquivo `supabase.sql` cria as tabelas:

- `orders`: pedidos e dados do PIX.
- `donations`: doações de kits.
- `partner_institutions`: cadastros de instituições parceiras.
- `impact_metrics`: métricas públicas da campanha.
- `products`: catálogo futuro de produtos.
- `testimonials`: depoimentos públicos.

As políticas RLS permitem criação pública em `orders`, `donations` e
`partner_institutions`. Leituras administrativas ficam restritas a usuários
autenticados. `products`, `testimonials` e `impact_metrics` têm leitura pública.

## Publicação no GitHub Pages

Suba esta pasta para um repositório GitHub e ative Pages em `Settings > Pages`.

Se usar GitHub Actions, o workflow em `.github/workflows/pages.yml` publica o conteúdo automaticamente a cada push na branch `main`.

## Observações

Este projeto substitui a dependência do Base44 por HTML, CSS, JavaScript e Supabase.
Se o Supabase não estiver configurado, pedidos, doações e instituições ainda são
salvos temporariamente no `localStorage` do navegador para teste local.
