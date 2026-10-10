# Técnico Plus - Multivale · APK Android

O APK é um app Android que abre o sistema publicado no GitHub Pages e acrescenta o que o navegador não faz:

- **Alarme em segundo plano:** o alarme de nova O.S., de atualização de hora em hora, do expediente e da refeição toca como despertador. Toca com o app minimizado e com a tela bloqueada, em tela cheia, até o técnico resolver no app.
- **Serviço em serviço:** durante o expediente, numa atividade ou num plantão, fica uma notificação fixa "Técnico Plus · em serviço". Ela mantém o app vivo para receber O.S. e grava o GPS mesmo minimizado.
- **PDF e KMZ:** abrem pelo "compartilhar" do Android (WhatsApp, Drive, salvar).
- **Atualizações:** o app carrega o sistema do GitHub Pages, então o que você sobe no GitHub chega aos celulares sem reinstalar. Só precisa gerar um APK novo quando mudar algo em `android-app/`.

## 1. Subir os arquivos no GitHub (uma vez)

Os arquivos de sempre vão na raiz. Além deles:

1. **Pasta `android-app/`:** em Add file > Upload files, arraste a pasta `android-app` inteira. Ela tem `package.json`, `capacitor.config.json`, `prepara.js` e `www/index.html`.
2. **Workflow:** Add file > Create new file.
   - No nome, digite exatamente `.github/workflows/apk.yml`. As barras criam as pastas.
   - Cole o conteúdo do arquivo `.github/workflows/apk.yml` do zip.
   - Commit.

## 2. Cadastrar a chave de assinatura (uma vez)

Abra o arquivo **CHAVE-APK-NAO-ENVIAR-AO-GITHUB.txt**, que vai separado e nunca no repositório. Cadastre os 3 secrets em Settings > Secrets and variables > Actions > New repository secret:

- `ANDROID_KEY_ALIAS`
- `ANDROID_KEYSTORE_SENHA`
- `ANDROID_KEYSTORE_B64`

Sem os secrets, o GitHub gera um APK de teste. Ele instala, mas não atualiza por cima: cada versão nova exige desinstalar antes.

## 3. Gerar o APK

- O APK só é gerado quando você manda: Actions > **APK Android** > Run workflow. Leva uns 5 minutos.
- O APK sai em **Releases**. Link fixo para mandar aos técnicos:
  `https://github.com/thiagorgomberg-star/ronda-backbone/releases/latest/download/tecnico-plus.apk`

## 4. Instalar no celular

1. Abra o link no celular e baixe o arquivo.
2. Toque no arquivo. O Android pede para permitir "instalar apps desta fonte": permita.
3. Na primeira abertura e ao iniciar o expediente, permita:
   - **Notificações**
   - **Localização**: escolha "Durante o uso do app"; o serviço em serviço cuida do resto.
   - **Ignorar otimização de bateria**: escolha "Permitir".
   - **Alarmes em tela cheia**: no Android 14 ou mais novo, abre a configuração; ative.
4. **Xiaomi, Motorola e Samsung:** se o alarme falhar com o app fechado, vá em Configurações > Apps > Técnico Plus > Bateria e escolha **Sem restrições**. Na Xiaomi, ative também **Início automático**.

## Limites

- **Notificação fixa "em serviço":** é ela que garante o alarme com o app minimizado. Fora do expediente, sem atividade e sem plantão, ela some e o app não fica vigiando.
- **Plantão:** o plantão cadastrado na escala liga o serviço sozinho, para as O.S. da madrugada.
- **App "forçado a parar":** se o técnico arrastar o app para fechar e o Android matar o serviço, o alarme volta quando ele abrir o app. Para alarme com o app totalmente encerrado seria preciso o Firebase (FCM), que podemos ligar depois.
- **iPhone:** este APK é só para Android. No iPhone continua o app pelo navegador ("Adicionar à Tela de Início").
