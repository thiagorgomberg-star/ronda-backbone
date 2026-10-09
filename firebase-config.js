/*
  CONFIGURAÇÃO DO FIREBASE — Ronda Backbone Multivale

  Enquanto FIREBASE_CONFIG for null, o app funciona só no celular (sem nuvem).

  Para ligar a nuvem:
  1. No console do Firebase, abra o projeto > Configurações do projeto (engrenagem) > Seus apps > App da Web (</>).
  2. Copie o objeto "firebaseConfig" e cole abaixo, no lugar de null.
  3. Suba este arquivo no GitHub. Os celulares passam a sincronizar sozinhos.

  Exemplo (troque pelos dados do SEU projeto):

  window.FIREBASE_CONFIG = {
    apiKey: "AIza...",
    authDomain: "ronda-backbone.firebaseapp.com",
    projectId: "ronda-backbone",
    storageBucket: "ronda-backbone.appspot.com",
    messagingSenderId: "1234567890",
    appId: "1:1234567890:web:abcdef123456"
  };
*/
window.FIREBASE_CONFIG = null;

/* Nome da equipe/empresa. Todos os dados ficam em orgs/<este nome>/... */
window.FIREBASE_ORG = 'multivale';
