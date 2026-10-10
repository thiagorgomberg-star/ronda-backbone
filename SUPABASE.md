# Ligar o app Ronda Backbone à nuvem (Supabase)

O Supabase tem plano gratuito **sem cartão de crédito**. Ele guarda:
- rondas, inspeções, corretivas, rotas e perfis;
- as fotos;
- a posição em tempo real dos técnicos.

Enquanto o arquivo `supabase-config.js` estiver vazio, o app funciona só no celular.

## Passo a passo (uns 15 minutos, pelo computador)

### 1. Criar a conta e o projeto
1. Acesse **supabase.com** > **Start your project**.
2. Entre com o GitHub (o mesmo do app) ou com e-mail.
3. **New project**:
   - **Name:** `ronda-backbone`.
   - **Database Password:** clique em **Generate a password** e guarde num lugar seguro. Você quase não vai usar.
   - **Region:** **South America (São Paulo)**.
   - **Plan:** Free.
4. Clique em **Create new project** e espere 1 a 2 minutos até terminar.

### 2. Criar o banco (um copia-e-cola só)
1. Menu da esquerda: **SQL Editor** > **New query**.
2. Abra o arquivo `supabase.sql` (vem no zip), copie **tudo** e cole no editor.
3. Clique em **Run** (ou Ctrl+Enter). Deve aparecer **"Success. No rows returned"**.

Esse script cria:
- as tabelas;
- as regras de segurança;
- o tempo real;
- a pasta de fotos.

Se rodar duas vezes, não dá problema.

### 3. Ligar o login dos técnicos
1. Menu da esquerda: **Authentication** > **Sign In / Providers** (em algumas telas aparece como **Providers** ou **Settings**).
2. Ative **Allow anonymous sign-ins** e clique em **Save**.
3. Confira, na mesma tela, que o provedor **Email** está ativado (vem ligado por padrão). Ele é usado pelo supervisor.

### 4. Copiar as chaves para o app
1. Clique na engrenagem **Project Settings** > **API Keys**. Em algumas telas fica em **Data API** ou no botão **Connect**, no topo.
2. Copie:
   - **Project URL**: algo como `https://abcdefgh.supabase.co`;
   - a chave **anon public** (começa com `eyJ...`) **ou** a **publishable key** (começa com `sb_publishable_...`).
3. **Nunca** use a chave `service_role` / `secret`.
4. No GitHub, edite o arquivo `supabase-config.js` e cole as duas, entre as aspas:

   ```
   window.SUPABASE_URL = 'https://abcdefgh.supabase.co';
   window.SUPABASE_KEY = 'eyJhbGciOi...';
   ```

5. Clique em **Commit changes**.

### 5. Criar o seu acesso de supervisor
1. **Authentication** > **Users** > **Add user** > **Create new user**:
   - seu e-mail e uma senha;
   - marque **Auto Confirm User**;
   - clique em **Create user**.
2. Clique no usuário criado e copie o **User UID**, um código como `3f2a...-....`.
3. **SQL Editor** > **New query**, cole a linha abaixo trocando o UID e clique em **Run**:

   ```
   insert into public.admins (uid, org, nome) values ('COLE-O-UID-AQUI', 'multivale', 'Thiago Gomberg');
   ```

Para outro supervisor, repita este passo com o e-mail e o UID dele.

### 6. Testar
- **Celular:**
  1. Abra https://thiagorgomberg-star.github.io/ronda-backbone/, feche e abra de novo.
  2. Em ☰ > **Meu perfil**, o cartão **Nuvem** deve mostrar "Conectado à nuvem".
  3. O pontinho no topo deve ficar verde.
- **Computador:** abra https://thiagorgomberg-star.github.io/ronda-backbone/admin.html e entre com o e-mail e a senha do passo 5.
- **Tempo real:** ative uma rota no celular. Em até 1 minuto o técnico aparece no painel, em **Equipe**, como "Ativo".

## Jornada, despacho e funções

- **Jornada:** no arquivo `supabase-config.js`, a linha `window.JORNADA` define o horário (08:00 às 18:00), os dias e o tempo de refeição (60 min).
  - Dentro do horário, se o técnico não iniciou o expediente, o app alarma alto com "Expediente não iniciado" até ele iniciar.
  - Às 18:00 o app lembra de encerrar o expediente.
- **Residência:** no perfil, o técnico marca o local de casa, pelo GPS ou pelo endereço. O expediente e a rota só começam a mais de 500 m da residência.
- **Refeição:** o técnico inicia a refeição a qualquer momento, mesmo durante um atendimento. Ao fim dos 60 min o app alarma até ele encerrar a refeição.
- **Despacho:** no painel, em **Fila de atividades** > **Nova atividade**, você escolhe:
  - o tipo: emergencial, preventiva ou implantação;
  - a rota e a referência;
  - o endereço ou o link do Google Maps;
  - o técnico.

  O celular do técnico toca alto e sem parar até ele iniciar o deslocamento. O botão **Abrir no GPS** leva ao Google Maps ou ao Waze.
- **LOG de reincidência:** é calculado pelo banco a cada atividade emergencial. Conta as atividades da mesma semana, de segunda a domingo, que tenham:
  - o mesmo local, num raio de até 1 km;
  - a mesma rota;
  - ou o mesmo endereço.

  No LOG 4 o painel avisa, você manda o resumo ao gerente pelo WhatsApp (cadastre o número no card **Escalonamento**) e os relatórios saem com a tag vermelha.
- **Implantação:** o técnico escolhe o serviço e cada um gera um relatório próprio, com fotos:
  - roteamento de fibras;
  - ativação de site;
  - montagem de DGO;
  - fechamento de caixa.

  O roteamento e o fechamento de caixa incluem o mapeamento da caixa e o plano de fusão.
- **Fiscal de campo:** no perfil, escolha a função **Fiscal de campo**. O app passa a mostrar **Iniciar vistoria de rota**, com:
  - deslocamento;
  - retirada de chaves;
  - acompanhamento de atividades com evidências;
  - diário escrito;
  - relatório final.
- **Escala de plantão:** no painel, card **Escala de plantão** > **Lançar plantão ou folga**.
  - O técnico vê a escala dele no app e recebe um aviso 30 min antes do plantão.
  - Em dia de folga, ele não recebe o alarme de expediente.
  - No despacho, aparece quem está de plantão agora.

## Alertas com o app fechado (Web Push)

Com isto, o celular do técnico toca a notificação mesmo com o app fechado e a tela bloqueada:
- atividade nova: repete a cada 2 min até ele iniciar o deslocamento;
- expediente não iniciado: a cada 10 min dentro da jornada, exceto em dia de folga;
- refeição passou do tempo: a cada 5 min;
- fim da jornada e aviso 30 min antes do plantão.

As chaves vêm num arquivo separado, `CHAVES-ALERTAS-NAO-ENVIAR-AO-GITHUB.txt`. **Esse arquivo não vai para o GitHub.**

1. **Criar a função:** no Supabase, **Edge Functions** > **Deploy a new function** > **Via Editor**.
   - Nome: `alertas`.
   - Apague o exemplo e cole todo o conteúdo do arquivo `alertas-index.ts`.
   - Clique em **Deploy function**.
2. **Desligar a verificação de JWT:** abra a função `alertas` > **Details** (ou **Settings**) e desligue **Enforce JWT verification** (Verify JWT). A função tem a própria proteção.
3. **Segredos:** em **Edge Functions** > **Secrets**, cadastre `VAPID_PUBLIC`, `VAPID_PRIVATE`, `VAPID_SUBJECT` e `CRON_SECRET` com os valores do arquivo de chaves.
4. **Agendamento:** no **SQL Editor**, rode o SQL do agendamento que está no arquivo de chaves, trocando `SEU-PROJETO`. Ele chama a função a cada minuto.
   - Se der erro de extensão, ative **pg_cron** e **pg_net** em **Database** > **Extensions** e rode de novo.
5. **No celular de cada técnico:** abra o app > ☰ > **Meu perfil** > **Ativar alertas** > **Permitir**. Ao iniciar o expediente o app também pede a permissão.
   - **Android (Chrome):** funciona direto. Deixe o volume de notificação alto.
   - **iPhone (iOS 16.4 ou mais novo):** primeiro **Compartilhar** > **Adicionar à Tela de Início** e use o app pelo ícone. No Safari comum o iPhone não recebe alertas.
6. **Teste:**
   - Bloqueie o celular do técnico.
   - No painel, crie uma atividade para ele.
   - Em segundos chega a notificação. Ela se repete a cada 2 min até ele iniciar o deslocamento.

**Som:** com o app fechado, o celular usa o som de notificação do sistema, repetido. O alarme forte e contínuo toca quando o app está aberto.

## Produção (LPU), BI e fechamento

- **Tabela de preços:** a LPU Claro SP Capital DDD 11 (vigência 01/06/2026 a 31/05/2027) está no arquivo `lpu.js`, com 285 itens entre serviços e materiais. Para uma LPU nova, mande a planilha que eu gero o arquivo de novo.
- **Lançamento pelo técnico:** em cada ficha (preventiva, corretiva ou implantação) há a etapa **Produção**, onde ele lança os itens da LPU com a quantidade e vê o valor da O.S.
- **Corretivas da Claro:** só o **serviço** entra no valor da O.S. e na produção. O material lançado conta apenas como **consumo de estoque**: aparece com a quantidade, sem R$, na ficha, no PDF, no BI (card "Consumo de material para estoque") e na planilha da medição.
  - Vale para a corretiva aberta pelo acionamento Claro e para a corretiva em rota cujo dono é o parceiro Claro.
- **Ciclo de fechamento:** do **dia 16 ao dia 15** do mês seguinte. Os atalhos são: ciclo atual, ciclo anterior, as duas metades do ciclo e os últimos 7 dias.
- **Metas por dupla (por ciclo):** custo R$ 15 mil, mínimo R$ 25 mil, ideal R$ 30 mil, perfeito R$ 35 mil.
  - O custo já inclui salário da dupla e veículo.
  - Período parcial usa metas proporcionais.
  - Durante o ciclo, o app mostra a projeção: "no ritmo atual, o período fecha em R$ X".
- **Minha produção (técnico):** ☰ > **Minha produção**. Mostra as O.S. do ciclo com o valor, o total da dupla, a meta e a situação na medição (validada, na medição, medida).
- **Painel:** o botão **Produção (BI) · LPU** abre:
  - o fechamento por período e por técnico;
  - as metas por dupla e o cadastro das duplas;
  - o custo da operação: km rodados e custo por dia;
  - o roteiro diário do técnico, com PDF;
  - gráficos, tabelas, o PDF de produção e a exportação para Excel;
  - o botão **Fechar período e gerar extratos** (escolha "Todos os técnicos"). Ele registra o fechamento e baixa um .zip com:
    - o **extrato total** do período: resumo, metas por dupla, extrato por técnico, material de estoque e todas as O.S. com a situação na medição;
    - um **extrato de produção de cada técnico**: O.S., itens da LPU, material de estoque, o que já foi medido e o que falta, e espaço para assinatura.
  - **Prévia dos extratos**, para conferir antes de fechar, e o botão **Extrato** em cada técnico;
  - em **Fechamentos registrados**, o botão **Extratos** baixa de novo os extratos de um período já fechado.
- **Extrato do técnico:** em ☰ > **Minha produção**, o botão **Baixar meu extrato do período** gera o PDF dele.
- **Acionamento Claro:** em **Fila de atividades** > **Colar acionamento Claro**, cole o texto do acionamento.
  - O app preenche a corretiva com o evento como ticket, motivo, node, rede, solicitante e endereço, e localiza o endereço no mapa.
  - Em seguida mostra a lista de técnicos: em verde quem está sem atividade, em amarelo quem está há mais de 2 h na mesma atividade.
  - O técnico escolhido recebe a atividade na fila de execução dele.

## Gestor e medição pelo Telegram

O painel tem a tela **Medição**, com a situação das O.S. no período: pendentes, em rota, finalizadas, validadas, enviadas para medição e medidas, cada uma com quantidade e R$.

O caminho de cada O.S.:
1. **Finalizada:** o técnico concluiu a ficha.
2. **Validada:** o gestor confere e valida, em lote.
3. **Enviada para medição:** o envio em lote abre um tópico por O.S. no grupo do Telegram, com os dados, os itens da LPU, o valor e o botão **✅ O.S MEDIDA**. No fim vai a planilha do lote.
4. **Medida:** quando a equipe de medição toca no botão, o banco grava a O.S. como **medida**. O painel e o técnico veem na hora.

O botão **Planilha (Excel)** baixa as O.S. da etapa (ou só as selecionadas), com:
- os dados da O.S. e o valor;
- a coluna "Itens LPU (código x quantidade)";
- a coluna do material de estoque.

### Criar o acesso de gestor
1. Em **Authentication** > **Users** > **Add user**, crie o e-mail e a senha do gestor e copie o **UID**.
2. No **SQL Editor**, rode, trocando o UID e o nome:
   ```sql
   insert into public.admins (uid, org, nome, papel) values ('UID-DO-GESTOR', 'multivale', 'Nome do Gestor', 'gestor');
   ```
3. O gestor entra pelo mesmo endereço do painel (`admin.html`) e cai direto na tela **Medição**. Ele também acessa o BI e o painel do supervisor.
   - O supervisor chega à mesma tela pelo botão **Medição · Telegram** do painel.

### Ligar o Telegram (uma vez)
1. **Bot:** no Telegram, fale com **@BotFather** > `/newbot`, dê um nome e guarde o **token**.
2. **Grupo:** crie (ou use) o grupo da medição.
   - Em **Editar** > **Tópicos**, ative os tópicos.
   - Adicione o bot como **administrador**, com permissão de **gerenciar tópicos**.
3. **Função:** no Supabase, **Edge Functions** > **Deploy a new function** > **Via Editor**.
   - Nome: `telegram`.
   - Cole todo o conteúdo do arquivo `telegram-index.ts` e clique em **Deploy function**.
   - Em **Details**, desligue **Enforce JWT verification**. A função confere sozinha quem chama.
4. **Segredos:** em **Edge Functions** > **Secrets**, cadastre:
   - `TELEGRAM_BOT_TOKEN`: o token do BotFather.
   - `TELEGRAM_WEBHOOK_SECRET`: uma senha qualquer, só letras e números, com uns 30 caracteres.
   - Opcional `TELEGRAM_MEDIDORES`: os @usuários que podem tocar em **O.S MEDIDA**, separados por vírgula. Sem ele, qualquer pessoa do grupo pode.
   - Opcional `TELEGRAM_FECHAR_TOPICO` = `sim`: fecha o tópico quando a O.S. é medida.
5. **Banco:** rode de novo o `supabase.sql`. Ele cria a tabela `medicoes` e a coluna `papel`, sem apagar nada.
6. **Conectar:** no painel, abra **Medição** > **Conectar Telegram**. Depois, no grupo, envie **/vincular**. O bot responde confirmando, e o tópico onde você enviou o /vincular passa a receber as planilhas dos lotes.

## Arquivo: O.S. medidas e histórico de acionamentos

- **Rotina diária:** às 03:10 a função `arquivar_rotina()` roda no banco. O `supabase.sql` já agenda a rotina se o **pg_cron** estiver ativo. Se não estiver, ative em **Database** > **Extensions** e rode de novo o `supabase.sql` (ou o `agendamento.sql`).
- **O.S. medidas:** depois do "✅ O.S MEDIDA" no Telegram, a O.S. sai da fila de medição e vai para a tabela `os_medidas`.
  - É uma linha por O.S., com técnico, cliente, ciclo, valor, itens, lote e quem mediu. Fica pronta para tabular e para relatórios.
  - No painel e no app do técnico, ela continua aparecendo como **Medida**.
  - Em **Medição** > **Arquivo**, o botão **O.S. medidas arquivadas do ciclo** baixa o ciclo em .zip, com CSV e JSON.
- **Acionamentos:** ficam completos por **6 meses**.
  - Depois disso, os concluídos e cancelados são compactados por mês na tabela `acionamentos_historico`. Os abertos não são mexidos.
  - Em **Medição** > **Arquivo** aparece cada mês compactado com o botão **Exportar (.zip)**, com CSV e JSON.
  - O painel marca quem exportou e quando. Meses ainda não exportados aparecem em vermelho.

## O que vai para a nuvem

| Dado no app | Onde fica no Supabase |
|---|---|
| Perfil do técnico | tabela `tecnicos` |
| Rotas e traçado KMZ | tabela `rotas` |
| Rondas e corretivas (GPS, odômetro, veículo) | tabela `rondas` |
| Inspeções de caixa e atendimentos de corretiva | tabela `eventos` |
| Fotos da rede e do odômetro | tabela `fotos_rede` + Storage, bucket `fotos` |
| Fotos das inspeções | Storage, bucket `fotos` |
| Posição em tempo real | tabela `aovivo` |
| Supervisores e gestores (coluna `papel`) | tabela `admins` |
| Atividades despachadas (filas, LOG, escalonamento) | tabela `atividades` |
| Expediente e refeições | tabela `expedientes` |
| Gerente para escalonamento | tabela `config` |
| Escala de plantão e folgas | tabela `plantoes` |
| Celulares inscritos para alertas | tabela `push_subs` |
| Metas e duplas | tabela `metas` |
| Validação, envio e medição das O.S. (Telegram) | tabela `medicoes` |
| O.S. medidas (arquivo, uma linha por O.S.) | tabela `os_medidas` |
| Acionamentos com mais de 6 meses, compactados por mês | tabela `acionamentos_historico` |
| Grupo do Telegram vinculado | tabela `config` |

**Comportamento:**
- **Funciona offline.** Tudo é salvo primeiro no celular e sobe sozinho quando há internet.
- **Quem vê o quê:**
  - Cada técnico vê só as próprias rondas.
  - Rotas e eventos (inspeções) a equipe toda vê, para a busca de eventos próximos funcionar.
  - O supervisor vê tudo.
  - Na medição, o técnico só vê a situação das O.S. dele; quem valida e envia é o painel.
- **Fotos na nuvem:** sobem reduzidas, com no máximo 1280 px, cerca de 150 KB cada. No celular e no PDF do técnico continuam na qualidade original.

## Limites do plano gratuito

| Recurso | Limite grátis | Na prática |
|---|---|---|
| Banco de dados | 500 MB | Muitos anos de rondas e inspeções |
| Fotos (Storage) | 1 GB | Cerca de 6.000 a 7.000 fotos |
| Projeto parado | Pausa após 7 dias sem nenhum acesso | Com uso diário, nunca pausa. Se pausar, é só clicar em **Restore** no painel do Supabase |

Quando as fotos se aproximarem de 1 GB, há dois caminhos: apagar as fotos antigas em **Storage** > `fotos`, ou passar para o plano **Pro** (US$ 25/mês, 100 GB).

## Segurança

- O login anônimo deixa qualquer pessoa com o link do app usar o app. Pelas regras, mesmo assim ela só grava em nome próprio e não vê as rondas dos outros. Serve bem para começar.
- Para restringir, mais tarde dá para trocar para login por telefone (SMS) ou e-mail, com uma lista de técnicos autorizados.
