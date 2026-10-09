# Ligar o app Ronda Backbone ao Firebase

O app já está programado para usar o Firebase. Enquanto o arquivo `firebase-config.js` estiver com `FIREBASE_CONFIG = null`, ele funciona só no celular. Depois de configurar, tudo sincroniza sozinho.

## O que vai para a nuvem

| Dado no app | Onde fica no Firebase |
|---|---|
| Perfil do técnico (nome, matrícula, equipe, veículo, limite de velocidade) | Firestore `orgs/multivale/tecnicos/{uid}` |
| Rotas cadastradas + traçado KMZ importado | Firestore `orgs/multivale/rotas/{id}` (traçado grande vai para o Storage `orgs/multivale/rotas/{id}.json`) |
| Rondas preventivas e corretivas (percurso GPS, odômetro, veículo, eventos) | Firestore `orgs/multivale/rondas/{id}` |
| Inspeções de caixa e atendimentos de corretiva (ficha completa, fusões, materiais, referência km A/B) | Firestore `orgs/multivale/eventos/{id}` |
| Fotos das inspeções/corretivas | Storage `orgs/multivale/fotos/{evento}/{foto}.jpg` |
| Fotos da rede e do odômetro | Storage `orgs/multivale/rede/{ronda}/{foto}.jpg` + Firestore `orgs/multivale/fotosRede/{id}` |
| Posição em tempo real do técnico (atualiza a cada 30 s durante a atividade) | Firestore `orgs/multivale/aovivo/{uid}` |
| Supervisores com acesso ao painel | Firestore `orgs/multivale/admins/{uid}` |

Comportamento:

- **Funciona offline.** Tudo é salvo primeiro no celular e entra numa fila. Quando há internet, a fila sobe sozinha (a cada minuto e quando a conexão volta).
- **Rotas são da equipe.** Rota cadastrada ou KMZ importado por um técnico aparece no celular de todos.
- **Histórico de eventos próximos da equipe toda.** A busca de eventos num raio de 1 km passa a incluir os registros dos outros técnicos.

## Passo a passo (uns 15 minutos)

1. Acesse **console.firebase.google.com** > **Adicionar projeto** (ex.: `ronda-backbone`). O Google Analytics é opcional.
2. **Authentication** > **Começar** > **Método de login** > ative **Anônimo**. Mais tarde dá para trocar por **Telefone (SMS)**, como planejado para o WMS.
3. **Firestore Database** > **Criar banco de dados** > modo produção > região `southamerica-east1 (São Paulo)`.
4. **Storage** > **Começar** > mesma região. O Storage pode exigir o plano Blaze (pago por uso, com cota gratuita).
5. **Regras:**
   - Firestore > aba **Regras** > cole o conteúdo de `firestore.rules` > **Publicar**.
   - Storage > aba **Regras** > cole o conteúdo de `storage.rules` > **Publicar**.
6. **Configurações do projeto** (engrenagem) > **Seus apps** > ícone **</>** (Web) > registre o app > copie o objeto `firebaseConfig`.
7. Abra `firebase-config.js`, troque `window.FIREBASE_CONFIG = null;` pelo objeto copiado e suba o arquivo no GitHub.
8. **Authentication** > **Configurações** > **Domínios autorizados** > adicione `thiagorgomberg-star.github.io`.
9. Feche e abra o app no celular. Em **Perfil**, o card **Nuvem (Firebase)** deve mostrar "Conectado à nuvem · tudo sincronizado".

## Painel do supervisor

Link do painel: **https://thiagorgomberg-star.github.io/ronda-backbone/admin.html**

O painel mostra o que o técnico não vê:
- técnicos em campo agora, num mapa em tempo real;
- desvios de rota ("trajeto não compatível");
- excessos de velocidade e a comparação odômetro x GPS;
- relatórios e KMZ de vários dias.

Para criar o acesso de um supervisor:

1. **Authentication** > **Método de login** > ative também **E-mail/senha**.
2. **Authentication** > **Usuários** > **Adicionar usuário** > informe o e-mail e a senha do supervisor. Copie o **UID do usuário** que aparece na lista.
3. **Firestore Database** > **Iniciar coleção** dentro de `orgs` > `multivale` > coleção `admins`:
   - **ID do documento:** cole o UID copiado.
   - **Campo:** `nome` (string), por exemplo "Thiago Gomberg".
   - Se `orgs/multivale` ainda não existir, crie o documento `multivale` na coleção `orgs` com qualquer campo, por exemplo `nome: Multivale`.
4. Publique de novo o `firestore.rules`. Ele tem a regra da coleção `aovivo`.
5. Abra o link do painel e entre com o e-mail e a senha.

Para o painel baixar as fotos nos PDFs, libere o CORS do Storage uma única vez:

1. No console do Google Cloud, abra o **Cloud Shell**.
2. Crie o arquivo `cors.json` com o conteúdo:

   ```
   [{"origin":["https://thiagorgomberg-star.github.io"],"method":["GET"],"maxAgeSeconds":3600}]
   ```

3. Rode `gsutil cors set cors.json gs://SEU-BUCKET`. O nome do bucket aparece na aba **Storage**.

## Segurança (importante antes de usar com a equipe toda)

- Com o login **Anônimo**, qualquer pessoa que abrir o link do app consegue entrar. Serve para testar.
- Para produção, troque para **login por telefone (SMS)** e restrinja as regras a uma lista de técnicos autorizados (ex.: coleção `orgs/multivale/autorizados/{telefone}`), assim como no WMS.
- Pelas regras, cada técnico só altera os próprios registros. Todos leem os registros da equipe, para a busca de eventos próximos funcionar.

## Próximos passos possíveis

- Ranking de produção por técnico no painel.
- Login por SMS e cadastro de técnicos pelo supervisor.
- Conectar com o WMS: materiais usados nas corretivas dando baixa no estoque.
