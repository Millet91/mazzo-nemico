// Acquisto unico "Sblocca tutto" (business.md dec. 6: un prodotto non consumabile, 1,99 €).
// OGGI È FINTO: niente Play Billing finché non c'è l'AAB firmato (Lead P2). Il finto ricorda l'acquisto sul
// telefono (Preferences) così "Ripristina acquisto" funziona come quello vero. Quando arriva il plugin di Play
// Billing si cambia solo questo file: la UI usa compra(), ripristina() e prezzo().
import { Preferences } from '@capacitor/preferences';

export const ID_PRODOTTO = 'sblocca_tutto';
const CHIAVE_FINTA = 'acquisti.finto';

export type EsitoAcquisto = 'ok' | 'annullato' | 'errore';

/** true finché l'acquisto è finto (per un'etichetta "prova" nelle build di test) */
export const ACQUISTI_FINTI = true;

/** Prezzo da mostrare, localizzato dallo Store (il finto dice 1,99 €). */
export async function prezzo(): Promise<string> {
  return '1,99 €';
}

const attesa = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Compra "Sblocca tutto". Il finto aspetta un attimo (come la finestra dello Store) e va sempre a buon fine. */
export async function compra(): Promise<EsitoAcquisto> {
  try {
    await attesa(600);
    await Preferences.set({ key: CHIAVE_FINTA, value: JSON.stringify({ prodotto: ID_PRODOTTO, quando: Date.now() }) });
    return 'ok';
  } catch {
    return 'errore';
  }
}

/** Chiede allo Store gli acquisti già fatti: true se "Sblocca tutto" risulta comprato. */
export async function ripristina(): Promise<boolean> {
  try {
    await attesa(400);
    const { value } = await Preferences.get({ key: CHIAVE_FINTA });
    return !!value && (JSON.parse(value) as { prodotto?: string }).prodotto === ID_PRODOTTO;
  } catch {
    return false;
  }
}

/** Solo per le prove: dimentica l'acquisto finto. */
export async function dimenticaAcquistoFinto(): Promise<void> {
  try { await Preferences.remove({ key: CHIAVE_FINTA }); } catch { /* niente */ }
}
