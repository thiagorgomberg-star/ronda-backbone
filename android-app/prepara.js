// Técnico Plus - Multivale — prepara o projeto Android gerado pelo "npx cap add android".
// Roda no GitHub Actions (ver .github/workflows/apk.yml). Não precisa rodar no seu computador.
//  1. Cria o plugin nativo AlarmeNativo (alarme contínuo, tela cheia, mesmo com o celular bloqueado).
//  2. Registra o plugin na MainActivity.
//  3. Acrescenta as permissões no AndroidManifest.
//  4. Coloca o ícone da Multivale no app.
const fs = require('fs');
const path = require('path');

const PKG = 'br.com.multivale.tecnicoplus';
const APP = path.join(__dirname, 'android', 'app', 'src', 'main');
const JAVA = path.join(APP, 'java', ...PKG.split('.'));
const ok = (m) => console.log('✔ ' + m);
const falha = (m) => { console.error('✘ ' + m); process.exit(1); };
if (!fs.existsSync(APP)) falha('Pasta android/ não encontrada. Rode "npx cap add android" antes.');

// ---------- 1. plugin AlarmeNativo ----------
const plugin = `package ${PKG};

import android.Manifest;
import android.annotation.SuppressLint;
import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.media.AudioAttributes;
import android.media.RingtoneManager;
import android.net.Uri;
import android.os.Build;
import android.os.Handler;
import android.os.Looper;
import android.speech.tts.TextToSpeech;
import java.util.Locale;
import android.os.PowerManager;
import android.provider.Settings;

import androidx.core.app.NotificationCompat;

import com.getcapacitor.JSObject;
import com.getcapacitor.PermissionState;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;

/** Alarme de O.S.: notificação com som de alarme em repetição (FLAG_INSISTENT), tela cheia e fixa até o app mandar parar. */
@CapacitorPlugin(name = "AlarmeNativo", permissions = { @Permission(alias = "notificacoes", strings = { Manifest.permission.POST_NOTIFICATIONS }) })
public class AlarmeNativo extends Plugin {
    static final String CANAL = "alarme_os_v1";
    static final int ID = 7301;

    // fala do alarme ("Nova O S recebida. Iniciar deslocamento."), repetida enquanto o alarme toca
    private TextToSpeech tts;
    private boolean ttsOk = false;
    private String fala = null;
    private final Handler h = new Handler(Looper.getMainLooper());
    private final Runnable repete = new Runnable() {
        @Override
        public void run() {
            if (fala == null) return;
            falarAgora();
            h.postDelayed(this, 9000);
        }
    };

    private void falarAgora() {
        if (tts == null) {
            tts = new TextToSpeech(getContext(), st -> {
                ttsOk = st == TextToSpeech.SUCCESS;
                if (ttsOk) {
                    tts.setLanguage(new Locale("pt", "BR"));
                    tts.setAudioAttributes(new AudioAttributes.Builder().setUsage(AudioAttributes.USAGE_ALARM).setContentType(AudioAttributes.CONTENT_TYPE_SPEECH).build());
                    if (fala != null) tts.speak(fala, TextToSpeech.QUEUE_FLUSH, null, "alarme");
                }
            });
            return;
        }
        if (ttsOk && fala != null) tts.speak(fala, TextToSpeech.QUEUE_FLUSH, null, "alarme");
    }

    @Override
    protected void handleOnDestroy() {
        h.removeCallbacks(repete);
        if (tts != null) { tts.stop(); tts.shutdown(); tts = null; }
    }

    private NotificationManager nm() { return (NotificationManager) getContext().getSystemService(Context.NOTIFICATION_SERVICE); }

    private void criaCanal() {
        if (Build.VERSION.SDK_INT < 26) return;
        NotificationManager nm = nm();
        if (nm.getNotificationChannel(CANAL) != null) return;
        NotificationChannel c = new NotificationChannel(CANAL, "Alarme de O.S.", NotificationManager.IMPORTANCE_HIGH);
        c.setDescription("Nova O.S., atualização de hora em hora e avisos do expediente");
        Uri som = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_ALARM);
        if (som == null) som = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_RINGTONE);
        AudioAttributes aa = new AudioAttributes.Builder().setUsage(AudioAttributes.USAGE_ALARM).setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION).build();
        c.setSound(som, aa);
        c.enableVibration(true);
        c.setVibrationPattern(new long[] { 0, 800, 300, 800, 300, 800 });
        c.setLockscreenVisibility(Notification.VISIBILITY_PUBLIC);
        c.setBypassDnd(true);
        nm.createNotificationChannel(c);
    }

    @SuppressLint("MissingPermission")
    @PluginMethod
    public void tocar(PluginCall call) {
        criaCanal();
        Context ctx = getContext();
        String titulo = call.getString("titulo", "Técnico Plus");
        String texto = call.getString("texto", "Abra o app.");
        Intent abre = ctx.getPackageManager().getLaunchIntentForPackage(ctx.getPackageName());
        if (abre == null) abre = new Intent();
        abre.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        PendingIntent pi = PendingIntent.getActivity(ctx, 0, abre, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        NotificationCompat.Builder b = new NotificationCompat.Builder(ctx, CANAL)
            .setSmallIcon(ctx.getApplicationInfo().icon)
            .setContentTitle(titulo)
            .setContentText(texto)
            .setStyle(new NotificationCompat.BigTextStyle().bigText(texto))
            .setPriority(NotificationCompat.PRIORITY_MAX)
            .setCategory(NotificationCompat.CATEGORY_ALARM)
            .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
            .setOngoing(true)
            .setAutoCancel(false)
            .setOnlyAlertOnce(false)
            .setContentIntent(pi)
            .setFullScreenIntent(pi, true);
        if (Build.VERSION.SDK_INT < 26) {
            b.setSound(RingtoneManager.getDefaultUri(RingtoneManager.TYPE_ALARM)).setVibrate(new long[] { 0, 800, 300, 800, 300, 800 });
        }
        Notification n = b.build();
        n.flags |= Notification.FLAG_INSISTENT | Notification.FLAG_NO_CLEAR;
        h.removeCallbacks(repete);
        fala = call.getString("falar", null);
        if (fala != null && fala.trim().isEmpty()) fala = null;
        if (fala != null) h.post(repete);
        try { nm().notify(ID, n); } catch (Exception e) { call.reject("Sem permissão de notificação: " + e.getMessage()); return; }
        call.resolve();
    }

    @PluginMethod
    public void parar(PluginCall call) {
        fala = null;
        h.removeCallbacks(repete);
        if (tts != null) tts.stop();
        nm().cancel(ID);
        call.resolve();
    }

    @PluginMethod
    public void permissoes(PluginCall call) {
        if (Build.VERSION.SDK_INT >= 33 && getPermissionState("notificacoes") != PermissionState.GRANTED) {
            requestPermissionForAlias("notificacoes", call, "permissoesCb");
        } else {
            permissoesCb(call);
        }
    }

    @PermissionCallback
    private void permissoesCb(PluginCall call) {
        criaCanal();
        JSObject r = new JSObject();
        r.put("notificacoes", Build.VERSION.SDK_INT < 33 || getPermissionState("notificacoes") == PermissionState.GRANTED);
        call.resolve(r);
    }

    /** Pede para o Android não "economizar bateria" no app (senão alguns celulares matam o serviço). */
    @SuppressLint("BatteryLife")
    @PluginMethod
    public void bateria(PluginCall call) {
        Context ctx = getContext();
        JSObject r = new JSObject();
        boolean livre = true;
        if (Build.VERSION.SDK_INT >= 23) {
            PowerManager pm = (PowerManager) ctx.getSystemService(Context.POWER_SERVICE);
            livre = pm != null && pm.isIgnoringBatteryOptimizations(ctx.getPackageName());
            if (!livre) {
                try {
                    Intent i = new Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS, Uri.parse("package:" + ctx.getPackageName()));
                    i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                    ctx.startActivity(i);
                } catch (Exception e) { /* alguns aparelhos não têm essa tela */ }
            }
        }
        r.put("liberado", livre);
        call.resolve(r);
    }

    /** Android 14+: libera o alarme em tela cheia (abre a configuração se ainda não estiver liberado). */
    @PluginMethod
    public void telaCheia(PluginCall call) {
        Context ctx = getContext();
        JSObject r = new JSObject();
        boolean pode = true;
        if (Build.VERSION.SDK_INT >= 34) {
            pode = nm().canUseFullScreenIntent();
            if (!pode) {
                try {
                    Intent i = new Intent(Settings.ACTION_MANAGE_APP_USE_FULL_SCREEN_INTENT, Uri.parse("package:" + ctx.getPackageName()));
                    i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                    ctx.startActivity(i);
                } catch (Exception e) { /* sem a tela de configuração */ }
            }
        }
        r.put("liberado", pode);
        call.resolve(r);
    }
}
`;
fs.mkdirSync(JAVA, { recursive: true });
fs.writeFileSync(path.join(JAVA, 'AlarmeNativo.java'), plugin);
ok('plugin AlarmeNativo criado');

// ---------- 2. MainActivity registra o plugin ----------
const mainJava = path.join(JAVA, 'MainActivity.java');
let main = fs.existsSync(mainJava) ? fs.readFileSync(mainJava, 'utf8') : '';
if (!main.includes('AlarmeNativo')) {
  main = `package ${PKG};

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(AlarmeNativo.class);
        super.onCreate(savedInstanceState);
    }
}
`;
  fs.writeFileSync(mainJava, main);
}
ok('MainActivity registrando o AlarmeNativo');

// ---------- 3. permissões e atividade sobre a tela bloqueada ----------
const manPath = path.join(APP, 'AndroidManifest.xml');
let man = fs.readFileSync(manPath, 'utf8');
const perms = [
  'android.permission.INTERNET',
  'android.permission.ACCESS_COARSE_LOCATION',
  'android.permission.ACCESS_FINE_LOCATION',
  'android.permission.FOREGROUND_SERVICE',
  'android.permission.FOREGROUND_SERVICE_LOCATION',
  'android.permission.POST_NOTIFICATIONS',
  'android.permission.USE_FULL_SCREEN_INTENT',
  'android.permission.WAKE_LOCK',
  'android.permission.VIBRATE',
  'android.permission.REQUEST_IGNORE_BATTERY_OPTIMIZATIONS',
];
const faltam = perms.filter((p) => !man.includes(`"${p}"`));
if (faltam.length) man = man.replace('</manifest>', faltam.map((p) => `    <uses-permission android:name="${p}" />`).join('\n') + '\n</manifest>');
// a tela do app pode abrir por cima da tela bloqueada quando o alarme toca
if (!man.includes('showWhenLocked')) man = man.replace(/<activity\b/, '<activity android:showWhenLocked="true" android:turnScreenOn="true"');
fs.writeFileSync(manPath, man);
ok('AndroidManifest: ' + perms.length + ' permissões conferidas');

// texto da notificação fixa do serviço em segundo plano
const strPath = path.join(APP, 'res', 'values', 'strings.xml');
let str = fs.readFileSync(strPath, 'utf8');
if (!str.includes('capacitor_background_geolocation_notification_channel_name')) {
  str = str.replace('</resources>', '    <string name="capacitor_background_geolocation_notification_channel_name">Em serviço (O.S. e alarmes)</string>\n</resources>');
  fs.writeFileSync(strPath, str);
}
ok('strings.xml');

// ---------- 4. ícone da Multivale ----------
const icone = path.join(__dirname, '..', 'icon-512.png');
if (fs.existsSync(icone)) {
  const res = path.join(APP, 'res');
  for (const d of fs.readdirSync(res).filter((d) => d.startsWith('mipmap-') && !d.includes('anydpi'))) {
    for (const nome of ['ic_launcher.png', 'ic_launcher_round.png', 'ic_launcher_foreground.png']) {
      const alvo = path.join(res, d, nome);
      if (fs.existsSync(alvo)) fs.copyFileSync(icone, alvo);
    }
  }
  // sem o ícone adaptativo do Capacitor (usa o PNG da Multivale direto)
  const any = path.join(res, 'mipmap-anydpi-v26');
  if (fs.existsSync(any)) fs.rmSync(any, { recursive: true, force: true });
  ok('ícone da Multivale aplicado');
  // tela de abertura: fundo azul com o ícone no centro (no lugar do logo do Capacitor)
  for (const d of fs.readdirSync(res).filter((d) => d.startsWith('drawable'))) { const sp = path.join(res, d, 'splash.png'); if (fs.existsSync(sp)) fs.rmSync(sp); }
  fs.writeFileSync(path.join(res, 'drawable', 'splash.xml'), '<?xml version="1.0" encoding="utf-8"?>\n<layer-list xmlns:android="http://schemas.android.com/apk/res/android">\n    <item><color android:color="#0b5f99" /></item>\n    <item><bitmap android:gravity="center" android:src="@mipmap/ic_launcher" /></item>\n</layer-list>\n');
  ok('tela de abertura da Multivale');
} else {
  console.log('… icon-512.png não encontrado na raiz do repositório: o APK fica com o ícone padrão.');
}

// ---------- 5. não travar o build por avisos do lint ----------
const gradle = path.join(__dirname, 'android', 'app', 'build.gradle');
let g = fs.readFileSync(gradle, 'utf8');
// número de versão automático (cada compilação no GitHub sobe 1), para o celular aceitar a atualização
const num = parseInt(process.env.VERSAO_NUM || '1', 10) || 1;
g = g.replace(/versionCode\s+\d+/, 'versionCode ' + num).replace(/versionName\s+"[^"]*"/, `versionName "1.0.${num}"`);
fs.writeFileSync(gradle, g);
if (!g.includes('checkReleaseBuilds false')) {
  g += `
android {
    lint {
        checkReleaseBuilds false
        abortOnError false
    }
}
`;
  fs.writeFileSync(gradle, g);
}
ok('build.gradle');
console.log('Projeto Android pronto.');
