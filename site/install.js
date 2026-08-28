import { detectInstallPlatform, installUiState } from './lib/core.mjs';

const button = document.getElementById('downloadAppPrimary');
const help = document.getElementById('downloadAppHelp');
const installBridge = document.getElementById('installApp');
const guide = document.getElementById('downloadGuide');
const guideTitle = document.getElementById('downloadGuideTitle');
const guideText = document.getElementById('downloadGuideText');
const closeGuide = document.getElementById('closeDownloadGuide');

function isStandalone() {
  return window.matchMedia?.('(display-mode: standalone)').matches === true || navigator.standalone === true;
}

function platform() {
  return detectInstallPlatform(navigator.userAgent || '', navigator.maxTouchPoints || 0);
}

function bridgeReady() {
  return Boolean(installBridge && !installBridge.classList.contains('hidden'));
}

function showHelp(message) {
  help.textContent = message;
  help.classList.remove('hidden');
}

function showGuide(target) {
  const messages = {
    ios: ['Instalar en iPhone / iPad', 'Abre VIVA CUBA en Safari, pulsa Compartir y selecciona “Añadir a pantalla de inicio”. Luego abre VIVA CUBA desde su icono.'],
    android: ['Instalar en Android', 'Abre el menú del navegador y pulsa “Instalar app” o “Añadir a pantalla de inicio”. Si el navegador ofrece instalación automática, usa el botón DESCARGAR APP de nuevo.'],
    windows: ['Instalar en Windows', 'En Chrome o Edge, abre el menú del navegador y elige “Instalar VIVA CUBA”, o usa el icono de instalación de la barra de direcciones.'],
    mac: ['Instalar en Mac', 'En Safari compatible usa Archivo → Añadir al Dock. En Chrome usa el icono o la opción “Instalar VIVA CUBA”.'],
    chromeos: ['Instalar en Chromebook', 'Abre el menú de Chrome y selecciona “Instalar VIVA CUBA”.'],
    linux: ['Instalar en ordenador', 'Abre el menú de Chrome/Chromium y selecciona “Instalar app” si está disponible.'],
    other: ['Instalar VIVA CUBA', 'Este navegador no expone instalación automática. Usa su menú y busca “Instalar app” o “Añadir a pantalla de inicio”.']
  };
  const [title, text] = messages[target] || messages.other;
  guideTitle.textContent = title;
  guideText.textContent = text;
  guide.classList.remove('hidden');
  guide.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function refreshButton() {
  const state = installUiState({
    platform: platform(),
    installed: isStandalone(),
    promptAvailable: bridgeReady(),
  });
  button.textContent = state.label;
  button.dataset.mode = state.mode;
  button.classList.toggle('is-installed', state.mode === 'installed');
  button.disabled = false;
}

button.addEventListener('click', () => {
  const target = platform();
  if (isStandalone()) {
    showHelp('VIVA CUBA ya está instalada en este dispositivo.');
    refreshButton();
    return;
  }

  if (bridgeReady()) {
    showHelp('Abriendo el instalador de VIVA CUBA…');
    installBridge.click();
    return;
  }

  showGuide(target);
});

closeGuide?.addEventListener('click', () => {
  guide.classList.add('hidden');
  button.focus();
});

window.addEventListener('appinstalled', () => {
  guide.classList.add('hidden');
  showHelp('VIVA CUBA quedó instalada correctamente. Ya puedes abrirla desde su icono.');
  refreshButton();
});

if (installBridge) {
  const observer = new MutationObserver(refreshButton);
  observer.observe(installBridge, { attributes: true, attributeFilter: ['class'] });
}

refreshButton();
