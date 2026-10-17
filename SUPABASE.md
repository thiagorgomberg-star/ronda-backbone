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

## Cluster da O.S. pela cidade do endereço (v40)

Cada O.S. passa a ter o seu cluster, tirado da cidade do endereço (DDD local), sem depender do técnico:
- **DDD12:** Vale do Paraíba, Serra da Mantiqueira e Litoral Norte (39 cidades). Mini clusters:
  - **São José dos Campos:** São José dos Campos, Jacareí, Caçapava, Igaratá, Santa Branca, Jambeiro, Paraibuna e Monteiro Lobato.
  - **Litoral:** Caraguatatuba, Ubatuba, São Sebastião e Ilhabela.
  - **Taubaté:** as demais cidades do DDD12.
- **DDD13 (Santos):** Baixada Santista e Vale do Ribeira.
- **DDD11:** as demais cidades de SP.
- **MG (Sul de Minas):** endereços em Minas Gerais.

**Onde aparece:**
- **Formulário da O.S.:** o campo **Cluster da O.S.** mostra o cluster automático. Dá para escolher outro à mão.
- **Fila de atividades:** cada O.S. leva a etiqueta do cluster, com filtro por cluster, "Meus clusters" e "Sem cluster".
- **Indicadores e SLA:** o agrupamento por cluster e por mini cluster passa a usar o cluster da O.S.
- **Portal do parceiro:** o cluster vem da O.S. Se a cidade não for reconhecida, usa o do técnico.
- **Backup de fotos:** as pastas do .zip são separadas pelo cluster da O.S.

**Ajustes:** em **Calendário de recursos** > **Cidades por cluster**, mande uma cidade para outro cluster ou mini cluster. A lista padrão completa também está lá.

**Para atualizar:** suba os arquivos e atualize a função **acesso** colando o `acesso-index.ts` novo. Não precisa rodar SQL.


## Mapa de fusão da caixa de emenda (v42)

O app desenha sozinho o **mapa de fusão** de cada caixa a partir das etapas **Cabos** e **Fusões**:
- **Entrada** à esquerda, por tubo e fibra, nas cores do padrão do cabo (Nacional ou Americano). **Saída 1** e **Saída 2** à direita.
- Cada linha liga a fibra de entrada à fibra de saída, na cor da fibra. **B1, B2…** é a bandeja.
- **Manobra ou inversão** sai tracejada, com um **M** laranja. Fibras sem fusão aparecem em cinza como **livre**.
- Em caixas grandes (acima de 48 fibras), mostra só os tubos com fusão. Dá para ligar e desligar.

**Vistoria de rota > Mapeamento de caixa de emenda:** novo tipo de registro para o fiscal mapear as caixas do backbone. Etapas: **Caixa** (TAG ou QR da plaqueta, fabricante, modelo, poste e o histórico da caixa) > **Cabos** > **Fusões e mapa** > **Evidências** > **Finalizar**.

**Na etapa Fusões (preventiva, corretiva, implantação e mapeamento):**
- **Copiar da última visita:** puxa cabos e fusões da última visita com a mesma TAG. O técnico só confere e ajusta o que mudou.
- **Anexar mapa existente:** foto do mapa de papel ou da plaqueta, salva nas evidências como "Mapa de fusão (existente)".
- **Baixar imagem:** salva o mapa em PNG.

**Onde aparece depois:**
- **Relatório em PDF:** seção "Mapa de fusão", logo depois da tabela de fusões.
- **Histórico de ativos:** botão **Mapa de fusão** em cada visita da caixa.

A corretiva Claro continua sem cabos, fusões e mapa.

**Para atualizar:** só subir os arquivos. Não precisa rodar SQL nem mexer nas funções.


## Diagrama de fusões interativo e diagrama linear da rota (v43)

**Editar no diagrama (etapa Fusões):**
- **Para ligar uma fusão:** toque numa fibra de **entrada** (esquerda) e depois numa fibra de **saída** (direita).
  - Depois de cada ligação, o app já seleciona a próxima entrada livre. Mapear a caixa vira uma sequência de toques.
  - Também dá para começar pela saída e depois tocar na entrada.
- **Para mudar uma fusão:** toque numa fibra ligada. Aparecem a bandeja, o motivo da manobra e o botão **Desfazer esta fusão**.
  - Ligar numa saída que já estava ocupada troca a ligação, e o app avisa qual entrada perdeu a saída.
- **Cor com cor:** liga tudo 1 com 1 na Saída 1. Depois é só tocar nas fibras que forem diferentes.
- **Botões Desfazer e Limpar:** Desfazer volta o último passo. Limpar apaga todas as fusões da caixa.
- **Bandeja das próximas fusões:** a bandeja escolhida vai para cada fusão nova.
- **No celular:** o diagrama cabe na tela e mostra só os números. A cor de cada fibra aparece no quadradinho.
- **Modo do plano:** a opção "Detalhar fibra a fibra" passou a se chamar **Detalhar no diagrama**. Se a caixa estava em "cor com cor" e o técnico mexe no diagrama, o plano passa para esse modo sozinho. A lista fibra a fibra continua disponível, recolhida, logo abaixo do diagrama.

**Diagrama linear (painel, Histórico de ativos > Diagrama linear de fusões):**
- **Montar a sequência:** escolha a **rota**. O app junta a última visita de cada caixa daquela rota e ordena pela posição no traçado do KMZ (km). Se preferir, cole as **TAGs na ordem**.
- **Ajustar a lista:** as setas mudam a ordem. Desmarque as caixas que não devem entrar.
- **Como o diagrama é desenhado:** é um unifilar. Cada linha é uma posição de fibra do cabo e cada coluna é uma caixa.
  - A fibra é seguida caixa a caixa. Fica colorida enquanto tem continuidade desde a 1ª caixa e vira cinza tracejada quando perde.
  - Manobras e inversões aparecem em laranja. Fibra sem fusão leva um ✕ vermelho, e a derivação para a Saída 2 aparece em azul.
- **Rastreio das fibras:** uma tabela diz, para cada fibra que muda de posição ou é interrompida, onde isso acontece e em que posição ela chega no fim.
- **Exportar:** um arquivo só, em **PDF** (diagrama numa página grande e o rastreio na seguinte), **PNG** ou **SVG** (vetorial, abre no navegador e imprime em qualquer tamanho).

**Para atualizar:** só subir os arquivos. Não precisa rodar SQL nem mexer nas funções.


## Rota que se divide, DGO, book de dados e caixa nova em corretiva (v44)

**Rota que se divide (derivação):** no Diagrama linear, cada caixa tem o campo **Recebe da…**.
- O padrão é receber da caixa anterior pela Saída 1. Onde o cabo se divide, escolha a caixa e a saída de origem (por exemplo, "Recebe da CE-0001 · Saída 2").
- O ramo aparece numa faixa própria, embaixo, ligado à caixa de origem. As fibras são seguidas pelo ramo também.
- No rastreio, cada fibra mostra em qual ponta chega, inclusive nos ramos.

**DGO no início da rota:** a primeira coluna do diagrama é o DGO, com a posição de cada fibra.
- A posição padrão é B(tubo)-(fibra), por exemplo B1-01. Dá para trocar pela posição real.
- Tocando na posição do DGO ou no número da fibra, abre a **ficha da fibra**:
  - posição no DGO, cliente ou ponta atendida, designação, ponta B e status;
  - caminho: quantas caixas e fusões a fibra atravessa e onde chega;
  - comprimento: o informado ou o estimado pelo traçado;
  - perda esperada e sinal esperado na ponta;
  - última medição, perda por km atual e diferença para o esperado.
- **Perda esperada (quando não informada)** = km × atenuação + 0,1 dB por fusão + 0,5 dB por conector (padrão 2).
  - Atenuação: 1310 nm 0,35 · 1550 nm 0,25 · 1625 nm 0,30 dB/km.
  - O número de fusões vem do caminho real da fibra no diagrama.
- **Situação:** Normal até 1 dB acima do esperado, Atenção de 1 a 3 dB e Crítica acima de 3 dB. A posição no DGO fica com contorno laranja ou vermelho.
- Na própria ficha dá para editar os dados da fibra e **registrar uma medição**.

**Book de dados da rota (fiber descritivo):** é um arquivo separado do mapa de fusões, com uma linha por rota na tabela `fiber_book`.
- Fica no cartão "Book de dados da rota", que aparece quando a rota é escolhida.
- **Dados do DGO:** nome, site e bastidor.
- **Importar planilha:** .xlsx ou .csv. O app reconhece colunas como Fibra, Posição DGO, Cliente, Comprimento (km), Comprimento de onda, Potência TX, Data, Perda medida, Sinal medido e Observação.
- **Baixar book (.xlsx):** abas Fibras, Medições e DGO, com os cálculos já feitos.
- **Baixar modelo:** planilha para preencher e importar.
- **Quem vê e quem altera:** supervisor, despacho e NOC leem. Só o supervisor grava. Técnicos não veem os dados de cliente.

**Caixa de emenda nova em corretiva:** no passo Ocorrência da corretiva, o botão **Registrar caixa de emenda nova** serve para o rompimento entre duas caixas já existentes.
- Abre o mapeamento da caixa nova: TAG automática, cabos e diagrama de fusões.
- O técnico informa **entre quais caixas** ela ficou (lado A e lado B).
- Ela entra sozinha no diagrama linear da rota, com contorno laranja e a etiqueta "caixa nova". A posição vem do GPS pelo traçado ou, sem GPS, do lado A/B informado. O mapa da rota fica sempre atualizado.
- Instale uma caixa de cada vez; podem ser várias na mesma corretiva.

**Para atualizar:**
1. Rode o `supabase.sql`, que cria a tabela `fiber_book`.
2. Suba os arquivos.


## Logo nos diagramas, DGO de destino, site e bastidor, TAG pelo trecho (v45)

**Logo da Multivale:** o diagrama linear exportado (PDF, PNG e SVG) e a imagem do mapa de fusão de cada caixa saem com o logo e um cabeçalho com a rota, o trecho (ex.: PDA x CPJ) e a data.

**DGO de origem e DGO de destino:** a primeira coluna do diagrama linear é o DGO da ponta A, e a última é o DGO da ponta B.
- **No DGO de destino:** cada posição mostra a fibra que chega ali no fim da rota principal.
- **Nome padrão:** vem do site, pela sigla da rota (ex.: DGO PDA, DGO CPJ).
- **Campos de cada DGO** (no cartão do book de dados): nome, site, sala, fila, **bastidor**, **posição no bastidor** (ex.: U12 a U15) e fibras por bandeja.
- **Posição de cada fibra:** fica como Bandeja-Porta (B1-02). Ela pode ser trocada na ficha da fibra ou vir da planilha, nas colunas "Posição DGO origem" e "Posição DGO destino".
- **Na ficha da fibra:** aparece o endereço completo nas duas pontas: site · sala · fila · bastidor · DGO (posição no bastidor) · bandeja e porta.

**TAG automática pelo trecho (sem as iniciais do técnico):**
- **Siglas na rota:** cadastre em cada rota a **sigla do site A** e a **sigla do site B** (ex.: PDA e CPJ). Sem sigla, o app usa as 3 primeiras letras do nome da ponta.
- **Formato:** a TAG sai como prefixo-SITEA-SITEB-número, por exemplo CE-PDA-CPJ-0001. A caixa também guarda o trecho "PDA x CPJ".
- **Numeração:** o número seguinte é o maior já usado naquele trecho, olhando a nuvem e o aparelho, para duas equipes não repetirem a mesma TAG. Sem internet, sai pela numeração do aparelho e o app avisa para conferir.
- **Mapeamento de caixa (vistoria):** agora tem o botão **Gerar TAG**, para caixa sem plaqueta.
- O prefixo continua no perfil do técnico (padrão CE-BKB).

**Para atualizar:** só subir os arquivos. Não precisa rodar SQL de novo.


## Rotas (KMZ) no painel (v61)

- Menu **Rotas (KMZ)**: importar o traçado (KMZ ou KML) e ver as rotas cadastradas.
- Aceita o KMZ do Google Earth Pro mesmo com prefixos não declarados (ex.: `xsi:schemaLocation`).
- Os trechos do KMZ são encadeados na ordem do cabo (e virados quando estão ao contrário); traçados repetidos em pastas diferentes contam uma vez; trechos que saem do meio do cabo viram **ramais**.
- **Pontas no meio da rota:** site no fim de um ramal (ex.: DGO de Paraibuna na MV001) ou DGO/site encostado no cabo. Na conjunta, o OTDR pode ser disparado dessas pontas para os dois lados; o ramal entra na conta da distância.
- Pontas A e B: o DGO/site mais perto de cada ponta do cabo; siglas tiradas do nome da rota quando ele traz "AAA X BBB" (ex.: MV002 TTE X CPJ).

## Excluir técnico e O.S. (v61)

- **Técnico:** em Equipe e cadastros, botão **Excluir** em cada linha (pede para digitar EXCLUIR). Apaga o cadastro, a ficha, o RH, a posição ao vivo e o login (função `acesso` v4, ação `remover_tecnico`, já publicada). O que ele já executou fica no histórico; O.S. que estavam com ele voltam para a fila.
- **O.S.:** a fila do despacho ganhou a lista **Concluídas e canceladas**. Toque na O.S. (aberta, em andamento ou concluída) e use **Excluir O.S. do sistema** no fim da tela.
- **Reset do banco:** cópia de segurança de todas as tabelas em `bkp.reset20261012_*`; o script `reset-banco-tecnico-plus.sql` apaga tudo menos o acesso do supervisor e as configurações.

## Conjunta de site: Multivale x provedor parceiro (v61)

Atividade própria (não fica dentro da preventiva), com foco no site do backbone. Pode ser iniciada pelo técnico ou despachada pelo supervisor.

- **Técnico:** na tela inicial escolhe **Conjunta de site** (ao lado de Preventiva, Corretiva, Implantação e Vistoria) e inicia. Aparece para quem tem o serviço "Preventiva" ou o novo "Conjunta de site (parceiro)" liberado na ficha. Chegando, toca em "Cheguei no site".
- **Ticket interno automático:** preventiva `PREV-ROTA-AAMMDD-INICIAIS-001` e conjunta `CONJ-ROTA-AAMMDD-INICIAIS-001` (ROTA = siglas das pontas, ex.: `PDAxTBT`; sem rota escolhida, fica sem esse trecho). A corretiva continua `COR-…`. Quando o supervisor despacha sem ticket: `PREV-ROTA-AAMMDD-001` e `CONJ-SITE-AAMMDD-001`. O ticket aparece na tela, no painel e nos PDFs.
- **Tickets do parceiro:** preventiva e conjunta aceitam até 2 tickets do parceiro (opcionais), no início da atividade, no despacho do supervisor e na própria ficha; saem no PDF e no painel.
- **Despacho:** o supervisor cria a O.S. de **Conjunta de site** (sigla e nome do site, provedor parceiro, tickets do parceiro) ou de **Preventiva** no painel, como as demais. O técnico recebe com alarme ("CONJUNTA DE SITE"), e a ficha do site já vem preenchida. O despacho automático do backlog também envia conjuntas para quem tem Preventiva ou Conjunta liberada (função `alertas` v4, já publicada).
- **Etapas:** Check-in e site (sigla, nome, DGO, tickets do parceiro, local e o técnico do parceiro que acompanhou: nome, provedor, função, telefone, documento) → Fibras (origem x destino com **potência TX e RX obrigatórias**, bobina e eventos do OTDR) → OTDR no mapa → Fotos → Finalizar.
- **Check-in no site (obrigatório):** ao chegar, o técnico toca em "Fazer check-in no site". O app grava hora e GPS e, se a O.S. tem local marcado, a distância até ele; acima de 300 m pede justificativa. Sem check-in as etapas ficam travadas. A O.S. passa para "no local" e o check-in sai no painel e no PDF.
- **Bobina de lançamento:** em cada fibra, "Usou bobina de lançamento" + tamanho (m); o app lembra o último tamanho. É descontada da distância dos eventos.
- **OTDR no mapa:** em cada fibra o técnico lança os eventos com problema (distância no OTDR, perda, tipo). Na etapa "OTDR no mapa" escolhe a rota (KMZ cadastrado ou importa na hora), de onde o OTDR foi disparado (ponta A, ponta B ou site no meio da rota pelo GPS) e a correção (padrão 15%, de 0 a 15%). Cálculo: (distância no OTDR − bobina) × (1 − correção), medido ao longo do traçado a partir do site. Ex.: 10.000 m com bobina de 1.000 m e 15% → alfinete a 7.650 m. O mapa mostra o alfinete e a faixa de busca (até a distância sem correção). Botão "Baixar KMZ da rota com os alfinetes" (também no painel).
- **Possível ponto crítico:** se houver caixa a até 500 m do alfinete (caixas cadastradas nas inspeções ou pontos do KMZ), ela aparece como referência para o técnico verificar e sai no relatório, no painel e no KMZ.
- **Fotos obrigatórias:** porta do site, estado de conservação do site, DGO, power meter TX, power meter RX, OTDR TX e OTDR RX.
- **Trava:** não conclui sem sigla do site, técnico do parceiro, fibras com origem x destino e as potências TX e RX de todas as fibras.
- **Supervisor:** ao concluir, a conjunta aparece no painel em verde, "aguardando as curvas do OTDR". O botão "Inserir curvas" abre a conjunta; anexe a curva TX e a RX (PDF, imagem ou o arquivo .sor do OTDR). O aviso some quando as duas estão anexadas.
- **Relatório:** o PDF traz ticket, site, técnico do parceiro, tabela de fibras com as potências, situação das curvas, as fotos e, se a curva for imagem, uma página para cada curva.
- **Banco:** a conjunta é uma ronda `tipo = 'site'` e cada site fica na tabela `eventos` (`dados.tipo = 'site'`); as curvas vão para o Storage em `org/curvas/...` e a referência para `dados.site.curvas`. Se o técnico sincronizar de novo, as curvas não se perdem.
- **SQL:** `supabase-v61.sql` libera PDF e .sor no bucket de fotos. **Já foi aplicado no projeto**; só rode de novo se recriar o banco.

## Cores do field service da Claro (v59)

- A Aparência agora tem só os **2 temas da Claro**. O padrão é **Vermelho e azul**: cabeçalho #E3260E, fundo #FAFAFA e botões #0572CE. O outro é **Vermelho**: cabeçalho e botões #DA291C, fundo #FEFEFE.
- Os dois funcionam no modo claro e no escuro. Quem tinha escolhido azul ou laranja passa para o padrão, e quem tinha o vermelho antigo passa para o Vermelho.
- O portal do parceiro segue o tema padrão.
- Não precisa rodar nada no Supabase.

## Review completo: voz, backup automático, banco mais rápido e senhas (v58)

**O que fazer (uma vez):** SQL Editor > New query > cole o arquivo **`supabase-v58.sql`** inteiro > **Run**. (Ou cole o `supabase.sql` inteiro; a v58 está no final dele.)

- Ele guarda antes uma cópia das políticas atuais na tabela `bkp.policies_v58`. Essa tabela fica fora do alcance do app.
- Depois troca as políticas de segurança por versões mais rápidas, com as **mesmas regras de acesso**:
  - `auth.uid()` passa a ser calculado uma vez por consulta, não uma vez por linha.
  - Políticas duplicadas para o mesmo comando viram uma só.
- Por fim, tira das funções internas (agendamentos e gatilhos) a permissão de serem chamadas pelo app.

**Já feito direto no projeto (não precisa repetir):**
- **Função `manutencao`** (Verify JWT desligado; ela confere o `x-cron-secret`). Roda todo dia às 03:20 pelo agendamento `manutencao-diaria`:
  - **Telegram:** registra de novo o webhook do bot com o segredo atual. Não é mais preciso clicar em "Conectar Telegram" depois de trocar o segredo.
  - **Backup automático:** uma vez por semana grava todas as tabelas em `backups/AAAA-MM-DD-HH-MM.json.gz`, num armazenamento privado, e guarda as 8 últimas. O painel mostra os backups em **Backup e armazenamento**, com botão **Baixar**. O lembrete do login passa a pedir só uma cópia por mês no Drive.
- **Função `geocode`** publicada. Sem chave cadastrada, ela usa o OpenStreetMap pelo servidor. Com `GEOAPIFY_KEY` (grátis, sem cartão) o número da casa fica mais preciso.
- **Função `acesso`:** na ativação do convite, recusa senha fraca ou que já apareceu em vazamentos (consulta anônima ao Have I Been Pwned). O plano grátis do Supabase não tem essa proteção, então ela foi feita no app. A senha nova do painel, criada pelo link do e-mail, também é conferida.

**No app:**
- **Lançamento por voz na Produção (LPU):** o técnico toca em 🎤 e fala o que fez, por exemplo "fiz quatro fusões, abri uma caixa de emenda e lancei cento e cinquenta metros de cabo".
  - O app separa cada serviço e reconhece números falados por extenso.
  - Escolhe o item da LPU mais provável e mostra alternativas. O técnico confere e toca em **Lançar selecionados**.
  - Funciona sem internet, porque a interpretação é feita no próprio celular. Também dá para digitar no lugar de falar.
- **Aviso de NR/ASO** vencido ou vencendo em até 30 dias, na tela inicial do técnico.
- **Fila do painel:** mostra quais técnicos estão sem mini cluster na ficha, porque esses não recebem O.S. do despacho automático. O link leva direto às fichas.
- Os textos do odômetro foram corrigidos: agora ele é pedido só no início e no fim do expediente.

## Odômetro só no início e no fim do expediente (v57)

- Ao **iniciar o expediente**, o app pede a placa do veículo e o odômetro.
- Ao **encerrar o expediente**, pede o odômetro final, que não pode ser menor que o do início.
- As O.S. não pedem mais odômetro: o técnico só confirma o recebimento e inicia o deslocamento.
- No painel:
  - o roteiro do dia mostra o odômetro do início e do fim e os km rodados no dia;
  - o km da operação (fechamento) usa o odômetro do expediente.
- **Para voltar a pedir em cada O.S.** no futuro, coloque esta linha no `supabase-config.js`:
  ```js
  window.ODOMETRO = 'os';
  ```

## Despacho automático do backlog, pausa de atividade e expediente sem exigência de casa (v56)

A função `alertas` já foi atualizada direto no seu Supabase. Não precisa rodar SQL.

**Despacho automático do backlog**
- A cada minuto, dentro da jornada, a função procura técnico livre e manda para ele a O.S. não emergencial (preventiva ou implantação) **mais antiga** do backlog do **mesmo mini cluster**.
  - Se o técnico ou a O.S. não tiver mini cluster, vale o mesmo cluster.
  - Entre dois livres, vai para o mais perto.
- **Técnico livre** é quem tem:
  - expediente aberto;
  - nenhuma refeição em andamento;
  - nenhuma ronda em andamento;
  - nenhuma O.S. aberta;
  - o serviço liberado na ficha;
  - posição enviada nos últimos 15 minutos.
- Fiscal de campo não recebe.
- **Quem tiver O.S. pausada** recebe de volta primeiro a pausada **mais antiga**, antes de qualquer O.S. nova.
- **Ligar e desligar:** no Painel, em cima da fila, no botão **Despacho automático do backlog**. Vem ligado.
- **Para funcionar:** cada técnico precisa do **mini cluster** na ficha (Calendário de recursos > nome > ficha) e cada O.S. precisa da cidade ou do endereço (o app calcula o mini cluster) ou do cluster escolhido.
- Cada envio automático fica registrado no histórico da O.S. como "Despacho automático".

**Pausa (quando cai uma emergencial)**
- Se o técnico está numa preventiva ou implantação e chega uma emergencial, o aviso da O.S. mostra **Pausar a atual e atender a emergencial**.
- A atividade pausada continua com ele, com as fotos, o checklist, as fusões e a produção já lançados. Ela aparece em **Minhas atividades** como **⏸ Pausada**.
- **Para continuar:** ele toca nela > **Retomar** > informa o odômetro. A O.S. volta com tudo o que já tinha sido feito, para completar e concluir.
- No painel a O.S. aparece como **Pausada (continua depois)**, com o motivo no histórico.

**Expediente:** o local da residência ficou opcional e não existe mais a regra de distância de casa para iniciar o expediente. Se a casa estiver marcada, o relatório de jornada só mostra a distância.

## Serviços do técnico definidos pelo supervisor (v55)

- O banco já foi atualizado direto no seu Supabase (coluna `recursos.servicos`). Também está no `supabase.sql`.
- **Quem define agora é o supervisor:** Calendário de recursos > toque no nome do técnico > ficha > **Serviços que ele executa**. Só os marcados aparecem para o técnico iniciar no app.
- O.S. enviadas pelo supervisor chegam sempre, de qualquer tipo.
- Ficha sem nada definido = todos os serviços liberados.
- No **Meu perfil** do técnico os serviços aparecem só para leitura ("Serviços liberados para você").

## Código em módulos, backup do banco, uso do plano e limite de tentativas de login (v54)

**Já feito direto no seu Supabase (12/10/2026):**
- As funções **acesso** (nova), **alertas** (nova) e **telegram** (atualizada) foram publicadas, as três com "Verify JWT" desligado.
- Teste da `acesso`: a matrícula 32280111 respondeu "convite pendente", então está funcionando.
- O agendamento `alertas-ronda-backbone` foi criado e chama a função a cada minuto.
- A coluna `cadastros.senha_pedida` foi criada.

**Falta você fazer (cerca de 10 minutos):**
1. **Banco:** SQL Editor > cole o `supabase.sql` inteiro > **Run**. O banco estava numa versão antiga e faltam equipamentos, almoxarife restrito, backup, limite de login etc. Só acrescenta; não apaga dados.
2. **Segredos dos alertas:** Edge Functions > **Secrets** > cadastre `VAPID_PUBLIC`, `VAPID_PRIVATE`, `VAPID_SUBJECT` e `CRON_SECRET` com os valores do arquivo `CHAVES-ALERTAS-NAO-ENVIAR-AO-GITHUB.txt`. Hoje o agendamento já chama a função, mas ela responde "não autorizado" porque o `CRON_SECRET` não está cadastrado.
3. **Sem acesso anônimo:** Authentication > Sign In / Providers > desligue **Allow anonymous sign-ins**. O app não usa mais login anônimo.
   - Na mesma área, em **Password security**, ligue **Leaked password protection**. Ela recusa senhas que já vazaram na internet.
4. **Limpeza:** Edge Functions > apague as funções **super-worker** e **bright-handler**. São cópias antigas da telegram, criadas na primeira tentativa.
5. **(Opcional) Endereço preciso no mapa:** crie a chave grátis no Geoapify, cadastre o segredo `GEOAPIFY_KEY` e publique a função `geocode` (arquivo `geocode-index.ts`).

**O que mudou no app**
- **Código em módulos:** o `index.html` virou uma página pequena. O código está em `app.css` e em 12 arquivos `app-01-base.js` … `app-12-projetos-inicio.js`, na **mesma pasta** (sem subpasta).
  - Ao subir no GitHub, envie **todos** os arquivos do zip, inclusive esses novos.
  - Para o técnico nada muda.
- **Backup e armazenamento** (menu do painel):
  - Mostra quanto do plano grátis está em uso (banco e fotos).
  - Baixa o **backup completo** do banco em .zip, com um JSON por tabela, para guardar no Drive.
  - No login, o painel avisa se o último backup tem mais de 7 dias ou se o uso passou de 80%.
- **Limite de tentativas:** ativar convite, diagnóstico de login e "esqueci a senha" aceitam até 30 tentativas a cada 10 minutos por rede. Depois pedem para aguardar.
- **Almoxarife:** não recebe os alertas de supervisor e não envia medição para o Telegram.

## App do técnico mais simples e almoxarife restrito no banco (v53)

**O que fazer:** SQL Editor > cole o `supabase.sql` inteiro > **Run**. Se a v52 ainda não foi aplicada, este Run já inclui a v52, mas a função **acesso** da v52 também precisa ser atualizada.

**Segurança: o almoxarife só enxerga o estoque**
- O almoxarife deixa de contar como supervisor no banco. Ele lê e grava materiais, movimentos, requisições e equipamentos, e lê os projetos e os nomes da equipe (função `equipe_nomes`).
- Ele **não** lê mais RH, salários, cadastros, O.S., fotos nem medição.
- Antes desta versão a restrição era só visual.

**App do técnico (menos coisa na tela)**
- **Início:** o tipo de atividade fica em 2 x 2, sem ficar cortado. Na corretiva, rota, referência e descrição do chamado ficam em "opcional", recolhidos. Só ticket, ocorrência, de quem é a corretiva e veículo ficam à vista.
- **Ocorrência:** ficam à vista ticket, tipo, problema e TAG. Acionamento, fibras afetadas, causa e poste vão para "Mais detalhes (opcional)".
- **Localização:** rota e backbone já informados viram uma linha "Rota e backbone: … (alterar)".
- **Validação do NOC:** saiu do topo de todas as etapas. Agora aparece só em **Finalizar**, logo depois do "Serviço executado", e continua no cartão "Encerrar corretiva" da tela inicial.
- **Fusões:** com "Todas fusionadas cor com cor" o diagrama fica recolhido em "Ver ou ajustar o diagrama de fusões".
- **Finalizar:** WFC/WF2 ficam recolhidos no fim, como opcionais.
- **Botões de segurança:** o botão da escada virou um ícone redondo e o SOS ficou um pouco menor, para não cobrir os campos.

## Equipamentos de alto custo, acessos do painel pelo app, NR na APR e tom vermelho (v52)

**O que fazer nesta versão (2 passos):**
1. **SQL Editor** > cole o `supabase.sql` inteiro de novo e clique em **Run**. Cria as tabelas `equipamentos` e `equip_mov`, a função `equip_aceite` e a coluna `admins.email`.
2. **Edge Functions** > função **acesso** > **Code** > cole o conteúdo novo de `acesso-index.ts` > **Deploy**. Sem isso o botão "Criar acesso do painel" responde "Ação desconhecida".

**Acessos do painel sem abrir o Supabase**
- Em **Equipe e cadastros** > **Acessos do painel**: informe nome, e-mail e papel e clique em **Criar acesso do painel**. O app mostra uma senha provisória para enviar à pessoa.
- O **gestor** cria supervisor e almoxarife. O **supervisor** cria só almoxarife. Ninguém cria gestor por aqui.
- Na mesma lista há **Nova senha** e **Remover acesso**. Remover tira do painel e bloqueia o login.
- O passo a passo manual da v51 (Authentication + insert em admins) continua valendo, mas não é mais necessário.

**Equipamentos de alto custo (Almoxarifado > Equipamentos)**
- Cadastro de máquina de fusão, OTDR, máquina de espinar, clivador, power meter etc., com patrimônio, nº de série, valor, projeto e validade da calibração.
- Ações: **Entregar a um técnico**, **Receber devolução** (estado: bom, avaria, defeito), **Transferir para outro técnico**, **Enviar para manutenção**, **Retorno da manutenção** (com nova calibração) e **Dar baixa** (perda, furto/roubo, sucata, venda).
- Tudo fica no histórico do equipamento.
- O técnico vê **Meus equipamentos** no Perfil e toca em **Confirmo que recebi**, que funciona como termo digital. Ao abrir o app, ele recebe um aviso se tiver recebimento pendente.
- O botão **Termo de responsabilidade (PDF)** sai com a data da confirmação e linhas de assinatura.
- Os indicadores mostram os equipamentos com técnicos, no almoxarifado, em manutenção, com recebimento pendente e com calibração vencida ou vencendo em até 30 dias. Há também exportação para planilha.
- Em **Equipe** > técnico aparecem os equipamentos que estão com ele.

**APR:** por padrão todo colaborador está habilitado com as NRs em dia. A APR mostra "Treinamentos em dia: NR-35 · OK" e grava isso. Só bloqueia se houver um certificado cadastrado e vencido. O controle de certificado e validade vem depois.

**Aparência:** o tom verde virou **Vermelho Claro**. Quem usava verde passa automaticamente para o vermelho.

## Almoxarife, estoque no perfil do técnico e busca de LPU/material (v51)

Não precisa rodar SQL nesta versão.

**Criar o usuário do almoxarife**
1. Supabase > **Authentication** > **Users** > **Add user** > **Create new user**: e-mail e senha do almoxarife (marque *Auto Confirm User*). Copie o **UID** que aparece na lista.
2. **SQL Editor** > rode (troque UID e nome):
   ```sql
   insert into public.admins (uid, org, nome, papel)
   values ('UID-AQUI', 'multivale', 'Nome do Almoxarife', 'almoxarife');
   ```
3. Ele entra pelo **admin.html** com esse e-mail e senha. O painel abre direto no **Almoxarifado** e o menu mostra só Almoxarifado, Aparência e Sair.

> O bloqueio das outras telas para o almoxarife é feito no painel. No banco ele tem a mesma permissão de um supervisor, então use esse papel só para pessoas de confiança da empresa.

**O que mudou**
- **Almoxarifado > Movimentar**: o estoque aparece por projeto (Manutenção Claro, Backbone Multivale, Backbone Master e os nomes dos projetos ligados a cada um). A saída agora se chama **Liberação para técnico**. Há um novo tipo, **Transferir de um técnico para outro**: tira do saldo de um técnico e coloca no do outro (fica registrado como devolução + liberação, com documento TRF-…). Não deixa transferir mais do que o técnico tem.
- **Perfil do técnico**: novo cartão **Meu estoque de material**, com o saldo de corretiva (Manutenção Claro) primeiro.
- **Equipe e cadastros** (supervisor): ao abrir um técnico, aparece o estoque dele e o botão **Liberar / transferir material**, que leva ao Almoxarifado com o técnico já escolhido.
- **Materiais** (técnico): no topo, **Consultar LPU e materiais**: digite código ou nome (sem precisar de acento) e aparecem os itens da LPU e do catálogo, com o seu saldo. Na O.S., o campo "Material" sugere os itens do catálogo e da LPU enquanto o técnico digita.

## O.S. separadas por projeto, aparência, alerta de expediente e fotos na horizontal (v50)

**Cada O.S. pertence a um projeto (Centro de custo):**
- **O.S. cadastrada no painel:** o campo **Projeto** é obrigatório. Ele vem sugerido pelo cliente e pelo contrato, e o supervisor pode trocar. A importação em lote aceita a coluna "Projeto".
- **O.S. aberta pelo técnico:** o app sugere o projeto pelo faturamento (LPU) e pelo cliente. Sugestão: Claro vai para o projeto de vínculo Claro; parceiro Master, para o projeto Master; o resto, para Backbone Multivale.
- **Faturamento no projeto:** em Centro de custo, cada projeto pode ter o **Faturamento (LPU)** (Claro SP, Claro interior ou Backbone). As O.S. com esse faturamento entram nele automaticamente.
- **Medição:**
  - Tem botões para filtrar por projeto e a coluna **Projeto** em cada O.S. ("auto" quando é a sugestão).
  - Só valida O.S. com projeto. Ao validar, o projeto fica **gravado** na O.S. e na medição.
  - Depois de **enviada para medição**, o projeto não muda mais.
- **Envio ao Telegram:** sai **um lote por projeto**. A mensagem e a planilha do lote mostram o projeto.
- **Planilhas:** a planilha da medição e a do BI levam a coluna Projeto, e o nome do arquivo leva o projeto filtrado.
- **No banco:** o projeto fica em `eventos.dados.projeto`, `atividades.dados.projeto`, `medicoes.projeto` e `os_medidas.projeto`, com índices. O arquivo de O.S. medidas guarda o projeto.
- **BI:** abas **Geral**, uma **por projeto** e **Sem projeto**. Cada aba mostra só a produção daquele projeto.
- **Centro de custo:** a produção e o rateio do tempo dos técnicos passam a usar o projeto de cada O.S.

**Aparência:** no perfil do técnico e no menu do painel (item **Aparência**).
- **Modo:** Automático (segue o celular), Claro ou Escuro.
- **Tom:** Azul Multivale, Verde ou Laranja.
- Fica salvo em cada aparelho.

**Expediente não iniciado:**
- **No painel:** uma faixa amarela mostra quem não iniciou o expediente 15 minutos depois do início da jornada. Dá para fechar até o dia seguinte.
- **Notificação:** com os alertas ativados no computador ou no celular, o supervisor recebe a notificação, uma vez por técnico por dia. Quem está de folga ou desativado não entra.
- A tolerância pode ser mudada no segredo `EXP_TOLERANCIA_MIN` da função alertas.

**Fotos na horizontal:** a etapa de fotos lembra de deitar o celular. Se a foto sai em pé, o app avisa logo depois.

**Para atualizar:**
1. Rode o `supabase.sql`, que cria as colunas de projeto e os índices.
2. Publique de novo as funções **telegram** e **alertas** com os novos `telegram-index.ts` e `alertas-index.ts`.
3. Suba os arquivos.
4. Em **Centro de custo**, confira se cada projeto tem o vínculo e, se for o caso, o faturamento.

## Login do técnico, senha esquecida e exclusão de O.S. executadas (v49)

**Login do técnico mais claro:** quando a matrícula e a senha não entram, o app pergunta ao servidor o motivo e mostra a mensagem certa:
- **Convite não usado:** a pessoa ainda não criou a senha. O app abre a aba **Primeiro acesso** e pede o código do convite. Este era o caso mais comum de "parece que não está no banco": o técnico tentava entrar direto com a matrícula antes de criar a senha.
- **Matrícula não encontrada:** o cadastro não tem essa matrícula. Confira o cadastro em Equipe.
- **Cadastro desativado.**
- **Senha incorreta**, com o botão Esqueci a senha.
- **Função "acesso" não configurada no Supabase.**

**Esqueci a senha (técnico):** na tela de login, o técnico digita a matrícula e toca em **Esqueci a senha**.
- O painel do supervisor mostra o aviso "🔑 Fulano esqueceu a senha do app" com o botão **Gerar senha nova**.
- A senha sai com o link do WhatsApp para mandar ao técnico.
- Em **Equipe**, o botão aparece como "🔑 Pediu senha nova".

**Esqueci a senha (supervisor e gestor):** na tela de entrada do painel, digite o e-mail e toque em **Esqueci a senha**.
- Chega um e-mail com o link. Ao abrir, o painel pede a senha nova.
- Para o link voltar para o painel, em **Authentication > URL Configuration**:
  - em **Site URL**, coloque `https://thiagorgomberg-star.github.io/ronda-backbone/admin.html`;
  - em **Redirect URLs**, adicione `https://thiagorgomberg-star.github.io/ronda-backbone/**`.

**Excluir O.S., mesmo já executadas (corretivas e preventivas):** a exclusão sempre pede para digitar EXCLUIR, e apaga a ficha, as fotos, o relatório e a medição.
- **No cadastro da O.S.:** depois de confirmar, o app pergunta se apaga também o que já foi executado.
- **No Histórico de ativos:** botão **Excluir** em cada registro.
- **Na Medição:** link **excluir** em cada O.S.

**Para atualizar:**
1. Rode o `supabase.sql`, que cria a coluna `senha_pedida`.
2. Publique de novo a função **acesso** com o novo `acesso-index.ts`.
3. Suba os arquivos.

## Plano de fusão interativo com fotos, cabos de 12 a 288 FO, KMZ da rota (v46)

**Plano de fusão interativo (só no app, online; o PDF continua igual):** abre a tela do plano com as **fotos de campo** de um lado e o **plano** do outro.
- **Onde abre:**
  - **Histórico de ativos:** botão "Mapa de fusão" de cada visita.
  - **Diagrama linear:** tocando no nome de uma caixa.
  - **Rota:** em "Caixas da rota" ou no marcador da caixa no mapa.
  - **No celular:** no histórico da caixa, ao digitar a TAG.
- **Fotos:** aparecem por visita, com bandeja, acomodação e caixa aberta primeiro. Toque para ampliar.
- **Supervisor:** ajusta o plano conforme as fotos.
  - Ligações: toque na entrada e depois na saída.
  - Ferramentas: cor com cor, desfazer, limpar e bandeja.
  - Tamanho dos cabos: entrada, Saída 1 e Saída 2.
- **Salvar revisão do plano:** cria uma nova versão, que aparece como "Revisão do plano" no histórico. Ela passa a valer no mapa da rota e no diagrama linear, e a visita original continua guardada.
- **Técnico:** só vê o plano. Para ajustar em campo, usa a etapa Fusões (com "Copiar da última visita").
- **Tocando no DGO** (diagrama linear), a ficha da fibra mostra as **fotos do DGO** daquele lado. São as tiradas em campo no tipo "DGO / bastidor" e as enviadas pelo supervisor no book de dados (botão "Enviar fotos do DGO").

**Cabos de tamanhos diferentes no mesmo trecho:** no diagrama de fusões de cada caixa há três campos: **cabo de entrada**, **Saída 1** e **Saída 2**.
- Cada um vai de 12 a 288 FO: 12, 24, 36, 48, 72, 96, 144, 192, 216 e 288.
- **Trocar por um cabo menor não desfaz nenhuma fusão.** As fibras que não existem no cabo novo ficam marcadas como **"para aqui" (⊣ laranja)**: elas param naquela caixa e não seguem.
  - No diagrama linear e no rastreio também aparecem como "para nesta caixa".
  - Na tabela de fusões do PDF aparecem como "PARA NESTA CAIXA".
  - As fusões ficam guardadas e voltam a valer se o cabo aumentar de novo.
- Toda caixa nova começa com **12 FO**.
- **Cabos grandes:** acima de 2 tubos aparecem os **botões de tubos** (T1…T24), para mostrar só os tubos em que se está trabalhando. O ● marca os tubos com fusão.

**Menu lateral do supervisor:** novo item **Mapa de fusão**.
- Abre o plano interativo de uma caixa pela TAG.
- Na mesma tela ficam o diagrama linear da rota e o book de dados.

**Mapeamento de caixa:** novos tipos de foto: "Acomodação das fibras", "Mapa de fusão (existente)" e "DGO / bastidor". A preventiva também ganhou "Acomodação das fibras".

**KMZ da rota:**
- **Rotas matriz:** o supervisor cadastra a rota e importa o KMZ raiz. O técnico abre a rota no app, vê o traçado e todas as **caixas já mapeadas pela equipe**, e dá andamento.
- **Baixar KMZ da rota (suporte de campo):** leva o traçado oficial, o caminho das rondas e as caixas. Abre no Google Earth ou no Google Maps.
- **Fim da ronda:** se a ronda tem rota, o app oferece **enviar o percurso do cabo e as caixas do dia** ao supervisor.
- **Atualizações enviadas:** aparecem na rota. O supervisor escolhe:
  - **Juntar ao KMZ raiz:** soma o traçado novo e atualiza as caixas pela TAG.
  - **Trocar o arquivo oficial.**
- **Atualizar o KMZ raiz com as caixas mapeadas:** coloca no arquivo raiz o ponto de cada caixa (TAG), na posição mais nova.

**Para atualizar:** só subir os arquivos. Não precisa rodar SQL.

## Acesso só com login, banco fechado, portal do parceiro, sobreposição de rotas e fotos (v39)

**Faça nesta ordem (uma vez):**

1. **Banco:** rode o **supabase.sql inteiro** no SQL Editor.
2. **Função `acesso`:**
   - Em **Edge Functions**, crie a função com o nome **acesso**, cole o arquivo `acesso-index.ts` e faça o deploy.
   - **Importante:** na função, **desligue "Verify JWT"** (Enforce JWT verification). O primeiro acesso do técnico chega sem login; a própria função confere quem está chamando.
   - Não precisa de chave nova: ela usa a chave de serviço que o Supabase já entrega para a função.
3. **Técnicos:** em **Equipe e cadastros**, cadastre cada técnico (de preferência com a matrícula) e envie o convite pelo WhatsApp.
   - **Primeiro acesso:** o técnico abre o link, vai em **Primeiro acesso** e cria a senha.
   - **Depois:** entra com **matrícula + senha**.
   - **Quem já usava o app:** recebe o convite também; o histórico dele é mantido.
4. **Desligar o acesso anônimo:** em **Authentication > Sign In / Providers**, desligue:
   - **Allow anonymous sign-ins** (login anônimo);
   - **Allow new users to sign up** (as contas passam a nascer só pela função).

**O que mudou na segurança:**
- **Banco fechado:** sem login não se lê nada. Quem tem login, mas não tem cadastro ativo (ou é parceiro), também não lê as O.S., as rotas, as metas, os materiais nem as fotos.
- **Fotos por equipe:** só a equipe (org) vê e envia fotos, e só o supervisor apaga.
- **Esqueceu a senha:** em Equipe e cadastros, botão **Nova senha** na linha do técnico. Gera uma senha provisória e já monta a mensagem de WhatsApp.
- **Sair:** o técnico tem o botão **Sair desta conta** no perfil.
- **Corretiva:** o banco recusa a conclusão sem a liberação aprovada do NOC ou do supervisor, mesmo com um app antigo.

**Portal do parceiro (`parceiro.html`):**
- **Criar acesso:** em **Equipe e cadastros > Portal do parceiro**, crie o acesso com nome, e-mail e cliente (Claro, Master…). A senha provisória aparece na tela; envie por um canal seguro.
- **O que o parceiro vê:** só as O.S. do cliente dele: indicadores, gráfico por cluster e por cidade, mapa, lista e detalhe com fotos (links que valem 1 hora). Também exporta planilha.
- **Busca:** por ticket, node, endereço, cidade e cluster, com período e situação.
- **Técnico:** o nome só aparece se você marcar "Mostrar o primeiro nome do técnico".
- **Gerenciar:** **Nova senha** e **Desativar** ficam na mesma lista. O link também está no menu lateral do painel.

**Rotas (arquivo original intacto):**
- **No celular:** a rota cadastrada pelo supervisor fica só para leitura. Se o cabo mudou, o técnico envia uma **sobreposição** (KMZ/KML + observação), que aparece em laranja por cima do traçado.
- **No painel:** o supervisor vê as sobreposições na rota e escolhe **Usar como arquivo oficial** ou **Descartar**.
- **Trocar o arquivo:** ao trocar, ele pode descartar as sobreposições.
- **Rotas do técnico:** as rotas que o próprio técnico criou continuam editáveis por ele.

**Fotos:**
- **No celular:** a foto já enviada para a nuvem sai do aparelho depois de 30 dias.
- **Backup no fechamento:** em **Medição** > **Fotos do período**, baixe as fotos do período em .zip (até 500 por arquivo), organizadas por cluster e por O.S., com um índice em planilha. Guarde no Google Drive ou no OneDrive.
- **Liberar espaço:** depois de guardar, toque em **Liberar espaço**: informe onde guardou e as fotos saem do Supabase. A O.S. fica marcada como "foto no arquivo", e o histórico do arquivamento aparece na mesma tela.
- **PDFs e fotos de várias O.S.:** na lista da Medição, os botões **Relatórios PDF (.zip)** e **Fotos por O.S. (.zip)** baixam tudo da etapa (ou só as selecionadas) de uma vez. Para uma O.S., use o link **fotos** ao lado do número dela.

## Mapa ao vivo com a última posição e centro de custo a definir (v38)

**Mapa ao vivo:**
- **Sem sinal ou offline:** o técnico continua no mapa, na última posição conhecida. O marcador fica cinza, tracejado, com 📵, e o balão mostra "Sem sinal · última posição há X".
- **App reaberto sem GPS:** o celular manda a última posição guardada, em vez de apagar a do mapa.
- **Disponíveis (sem O.S.):** continuam no mapa enquanto o expediente estiver aberto. Antes sumiam depois de 3 horas.

**Centro de custo a definir** (topo da tela de **Medição**): lista as O.S. sem centro de custo / faturamento, por exemplo a corretiva aberta pelo técnico sem atividade cadastrada. Escolha o centro e toque em **Salvar**. A O.S. passa a usar esse centro no valor da LPU, na medição e nos relatórios. Fica registrado quem definiu e quando.

## Bônus de produção, folha por cluster, rateio com equipe de apoio e LPU (v37)

**No Supabase:** rode de novo o **supabase.sql inteiro**. Ele cria a tabela `bonus`, a função `eh_gestor` e a coluna `centro_custo` nos cadastros.

**Bônus de produção** (em **Produção (BI)**, abaixo de Metas por equipe):
- **Conta:** bônus sugerido = (produção da equipe − impostos da nota fiscal) × % do bônus. Os impostos vêm em 25% por padrão.
- **Percentuais:** o gestor define os dois percentuais.
- **Valor final:** o gestor define o valor final de cada equipe e o rateio entre os integrantes (o rateio precisa fechar com o valor final), aprova e depois marca como pago. Depois de pago, não muda mais.
- **Supervisor:** vê os valores, mas não altera.

**Centro de custo do colaborador:** em **Equipe e cadastros**, abra **Horas e salário** e escolha o cluster da folha. Se ficar em "Automático", vale o cluster da ficha. O técnico vê o centro de custo dele no perfil.

**Folha por centro de custo (cluster)** fica em **Centro de custo**. Para cada cluster, soma:
- salário + periculosidade + outros adicionais;
- encargos e VR;
- horas extras, noturno e DSR;
- bônus aprovado.

**Insalubridade:** saiu do cálculo, porque as equipes recebem só periculosidade.

**Equipe de apoio:** quando uma O.S. tem apoio de outra equipe, a produção daquela O.S. é dividida em partes iguais entre as equipes (2 equipes = 50% cada). Isso vale para o BI, as metas por equipe e o bônus. Se o apoio for da mesma equipe, não divide. No celular, a "Minha produção" mostra só a parte de cada um. Os extratos de medição continuam com o valor cheio da O.S.

**Corretiva da Claro:** não pede mais os dados do cabo (a etapa Cabos sai) nem a rota do cabo.

**LPU:**
- **Quantidade:** cada item tem um campo de quantidade. Digite, por exemplo, 500 e toque em **+ Adicionar** (ou Enter). Se o item já foi lançado, a quantidade soma.
- **Centro de custo / faturamento:** na corretiva e na O.S. vinda de atividade cadastrada, o técnico não escolhe mais. Vale o que foi definido por quem cadastrou a atividade.

## Funções, equipes MEC/FO, adicionais do salário, foto de perfil, Área NOC e exclusão de O.S. (v36)

**No Supabase:** rode de novo o **supabase.sql inteiro**. Ele cria a coluna `cargo` nos cadastros, a foto do supervisor (`admins.foto` e a função `admin_foto`) e os adicionais do RH em `rh_dados`.

**Funções:**
- **Rede:** Auxiliar de rede; Oficial de rede, e de 1 a 5.
- **Fibra:** Técnico de fibra 1 a 5.
- **Campo:** Encarregado; Fiscal de campo.
- **Gestão:** Supervisor 1 a 4; Coordenador; Gerente de projeto; Gerente geral.
- **Escritório:** Auxiliar de escritório.

O fiscal de campo vê só a vistoria, e o técnico de fibra tem o app de fibra; as demais funções usam o app do técnico.

**Equipes:**
- **Códigos:** MEC 1 a MEC 11 (mecânica) e FO 1 a FO 5 (fibra óptica).
- **Onde vincular:** em **Produção (BI)**, abra **Configurar metas e equipes**, toque em **Vincular equipe**, escolha o código e até 3 integrantes, e salve.
- **No cadastro:** a equipe é gravada no cadastro de cada integrante e também se escolhe no cadastro novo.

**Salário (Equipe e cadastros > Horas e salário):** além do salário base, VR, jornada e locação, agora entram os adicionais.
- **Periculosidade:** 30% do salário base.
- **Adicional noturno:** padrão de 20%, das 22h às 5h, com a hora reduzida de 52min30s.
- **Outros adicionais fixos:** gratificação, ajuda de custo etc.
- **DSR:** sobre horas extras e noturno, calculado pelos domingos do período.
- **Base da hora:** hora extra e noturno usam salário + periculosidade ÷ 220.
- **Onde aparece:** tudo isso entra no extrato em PDF, no ganho por O.S. e no centro de custo.
- **Feriados:** confira com o RH.

**Foto de perfil:** o técnico põe a foto em **Meu perfil**. O supervisor toca na própria foto (as iniciais) no topo do menu lateral.

**Área NOC:** o link fica no menu lateral do painel, logo abaixo de **Acionamentos Claro**.

**Excluir O.S.:** abra a O.S. no painel e toque em **Excluir O.S. do sistema**, no fim do formulário. Para confirmar, digite **EXCLUIR**. A O.S. sai do banco de vez; a ronda e as fotos que o técnico já fez continuam no histórico.

## Regiões, clusters dos supervisores e avisos do painel (v35)

**No Supabase:** rode de novo o **supabase.sql inteiro**. Abra o arquivo, dê Ctrl+A e Ctrl+C, cole no SQL Editor e clique em Run. Se o painel mostrar a tarja vermelha "Banco de dados desatualizado", é porque o arquivo não foi rodado por inteiro; a tarja lista o que falta.

**Clusters e mini clusters:**
- **Cluster DDD11:** Implantação.
- **Cluster DDD12:** São José dos Campos, Taubaté e Litoral.
- **Cluster DDD13:** Santos.
- **Cluster MG:** Sul de Minas.

**Região do colaborador:** escolha o cluster e o mini cluster. A opção **Todas as áreas do cluster** serve, por exemplo, para o fiscal de campo; ao marcar a classe **Fiscal de campo**, ela já vem selecionada.

**Supervisores:** no fim do **Calendário de recursos**, marque os clusters de cada supervisor (pode ser mais de um). O calendário abre filtrado em **Meus clusters**. Só o gestor muda os clusters dos outros.

**Avisos do painel:** as tarjas de O.S. sem atualização, SLA, limite de horas e treinamentos têm um **X** para fechar. A tarja volta se a situação piorar: mais 1 hora sem atualização, SLA estourado ou novo dia. O SOS não tem X; ele só sai em **Atendido**.

## SLA, agilidade na rua, histórico de ativos e segurança (v34)

**No Supabase:** rode de novo o **supabase.sql**. Ele cria as tabelas `treinamentos`, `sos` e `escada`, e agenda a verificação do modo escada (a cada 5 minutos, com o pg_cron ativo).

**Indicadores e SLA** ficam no menu do painel.
- **Indicadores:** tempo de resposta (acionamento até a chegada), MTTR (acionamento até a conclusão) e % dentro do prazo, por contrato, cluster, mini cluster, equipe ou técnico. Dá para exportar em CSV.
- **Prazos:** os prazos de cada contrato (Claro, backbone Multivale, backbone Master) se editam em **Prazos do contrato**.
- **Alertas:** O.S. perto de estourar o prazo aparecem em laranja; as estouradas, em vermelho, com notificação.

**Agilidade na rua (celular do técnico).**
- **Ditado:** o botão 🎤 **Falar** fica embaixo dos campos de texto. Ele usa o reconhecimento de voz do celular; no APK, pede a permissão de microfone.
- **Respostas prontas:** atalhos de texto para atualizar a O.S., pedir a liberação e mandar mensagem ao NOC.
- **Chegada automática:** a menos de 150 m do endereço da O.S., o app pergunta "Você chegou ao local?" e já registra a chegada.

**Histórico de ativos** fica no menu do painel.
- **Busca:** por TAG da caixa, node ou endereço/ticket. Mostra tudo o que já foi feito ali e na vizinhança (200 m, últimos 12 meses), com PDF de cada evento.
- **No celular:** ao digitar ou ler a TAG pelo **QR da plaqueta**, o técnico vê o histórico da caixa.
- **Etiquetas QR:** o botão gera um PDF com 24 etiquetas por folha A4, para imprimir e colar nas caixas.

**Segurança do trabalho.**
- **APR na chegada:** ao chegar no ponto (corretiva ou rota), o técnico preenche a Análise Preliminar de Risco. Ele marca os riscos e os EPIs em uso e tira a foto da equipe com o EPI.
  - **EPI obrigatório:** os EPIs exigidos pelos riscos marcados aparecem com *. Sem eles, a APR não fecha.
  - **Treinamento obrigatório:** trabalho em altura exige NR-35 em dia; rede elétrica exige NR-10; espaço confinado exige NR-33. Se estiver vencido ou não cadastrado, o app bloqueia e registra o bloqueio na O.S.
  - **No relatório:** a APR sai no PDF da ronda/corretiva.
- **Treinamentos e ASO:** cadastre em **Calendário de recursos**, tocando no nome do técnico (ficha). Informe a emissão (a validade é calculada sozinha) ou a validade, e anexe o certificado, se quiser.
  - **Avisos:** o painel avisa o que venceu ou vence em até 30 dias.
  - **Para o técnico:** ele vê os próprios treinamentos no perfil.
- **SOS:** com o expediente aberto, o técnico tem o botão vermelho **SOS**. O supervisor e o NOC recebem na hora, com som, notificação e a localização. Quem atender toca em **Atendido**. O botão também mostra os atalhos para ligar 192 e 193.
- **Modo escada (trabalho em altura):** o técnico ativa o botão 🪜 **Escada** antes de subir no poste ou na escada.
  - **Confirmações:** a cada 1 hora o app toca e pergunta "Você está bem?". Ele confirma em **Estou bem**, no alarme ou no próprio botão.
  - **Sem resposta:** 5 minutos depois toca o 2º alarme. Se ele não responder ao 2º alarme, o supervisor e o NOC recebem o alerta "🪜 não respondeu", com a localização.
  - **Se o técnico responder depois:** o alerta é encerrado sozinho.
  - **Celular desligado ou sem sinal:** o servidor dá o mesmo alerta, com a última localização conhecida.
  - **Desativar:** ao descer, o técnico desativa no botão. O modo também desliga ao encerrar o expediente.

**APK (quando for gerar):** o APK novo pede as permissões de microfone (ditado) e câmera (QR). Não precisa gerar agora.

## Validação do endereço (v33 · Geoapify, sem cartão)

Ao ler o ticket do acionamento, o sistema valida o endereço para o ponto sair certo no mapa e no mapa de calor. Isso vale no painel, na tela de acionamentos, no botão "Achar no mapa" e na importação em lote.

**O que aparece no formulário:**
- ✅ **Endereço validado**: o número foi achado exato.
- ⚠️ **Só foi achado um ponto aproximado** (rua, bairro ou cidade): confira, escolha uma das outras opções ou toque no mapa no ponto certo.
- ❌ **Não encontrado**: corrija o texto ou marque no mapa.

A busca dá preferência à região de atendimento (Vale, Litoral e Sul de Minas). Marcar no mapa ou colar um link/coordenada conta como "marcado à mão".

**Serviço usado: Geoapify.** É grátis, **não pede cartão** e tem 3.000 consultas por dia. Exige o crédito "Powered by Geoapify", que o app já mostra ao lado da validação. O Google ficou como opcional (exige conta de faturamento). Sem nenhuma chave configurada, o app usa o OpenStreetMap e avisa que não houve validação.

**Para ligar (uma vez):**
1. **Conta:** acesse https://www.geoapify.com e clique em **Get started / Sign up**. Entre com e-mail ou conta Google; não pede cartão.
2. **Projeto:** no painel (My Projects), crie um projeto, por exemplo "Técnico Plus". A chave de API aparece pronta; copie-a.
3. **Secret no Supabase:** em Edge Functions > Secrets, crie `GEOAPIFY_KEY` com a chave.
4. **Função:** em Edge Functions, crie a função **geocode** (ou atualize, se já criou), cole o arquivo `geocode-index.ts` e faça o deploy.

Se você já tinha criado o secret `GOOGLE_MAPS_KEY`, pode apagá-lo: com o `GEOAPIFY_KEY` configurado, a função usa o Geoapify. A chave fica só no Supabase e nunca vai para o site nem para o GitHub. Só o supervisor, o gestor e os despachantes conseguem usar a validação.

## NOC, calendário de recursos, ticket na O.S. e rota de carro (v31)

**NOC.** Link: `https://thiagorgomberg-star.github.io/ronda-backbone/noc.html`.
- **Como funciona:** o técnico pede a validação e escreve uma mensagem (ex.: "fusões concluídas, sinal normalizado no node X"). O NOC vê o pedido na hora, com som, conversa com o técnico, confere a rede e toca em **Validar e liberar** ou **Recusar**. O supervisor também pode liberar pelo painel.
- **Sem liberação:** a baixa da O.S. e a saída do local ficam travadas.
- **Acesso:** o NOC só vê os pedidos de liberação e as conversas.
- **Para cadastrar alguém no NOC:** crie o usuário em Authentication > Users e rode no SQL Editor:
  `insert into public.noc (uid, org, nome) values ('UID do usuário', 'multivale', 'Nome');`

**Calendário de recursos** fica no menu do painel.
- **Grade da semana:** por mini cluster (São José dos Campos, Taubaté, Litoral, Sul de Minas) e cluster (DDD12, DDD13, MG). Mostra o horário de cada técnico, os plantões e as folgas. Dá para filtrar por cluster, mini cluster e classe (equipe mecânica / equipe fusão).
- **Ficha do técnico:** toque no nome para editar região, classe, telefone, placa e a escala de trabalho (entrada e saída de cada dia). O alarme de "expediente não iniciado" segue essa escala.
- **Plantonistas do fim de semana:** o botão exporta uma planilha Excel de sexta 18h a segunda 8h, com telefone, placa, região, cluster e classe. Na sexta, a tela lembra de exportar.
- **No perfil do técnico:** ele também informa a região que atende e a classe.

**Ticket do acionamento na O.S.** O técnico vê o texto original do acionamento e as imagens anexadas. Para anexar uma imagem no formulário da O.S. ou na tela de acionamentos, toque em "+ Imagem" ou cole um print com Ctrl+V.

**Distância por rota de carro.** A distância do técnico até a O.S. é calculada pelo trajeto de carro, com o tempo estimado. Isso vale no celular, na lista de técnicos do painel e no registro do ciente. Se o serviço de rotas (OSRM / OpenStreetMap) não responder, aparece a linha reta, marcada como tal.

**No Supabase:** rode de novo o **supabase.sql**. Ele cria as tabelas `noc`, `ped_msgs` e `recursos`.

## Liberação da corretiva, agenda das O.S. e cobrança de atualização (v29)

**Corretiva travada até o gestor liberar.** Ao terminar o serviço, o técnico toca em **Pedir liberação ao gestor**. O painel mostra o pedido no topo, com os botões **Liberar** e **Recusar**; a recusa leva um motivo. Até a liberação, o técnico não conclui o atendimento, não encerra a corretiva e não inicia outra atividade. Ao ser liberado, o celular avisa com voz e vibração.

**Agenda e remanejamento das O.S.**
- **Data da O.S.:** cada O.S. tem o campo **Agendada para**. O alarme do técnico só toca no dia agendado, e na lista dele aparece o 📅 do dia.
- **Supervisor:** remaneja na linha do tempo, em "O.S. agendadas para este dia", ou no próprio formulário da O.S. Sempre há **duas confirmações**.
- **Técnico:** pede o remanejamento dentro da O.S., em "Pedir para remanejar para outro dia", com o motivo. O gestor aprova ou recusa no topo do painel. Cada remanejamento fica registrado na O.S.

**O.S. com ciente** não toca nem notifica de novo.

**Atualização da O.S.** O app não pede mais a atualização sozinho a cada hora. Quando uma O.S. passa de 1 hora sem atualização, o supervisor vê o aviso e toca em **Cobrar atualização**, no aviso do topo ou dentro da O.S. Só aí o celular do técnico toca e abre a tela de atualização. O técnico pode atualizar a qualquer momento pelo botão "Atualizar O.S.".

**No Supabase:**
1. Rode de novo o **supabase.sql**. Ele cria a tabela `pedidos`.
2. Atualize a função **alertas** com o novo `alertas-index.ts`. Com ela, o técnico só recebe aviso quando o supervisor cobra.

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
- Corretiva backbone Multivale
- Corretiva backbone Master
- Vistoria de rede
- Preventiva
- Implantação

A tela inicial mostra só esses. Ao iniciar uma corretiva, ele escolhe entre Backbone Multivale, Backbone Master e Claro interior, apenas entre os que estão liberados no perfil. As O.S. enviadas pelo supervisor chegam sempre.

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

**Tela de abertura:** ao abrir, o app mostra o ícone do Técnico Plus (torre com sinal) com uma animação leve. A partir da v61 o ícone, o cabeçalho e o login usam a marca Técnico Plus; o logo da empresa (logo.png e logo-pdf.jpg) continua nos relatórios em PDF, no carimbo das fotos e nos diagramas exportados.

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

- Não existe acesso anônimo. Técnico entra com matrícula e senha, criadas pelo convite. Painel, almoxarife, NOC, despacho e parceiros entram com e-mail e senha.
- Cada técnico vê só o que é dele. Ele não vê dados de RH, nem o fiber book com dados de clientes, nem O.S. de outros técnicos. O almoxarife vê só o estoque.
- Nenhuma chave privada fica no site. O `supabase-config.js` tem só a chave pública (anon). Os segredos (VAPID, CRON_SECRET, Telegram, Geoapify) ficam em Edge Functions > Secrets.
- Ativação, situação do login e "esqueci a senha" têm limite de 30 tentativas a cada 10 minutos por rede.
- Senha fraca ou vazada é recusada na ativação.
- Backup automático semanal no armazenamento privado `backups`, que só o painel lê.
