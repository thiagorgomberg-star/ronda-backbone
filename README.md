# Técnico Plus - Multivale

App web (PWA) para ronda preventiva de backbone: ficha de inspeção completa, fotos com carimbo de GPS, percurso da ronda (deslocamento e rota do cabo), relatórios em PDF e envio pelo WhatsApp.

Acesse pelo celular em https://thiagorgomberg-star.github.io/ronda-backbone/ e use "Adicionar à tela inicial".

Os dados ficam salvos no próprio celular do técnico e, com a nuvem configurada (Supabase, plano gratuito), sincronizam com o painel do supervisor em admin.html. Veja SUPABASE.md.

## Organização do código (desde a v54)

- `index.html`: só a estrutura da página. Carrega `app.css` e os módulos `app-*.js`, nesta ordem.
- Todos os módulos compartilham o mesmo escopo global, então a ordem importa só para o código que roda na carga (o início fica no último arquivo).
  - `app-01-base.js`: utilidades, banco local (IndexedDB), estado, GPS, perfil e relatórios.
  - `app-02-rotas-ronda.js`: rotas cadastradas e ações da ronda.
  - `app-03-telas.js`: navegação e telas do técnico (etapas da O.S.).
  - `app-04-pdf-kmz.js`: PDF, KMZ, zip e compartilhar.
  - `app-05-despacho.js`: despacho de atividades, alarmes e expediente.
  - `app-06-nuvem.js`: comunicação com o Supabase.
  - `app-07-painel.js`: painel do supervisor, equipe e acessos.
  - `app-08-almox.js`: almoxarifado, materiais e equipamentos.
  - `app-09-gestao.js`: relatório mensal, centro de custo, calendário, SLA, histórico de ativos, backup e uso do plano.
  - `app-10-seguranca.js`: APR, EPI, treinamentos, SOS, escada, bônus, fotos e cluster.
  - `app-11-fusao.js`: mapa de fusão e diagrama linear.
  - `app-12-projetos-inicio.js`: projeto de cada O.S. e início do app.
- A cada versão, o número em `sw.js` (`ronda-backbone-vNN`) e o `?v=NN` dos arquivos no `index.html` mudam juntos, para o celular baixar o código novo.
- Funções do Supabase: `supabase/functions/*/index.ts`. Para atualizar uma função pelo editor do Supabase, cole o `index.ts` da pasta dela.
