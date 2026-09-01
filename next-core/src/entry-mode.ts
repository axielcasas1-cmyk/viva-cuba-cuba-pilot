export type EntryMode='USER'|'OWNER';

export function resolveEntryMode(rawPath:string):EntryMode {
  let pathname='/';
  try { pathname=new URL(rawPath,'https://viva.invalid').pathname; }
  catch { pathname=rawPath.split(/[?#]/,1)[0]||'/'; }
  const normalized=pathname.length>1?pathname.replace(/\/+$/,''):pathname;
  return normalized==='/owner'||normalized.startsWith('/owner/')?'OWNER':'USER';
}
