export const RELEASE_AUDIT_KEY = 'vc_release_audit_v1';
const SEMVER = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/;
const MAX_AUDIT_ROWS = 50;

export function parseSemver(value) {
  const text = String(value || '').trim();
  const match = SEMVER.exec(text);
  if (!match) throw new Error('INVALID_RELEASE_VERSION');
  return [Number(match[1]), Number(match[2]), Number(match[3])];
}

export function compareSemver(a, b) {
  const left = parseSemver(a);
  const right = parseSemver(b);
  for (let i = 0; i < 3; i += 1) {
    if (left[i] > right[i]) return 1;
    if (left[i] < right[i]) return -1;
  }
  return 0;
}

export function normalizeRelease(input) {
  if (!input || typeof input !== 'object') throw new Error('INVALID_RELEASE_MANIFEST');
  const version = String(input.version || '').trim();
  parseSemver(version);
  const minimumClientVersion = String(input.minimumClientVersion || version).trim();
  parseSemver(minimumClientVersion);
  const channel = String(input.channel || 'stable').trim().toLowerCase();
  if (!['stable', 'preview'].includes(channel)) throw new Error('INVALID_RELEASE_CHANNEL');
  const schemaVersion = Number(input.schemaVersion || 1);
  if (!Number.isInteger(schemaVersion) || schemaVersion < 1) throw new Error('INVALID_RELEASE_SCHEMA');
  const releasedAt = String(input.releasedAt || '').trim();
  if (releasedAt && Number.isNaN(Date.parse(releasedAt))) throw new Error('INVALID_RELEASE_DATE');
  return {
    app: String(input.app || 'VIVA_CUBA'),
    version,
    minimumClientVersion,
    channel,
    schemaVersion,
    releasedAt,
    commit: String(input.commit || ''),
    notes: String(input.notes || ''),
  };
}

export function shouldUpdate(currentVersion, releaseInput) {
  let release;
  try {
    release = normalizeRelease(releaseInput);
    parseSemver(currentVersion);
  } catch {
    return false;
  }
  if (release.channel !== 'stable') return false;
  return compareSemver(release.version, currentVersion) > 0;
}

export function reloadGuardKey(version) {
  parseSemver(version);
  return `vc_release_reload_once:${version}`;
}

export function readReleaseAudit(storage) {
  if (!storage || typeof storage.getItem !== 'function') return [];
  try {
    const parsed = JSON.parse(storage.getItem(RELEASE_AUDIT_KEY) || '[]');
    return Array.isArray(parsed) ? parsed.slice(-MAX_AUDIT_ROWS) : [];
  } catch {
    return [];
  }
}

function safeAuditRow(input) {
  const row = input && typeof input === 'object' ? input : {};
  return {
    at: String(row.at || new Date().toISOString()),
    event: String(row.event || 'release_event').slice(0, 80),
    currentVersion: String(row.currentVersion || '').slice(0, 24),
    targetVersion: String(row.targetVersion || '').slice(0, 24),
    online: Boolean(row.online),
    timezone: String(row.timezone || '').slice(0, 80),
    language: String(row.language || '').slice(0, 32),
    reason: String(row.reason || '').slice(0, 160),
    result: String(row.result || '').slice(0, 80),
  };
}

export function appendReleaseAudit(storage, input) {
  if (!storage || typeof storage.setItem !== 'function') return [];
  const rows = readReleaseAudit(storage);
  rows.push(safeAuditRow(input));
  const bounded = rows.slice(-MAX_AUDIT_ROWS);
  storage.setItem(RELEASE_AUDIT_KEY, JSON.stringify(bounded));
  return bounded;
}
