const ownerButton = document.getElementById('openOwnerPortal');
const generateInvite = document.getElementById('generateInvite');
const ownerActionIds = ['copyCode', 'copyLink', 'shareInvite', 'copyMessage', 'openHostRoom'];

function setOwnerActionsEnabled(enabled) {
  ownerActionIds.forEach((id) => {
    const button = document.getElementById(id);
    if (button) button.disabled = !enabled;
  });
}

function openOwnerRoute() {
  const target = `${location.pathname}${location.search}#owner`;
  history.replaceState(null, '', target);
  location.reload();
}

ownerButton?.addEventListener('click', openOwnerRoute);

generateInvite?.addEventListener('click', () => {
  queueMicrotask(() => {
    const generatedCode = document.getElementById('generatedCode')?.textContent?.trim();
    setOwnerActionsEnabled(Boolean(generatedCode && generatedCode !== '—'));
  });
});

setOwnerActionsEnabled(false);
