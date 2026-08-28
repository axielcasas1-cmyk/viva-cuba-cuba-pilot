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
    ios: ['Instalar en iPhone / iPad', 'iOS no permite que una web se añada sola a la pantalla de inicio. Desde el navegador donde ya estás, abre Compartir → Añadir a pantalla de inicio → Añadir.'],
    android: ['Instalar en Android', 'Este navegador no ofreció el instalador automático. Abre su menú y pulsa “Instalar app” o “Añadir a pantalla de inicio”.'],
    windows: ['Instalar en Windows', 'Este navegador no ofreció el instalador automático. En Chrome o Edge usa “Instalar VIVA CUBA” o el icono de instalación de la barra.'],
    mac: ['Instalar en Mac', 'Este navegador no ofreció el instalador automático. En Safari compatible usa Archivo → Añadir al Dock; en Chrome usa “Instalar VIVA CUBA”.'],
    chromeos: ['Instalar en Chromebook', 'Este navegador no ofreció el instalador automático. Abre el menú de Chrome y selecciona “Instalar VIVA CUBA”.'],
    linux: ['Instalar en ordenador', 'Este navegador no expone instalación automática. Usa Chrome/Chromium y selecciona “Instalar app” si está disponible.'],
    other: ['Instalar VIVA CUBA', 'Este navegador no expone instalación automática. Usa su opción “Instalar app” o “Añadir a pantalla de inicio”.']
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

  // En navegadores compatibles, un toque abre el instalador nativo de la PWA.
  if (bridgeReady()) {
    showHelp('Abriendo el instalador de VIVA CUBA…');
    installBridge.click();
    return;
  }

  // iOS y otros navegadores pueden exigir una confirmación del sistema o del navegador.
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
