export function classifyOwnerClaimError(error) {
  const message = String(error?.message || error || '').trim();
  const lower = message.toLowerCase();
  if (message === 'DESAPLICAXI_TIMEOUT') return 'TIMEOUT';
  if (/failed to fetch|networkerror|network request failed|load failed|cors/.test(lower)) return 'NETWORK';
  if (/permission denied|42501|not authorized|unauthorized|forbidden/.test(lower)) return 'PERMISSION';
  if (/pgrst202|could not find the function|schema cache|function .* does not exist/.test(lower)) return 'RPC_MISSING';
  if (/setup.*invalid|invalid.*setup|expired|vencid|already used|ya fue usado|setup_invalid_or_expired/.test(lower)) return 'SETUP_INVALID';
  return 'UNKNOWN';
}

export function ownerClaimErrorMessage(error) {
  const kind = classifyOwnerClaimError(error);
  if (kind === 'TIMEOUT') return 'DESAPLICAXI tardó demasiado en responder. Reintenta en unos segundos.';
  if (kind === 'NETWORK') return 'No se pudo alcanzar DESAPLICAXI desde este navegador. Comprueba la conexión y reintenta.';
  if (kind === 'PERMISSION') return 'DESAPLICAXI respondió, pero el RPC OWNER no tiene permiso de ejecución. El SETUP no es el problema.';
  if (kind === 'RPC_MISSING') return 'El RPC OWNER no está publicado en el backend o su caché de esquema no está actualizada. El SETUP no es el problema.';
  if (kind === 'SETUP_INVALID') return 'El código SETUP es inválido, ya fue usado o venció.';
  const detail = String(error?.message || '').trim().slice(0, 180);
  return detail ? `DESAPLICAXI respondió con un error técnico: ${detail}` : 'DESAPLICAXI devolvió un error técnico no identificado.';
}
