const VERSION = '0.7.3';

function applyVersion() {
  const badge = document.querySelector('.pilot-badge');
  if (badge) badge.textContent = `CUBA PILOT v${VERSION}`;
  const description = document.querySelector('meta[name="description"]');
  if (description) description.setAttribute('content', `VIVA CUBA — Cuba Pilot v${VERSION}`);
}

applyVersion();
queueMicrotask(applyVersion);
window.addEventListener('pageshow', applyVersion);
