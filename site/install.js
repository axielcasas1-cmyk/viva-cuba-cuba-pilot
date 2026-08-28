import { detectInstallPlatform, installUiState } from './lib/core.mjs';

const button = document.getElementById('downloadAppPrimary');
const help = document.getElementById('downloadAppHelp');
let installPrompt = null;

function isStandalone() {
  return window.matchMedia?.('(display-mode: standalone)').matches === true || navigator.standalone === true;
}

function platform() {
  return detectInstallPlatform(navigator.userAgent || '', navigator.maxTouchPoints || 0);
}

function showHelp(message) {
  help.textContent = message;
  help.classList.remove('hidden');
}

function refreshButton() {
  const state = installUiState({
    platform: platform(),
    installed: isStandalone(),
    promptAvailable: Boolean(installPrompt),
  });
  button.textContent = state.label;
  button.dataset.mode = state.mode;
  button.classList.toggle('is-installed', state.mode === 'installed');
  button.disabled = false;
}

function manualGuidance(target) {
  if (target === 'ios') {
    return 'iPhone/iPad: abre VIVA CUBA en Safari, pulsa Compartir y selecciona “Añadir a pantalla de inicio”. Después ábrela desde el icono de VIVA CUBA.';
  }
  if (target === 'android') {
    return 'Android: abre el menú del navegador y selecciona “Instalar app” o “Añadir a pantalla de inicio”. Si aparece el aviso automático de instalación, acéptalo.';
  }
  if (target === 'windows' || target === 'mac' || target === 'chromeos' || target === 'linux') {
    return 'Ordenador: abre el menú del navegador y selecciona “Instalar VIVA CUBA” o el icono de instalación de la barra de direcciones.';
  }
  return 'Este navegador no ofrece instalación automática. Puedes seguir usando VIVA CUBA desde este mismo enlace o abrir el menú del navegador y buscar “Instalar app” / “Añadir a pantalla de inicio”.';
}

window.addEventListener('beforeinstallprompt', (event) => {
  event.preventDefault();
  installPrompt = event;
  refreshButton();
});

window.addEventListener('appinstalled', () => {
  installPrompt = null;
  refreshButton();
  showHelp('VIVA CUBA quedó instalada correctamente en este dispositivo. Ya puedes abrirla desde su icono.');
});

button.addEventListener('click', async () => {
  const target = platform();
  const state = installUiState({
    platform: target,
    installed: isStandalone(),
    promptAvailable: Boolean(installPrompt),
  });

  if (state.mode === 'installed') {
    showHelp('VIVA CUBA ya está instalada en este dispositivo.');
    return;
  }

  if (state.mode === 'prompt' && installPrompt) {
    const prompt = installPrompt;
    installPrompt = null;
    await prompt.prompt();
    const choice = await prompt.userChoice;
    if (choice?.outcome === 'accepted') {
      showHelp('Instalación aceptada. Espera unos segundos y busca el icono de VIVA CUBA en tu dispositivo.');
    } else {
      showHelp('La instalación no se completó. Puedes volver a pulsar DESCARGAR APP o instalarla desde el menú del navegador.');
    }
    refreshButton();
    return;
  }

  showHelp(manualGuidance(target));
});

refreshButton();
