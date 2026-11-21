// Dati della build, mostrati in Impostazioni → Info (13 §2 L5: senza questi un bug non è riproducibile).
export interface InfoBuild { versione: string; commit: string; build: string; ramo: string; data: string }

export const INFO_BUILD: InfoBuild = {
  versione: typeof __VERSIONE__ === 'string' ? __VERSIONE__ : '0.0.0',
  commit: typeof __COMMIT__ === 'string' ? __COMMIT__ : 'sconosciuto',
  build: typeof __BUILD__ === 'string' ? __BUILD__ : 'locale',
  ramo: typeof __RAMO__ === 'string' ? __RAMO__ : '',
  data: typeof __DATA_BUILD__ === 'string' ? __DATA_BUILD__ : '',
};

/** Riga compatta da incollare nelle segnalazioni: "0.1.0 · build 12 · a1b2c3d". */
export function etichettaBuild(i: InfoBuild = INFO_BUILD): string {
  return `${i.versione} · build ${i.build} · ${i.commit}`;
}
