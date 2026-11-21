// Ciclo di gioco della battaglia (agente B). Il regista lo avvia render/grafica.ts; l'HUD usa solo core/bus
// e, per la Diagnostica, ./diagnostica.
export { Partita, interpolaMira } from './partita';
export { Accumulatore, MS_PER_TICK } from './accumulatore';
export { creaVista, visteUguali } from './vista';
