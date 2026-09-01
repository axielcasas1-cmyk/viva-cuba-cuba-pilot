import { ownerClaimErrorMessage } from './lib/owner-claim-error.mjs';

const CLAIM_MARKER = '/rest/v1/rpc/dx_claim_owner_setup';
let lastClaimError = null;
const originalFetch = window.fetch.bind(window);

window.fetch = async (...args) => {
  const target = String(args?.[0]?.url || args?.[0] || '');
  if (!target.includes(CLAIM_MARKER)) return originalFetch(...args);
  lastClaimError = null;
  try {
    const response = await originalFetch(...args);
    if (!response.ok) {
      let detail = '';
      try {
        const text = await response.clone().text();
        try {
          const body = text ? JSON.parse(text) : null;
          detail = String(body?.message || body?.error || body?.details || text || '');
        } catch {
          detail = text;
        }
      } catch {}
      if (response.status === 401 || response.status === 403) detail = `permission denied (${response.status}) ${detail}`;
      if (response.status === 404 && !detail) detail = 'PGRST202 Could not find the function dx_claim_owner_setup';
      lastClaimError = new Error(detail || `HTTP ${response.status}`);
    }
    return response;
  } catch (error) {
    lastClaimError = error;
    throw error;
  }
};

const errorBox = document.getElementById('ownerGateError');
if (errorBox) {
  const observer = new MutationObserver(() => {
    const generic = /SETUP.*inválido|SETUP.*invalido|ya fue usado o venció/i.test(errorBox.textContent || '');
    if (!generic || !lastClaimError) return;
    const corrected = ownerClaimErrorMessage(lastClaimError);
    if (corrected && corrected !== errorBox.textContent) errorBox.textContent = corrected;
  });
  observer.observe(errorBox, { childList: true, characterData: true, subtree: true });
}
