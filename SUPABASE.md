# Ligar o app Técnico Plus à nuvem (Supabase)

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

## Centro de custo, chamados de parceiro, veículo e horas extras

- **Centro de custo / faturamento** de cada O.S.:
  - **Contrato Claro SP (LPU)** e **Contrato Claro interior (LPU)**: pagos pela LPU. Nas corretivas da Claro só o serviço conta; o material é consumo de estoque.
  - **Manutenção backbone (preço fechado)**: o atendimento já está pago pelo contrato. Só o **lançamento de cabo acima de 500 m** na O.S. é cobrado pela LPU. Os demais itens aparecem como "coberto pelo contrato" e o material como estoque.
  - O supervisor escolhe na atividade; o técnico confere na etapa Produção. Acionamento Claro de São Paulo capital vem como Claro SP; de outras cidades, Claro interior. Chamado de parceiro vem como manutenção backbone.
- **Chamado de parceiro** (ex.: TIM): cole o texto no "Colar acionamento" do painel ou no link de acionamentos. O app reconhece o chamado (EVE/TSK), a falha, o trecho, as pontas A e B, a designação, o equipamento, o horário da falha e o contato. Localiza a ponta A no mapa e manda ao técnico.
- **Meu veículo** (☰ no celular): o técnico lança cada abastecimento (data, hodômetro, litros, preço do litro, total, combustível, posto e se encheu o tanque). O app calcula o consumo em km/l e o custo por km entre tanques cheios. No painel, a Produção do período mostra o card **Combustível** por técnico.
- **Horas extras e vale-refeição:**
  - No painel, em **Equipe e cadastros** > **Horas e salário**, informe o salário base, o vale-refeição por dia e a jornada por dia útil (padrão 8h48, 44 h por semana).
  - O extrato usa os horários de expediente e de refeição registrados no app. Hora = salário ÷ 220. Acima da jornada em dia útil e sábado: 50%. Domingo: 100%. O PDF sai para o técnico assinar.
  - Só o painel vê salário, VR e horas extras: esses dados ficam na tabela `rh_dados`, que o técnico não acessa nem pelo app nem pela API. Feriados, adicional noturno e DSR devem ser conferidos pelo RH.
- **Ganho líquido estimado:** em Produção do período, o card mostra produção menos o custo da equipe, por dupla e por O.S.
  - Custo: salário (com o % de encargos definido em Configurar metas), vale-refeição, horas extras, combustível e locação do veículo (informada em Horas e salário).
  - O custo de cada dupla é rateado entre as O.S. dela pelo tempo de deslocamento e de atendimento. Sem salário cadastrado, usa a meta de custo da dupla (marcado como "estimado").
  - Sai também no extrato total do fechamento (relatório gerencial) e exporta para Excel.
- **Limite de horas por dia:** pela CLT, no máximo 2 horas extras por dia (10 h). No painel, em Escalonamento, defina o limite e a antecedência do aviso.
  - Quem estiver com O.S. aberta perto do limite (ou passando) aparece no topo do painel.
  - Com **Ativar alertas neste computador**, o supervisor ou gestor recebe a notificação mesmo com o painel fechado (pela função `alertas`).
  - No extrato de horas, dias acima de 10 h ficam destacados.
- **Mapa de calor:** além do calor, pinos por local na cor da rede (fibra azul, coaxial laranja; contorno vermelho quando há atividade aberta). Ao tocar no pino, abre a lista das O.S. do local, e cada uma abre com os dados, os itens da LPU, as fotos e o PDF.
- **Para ativar:** rode de novo o `supabase.sql` e publique de novo as funções `telegram` e `alertas` com os novos `telegram-index.ts` e `alertas-index.ts`.

## Atualização da O.S. de hora em hora

- **Técnico:** com uma O.S. em andamento, a cada 60 minutos sem atualização o celular toca o alarme e abre a janela **Atualize a O.S.** com:
  - a situação agora (em deslocamento, em execução, aguardando material, acesso, outra equipe, clima, finalizando);
  - o que foi feito ou o que falta;
  - a previsão de término.
  O alarme só para depois do envio. O botão **Atualizar O.S.**, na barra de baixo, permite atualizar antes. Com o app fechado, chega a notificação.
- **Supervisor e gestor:** O.S. em andamento há mais de 60 minutos sem atualização aparecem em amarelo no topo do painel, com o botão Ver O.S. A fila mostra "atualizada há…". Com os alertas ativados no computador, chega uma notificação a cada hora sem atualização.
- No cadastro da atividade fica o histórico de todas as atualizações do técnico.
- **Para ativar:** publique de novo a função `alertas` com o novo `alertas-index.ts`.

## Fotos com carimbo e envio ao Telegram

- Toda foto tirada pelo app sai com o carimbo padrão Multivale: hora em destaque, data e dia da semana, endereço do local (pelo GPS), latitude e longitude com a precisão, a categoria e a O.S. no alto e, na faixa branca de baixo, o nome e a função do técnico com o logo da Multivale.
- Ao enviar para medição, cada O.S. vai para o tópico dela no Telegram com a mensagem e o botão O.S MEDIDA, **as fotos soltas** (em álbuns de até 10) e **o PDF do relatório de serviço**, que também traz as fotos. O painel gera os PDFs e deixa na pasta `relatorios` do Storage.
- **Para ativar:** publique de novo a função `telegram` com o novo `telegram-index.ts`.

## Menu do painel

No painel, o botão ☰ abre o menu do supervisor:
- **Painel e despacho:** equipe ao vivo, fila de atividades e escala.
- **Equipe e cadastros:** cadastre técnico, técnico de fibra ou fiscal de campo e envie o convite pelo WhatsApp.
  - Quando a pessoa abre o link no celular, o app já entra com nome, matrícula e função. A função fica travada e só o supervisor troca.
  - Na tabela também dá para trocar a função de quem já usava o app e desativar um cadastro.
- **Importar O.S. em lote:** cole as linhas do Excel (com cabeçalho) ou escolha o arquivo .xlsx/.csv.
  - Colunas reconhecidas: OS, Tipo, Ocorrência, Endereço, Bairro, Cidade, Rota, Node, WFC, WF2, Técnico, Cliente, Coordenadas, Prazo e Observação. Há um botão para baixar o modelo.
  - O app confere duplicadas, técnico e local antes de inserir. As linhas com técnico tocam no celular dele; as demais vão para o backlog.
- **Produção do período**, **Mapa de calor** e **Medição · Telegram**.
  - O mapa de calor mostra as executadas do período (7, 30, 90 dias ou 6 meses) e as atuais e pendentes, com a lista dos pontos com mais ocorrências.
- **WFC e WF2:** campos da O.S. no cadastro da atividade, no link de acionamentos, na ficha do técnico (etapa final) e na tela de medição, onde dá para editar antes de enviar. Saem no PDF, na mensagem e na planilha do Telegram e no arquivo das O.S. medidas.

## Link só de acionamentos Claro

Endereço: **https://thiagorgomberg-star.github.io/ronda-backbone/acionamento.html**

Nesse link a pessoa só faz uma coisa: colar o texto do acionamento da Claro.
1. O app reconhece os campos: evento, motivo, node, rede, endereço, solicitante e data. Em seguida localiza o endereço no mapa.
2. Ela escolhe entre **Inserir no backlog** (sem técnico) e **Enviar direto ao técnico**.
   - Ao enviar direto, abre a lista de técnicos com destaque para quem está sem atividade, quem está perto do local e quem está há muito tempo na mesma atividade.
3. A lista do dia mostra os acionamentos Claro. Os do backlog têm o botão **Enviar ao técnico**.
4. Se o mesmo evento já estiver aberto, o app avisa antes de duplicar.

**Quem pode usar:**
- Supervisores e gestores entram nesse link com o mesmo login.
- Para dar acesso só aos acionamentos (sem painel, produção nem medição):
  1. Crie o usuário em **Authentication** > **Users** > **Add user** e copie o **UID**.
  2. No **SQL Editor**, rode:
     ```sql
     insert into public.despachantes (uid, org, nome) values ('UID-AQUI', 'multivale', 'Nome da pessoa');
     ```
- Esse usuário enxerga só técnicos, posição, escala e atividades. Ele cria e encaminha atividades. Não vê rondas, fichas, produção, medição nem configurações, e não apaga nada.

## Equipe de apoio e mapa da equipe

- **Apoio na mesma O.S.:** ao criar ou editar uma atividade, escolha o técnico principal e toque nos nomes em **Equipe de apoio**.
  - Os técnicos de apoio recebem a atividade com o alarme (e o alerta com o app fechado), marcada como **🤝 Apoio**.
  - Cada um registra o próprio deslocamento, chegada, km e horas.
  - A produção da LPU fica só na O.S. do técnico principal. Na ficha do apoio, a etapa Produção fica bloqueada.
  - No painel, a atividade mostra "+ N apoio" e a situação de cada apoio (recebida, em deslocamento, no local, concluída).
- **Mapa ao vivo:** mostra também quem está de expediente sem atividade (verde, "Disponível") ou em refeição (amarelo). Durante o expediente o celular manda a posição a cada minuto.
- **Para ativar:** rode de novo o `supabase.sql` e publique de novo a função `alertas` com o novo `alertas-index.ts`.

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

## Centro de custo por projeto (v28)

Fica no menu do painel: **Centro de custo (projetos)**.

**Criar os projetos.** Na primeira vez, toque em "Criar os projetos Claro, Backbone Multivale e Backbone Master". Em "Editar projeto" ajuste:
- **O.S. que entram no projeto:** Claro, Backbone Multivale, Backbone Master, ou nenhuma (só lançamentos).
- **Como recebemos:**
  - Claro: por acionamento, ou seja, a produção LPU das corretivas.
  - Master: valor fixo mensal.
  - Multivale: venda de fibras. Lance cada contrato como receita **recorrente**, que repete em todo ciclo.
- **Dia do fechamento:** cada projeto tem o seu ciclo. A Claro fecha no dia 15; use 31 para o último dia do mês.
- **Funcionários alocados (%):** a porcentagem do custo de cada um que vai para o projeto. Quem fica em branco é rateado pelo tempo gasto nas O.S. de cada projeto.

**Custo de cada funcionário** = mão de obra (salário + encargos + VR + horas extras, do RH) + deslocamento (combustível dos abastecimentos) + veículo (locação).

**O que a tela mostra:**
- **Total do mês vigente:** receita, custo, resultado, margem e o custo que não caiu em nenhum projeto.
- **Por projeto:** receita, custo, resultado, projeção e a tabela **por equipe** (dupla ou técnico).
- **Lançamentos:** receitas e custos extras (ferramentas, terceiros, pedágio…).
- **Relatório gerencial (PDF):** todo o custo da operação, por projeto e por equipe.

**Linha do tempo:** "Em caixa agora / Caixa concluída" agora se chama "Em atividade agora / Atividade concluída".

**No Supabase:** rode de novo o **supabase.sql**. Ele cria as tabelas `projetos` e `proj_lanc`, que só o gestor e o supervisor acessam.

## Recebimento da O.S., odômetro e distância (v25)

- **Alerta de nova O.S.:** o técnico toca em **O.S. recebida**. Isso avisa o supervisor (aparece "Vista pelo técnico" na fila, no histórico de atualizações e um aviso no painel) e **para o alarme**. Os alertas no celular (push) também param depois do ciente.
- **Odômetro:** só é pedido depois do ciente, quando ele vai iniciar o deslocamento até a O.S. O botão **Iniciar deslocamento** fica travado até o odômetro ser preenchido. Rota preventiva sem O.S. não pede odômetro (inicial nem final).
- **Distância:** no alerta e na tela inicial o técnico vê a distância em linha reta do GPS dele até a O.S. No painel, ao marcar o local da O.S., a lista de técnicos mostra a distância de cada um (pela posição ao vivo) e fica ordenada do mais perto para o mais longe. A distância no momento do ciente fica registrada na O.S.

**No Supabase (uma vez):**
1. SQL Editor → rode de novo o **supabase.sql** inteiro (é seguro repetir). Ele atualiza a função `apoio_status`, que passa a aceitar o ciente da equipe de apoio.
2. Edge Functions → **alertas** → cole o novo **alertas-index.ts** e faça o deploy (os push de O.S. param depois do ciente).

## Almoxarifado (WMS) e serviços do técnico (v27)

**Almoxarifado** fica no menu lateral do painel: Almoxarifado (materiais).
- **Catálogo:** cadastre os materiais um a um, cole uma lista (código; descrição; unidade; mínimo) ou traga prontos os materiais da LPU e a lista de materiais do app.
- **Movimentar:**
  - **Entrada** soma no almoxarifado (NF / fornecedor).
  - **Saída para técnico** tira do almoxarifado e põe no saldo do técnico.
  - **Devolução** faz o caminho contrário.
  - **Ajustes** servem para o inventário (quantidade negativa tira).
  - Um mesmo lançamento aceita várias linhas.
- **Baixa automática:** quando o técnico conclui a O.S., os materiais lançados (lista de materiais, outros materiais e itens de material da LPU) saem do saldo dele. Se ele corrigir a O.S. e concluir de novo, a baixa é atualizada, sem duplicar. Material digitado com nome fora do catálogo aparece em Saldos como "sem cadastro": vincule-o a um item e as próximas baixas já entram certo.
- **Saldos:** o gestor vê o almoxarifado, o total com os técnicos e o saldo de cada técnico. O técnico vê só o próprio saldo em Menu > Meus materiais, onde também pode registrar uma baixa avulsa.
- **Movimentos:** histórico com filtros e exportação para Excel (CSV).

**Serviços do técnico:** no perfil, o técnico marca o que executa:
- Corretiva Claro interior
- Corretiva backbone próprio
- Corretiva backbone de parceiros
- Vistoria de rede
- Preventiva
- Implantação

A tela inicial mostra só esses. As O.S. enviadas pelo supervisor chegam sempre.

**Contas de estoque:** cada material tem saldo separado em três contas:
- **Manutenção Claro**
- **Backbone Multivale**
- **Backbone Master**

Entrada, saída, devolução e ajuste pedem a conta. A baixa automática pega a conta da O.S.: corretiva Claro vai para Claro, backbone de parceiro Master vai para Master, e o resto vai para Multivale. O gestor filtra os saldos por conta. O técnico vê o saldo dele separado por conta.

**Requisição do dia 20:** todo dia 20, às 08:00, o banco gera uma requisição para a Claro e outra para a Master. Cada uma traz o material usado no mês anterior naquela conta, com o saldo atual ao lado. Para conferir e enviar, vá em Almoxarifado > Requisições:
1. Ajuste as quantidades.
2. Baixe o PDF ou o Excel.
3. Marque como enviada.
4. Quando o material chegar, marque como recebida.

Há também o botão "Gerar agora". O agendamento usa o pg_cron (o mesmo do arquivamento).

**Preventiva/vistoria conjunta:** ao ativar a preventiva ou a vistoria, toque em **Conjunta: Multivale + Master**. Em cada caixa e em cada foto da rede, o técnico marca se é da Multivale ou da Master.

**Relatório mensal das preventivas** fica no menu do painel: Preventivas do mês. É um relatório por dono do backbone e reúne:
- rotas percorridas e km
- rede no trecho: estrutura no poste, poda de árvore, troca de poste, travessia, reserva técnica, irregularidades
- caixas de emenda: o que foi verificado, as irregularidades e os serviços
- vistorias e acompanhamentos
- registro fotográfico

No último dia do mês, o painel avisa para gerar o relatório.

**Tela de abertura:** ao abrir, o app mostra o logo da Multivale com uma animação leve.

**Alarme falado:** o alarme de nova O.S. fala "Nova O.S. recebida. Iniciar deslocamento." O APK usa a voz do Android, no volume de alarme.

**No Supabase:** rode de novo o **supabase.sql**. Ele cria as tabelas `materiais` e `mat_mov` com as regras de acesso: o técnico só lê os próprios movimentos e só lança as próprias baixas.

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
