export const APP_VERSION = '0.9.1';
export const APP_CHANNEL = 'mami-candidate';

export function applyVersion(label = '') {
  const badge = document.querySelector('.pilot-badge');
  if (badge) badge.textContent = label || `MADRE v${APP_VERSION}`;
  const description = document.querySelector('meta[name="description"]');
  if (description) description.setAttribute('content', `VIVA CUBA — MADRE v${APP_VERSION}`);
}

applyVersion();
queueMicrotask(() => applyVersion());
window.addEventListener('pageshow', () => applyVersion());
