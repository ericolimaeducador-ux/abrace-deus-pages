# Abrace Deus - GitHub Pages

Site estático para vitrine e checkout com PIX. Os pedidos são salvos no Supabase na tabela `orders`.

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

## Publicação no GitHub Pages

Suba esta pasta para um repositório GitHub e ative Pages em `Settings > Pages`.

Se usar GitHub Actions, o workflow em `.github/workflows/pages.yml` publica o conteúdo automaticamente a cada push na branch `main`.

## Observações

Este projeto substitui a dependência do Base44 por HTML, CSS, JavaScript e Supabase. Se o Supabase não estiver configurado, o pedido ainda gera o PIX e é salvo temporariamente no `localStorage` do navegador.
