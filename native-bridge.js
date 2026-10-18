'use strict';
// Official one-way sandbox contract. No storage, native SDK or browser vibration/share API.
const NativeBridge = (() => {
  // Reserve the upstream sandbox's two native buttons, without modifying its APK.
  if (new URLSearchParams(window.location.search).get('sandbox') === '1') {
    document.documentElement.classList.add('in-sandbox');
  }
  let completed = false;
  function send(type, payload = {}) { window.postMessage({type, ...payload}, '*'); }
  return Object.freeze({
    complete() {
      // One credit per WebView opening, including in-game restarts and replays.
      if (completed) return;
      completed = true;
      send('COMPLETED_EVENT');
      send('FINISH_EVENT');
    },
    close() { send('CLOSE_EVENT'); },
    vibrate() { send('VIBRATION_EVENT'); },
    share() { send('SHARING_EVENT', {text:'Я защитил все пять районов Киберграда! Теперь знаю, как беречь пароли, файлы и личные данные.'}); }
  });
})();
