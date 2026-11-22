// Il trucco di ogni isola, disegnato con il kit di moduli sopra la mappa del suo seme (livelli-cap1.md §2).
// Le coordinate sono quelle della mappa del seme (lato 0 a sinistra): se il seme cambia, vanno rifatte.
import { MATERIALE, type MappaGenerata } from '../../../src/core/tipi';
import { muro, riempi, scostaAppigli, suolo, torreSuPali, type Cantiere } from '../../../src/battaglia/gen/moduli';

type Trucco = (c: Cantiere, m: MappaGenerata) => Partial<MappaGenerata>;

/** Toglie le decorazioni dentro gli ingombri delle strutture (sono solo grafica, ma coprirebbero i moduli). */
function senzaDecorazioniSotto(c: Cantiere, m: MappaGenerata): Partial<MappaGenerata> {
  return { decorazioni: m.decorazioni.filter((d) => !c.strutture.some((s) => d.x >= s.x0 - 20 && d.x <= s.x1 + 20)) };
}

export const TRUCCHI: Record<string, Trucco> = {
  /**
   * 1D Scoglio della Vedetta (seme 2452), Bandiera sulla punta (y 355). Una torre di vedetta per lato sulla spiaggia,
   * oltre le partenze (sul fianco della punta i pali taglierebbero la salita alla Bandiera), sull’orlo rialzato
   * e non sulla riva in pendenza (lì lo scoppio buttava in mare chi stava sopra: provato). Si sale con la scala
   * accanto; dal piano si vede tutta la piana. Tocca l'isola solo coi due pali: un colpo alla base la fa crollare,
   * con chi c'è sopra, sulla spiaggia (non in mare). Accanto c'è il barile della spiaggia: combo possibile.
   */
  '1D': (c, m) => {
    // una scala per capo, a 10 px dal piano (asse libero 8 px, piano in cima entro 14): i pali tagliano la spiaggia,
    // quindi al barile della spiaggia si arriva passando sulla torre (e, crollata la torre, a piedi)
    torreSuPali(c, { x0: 248, x1: 282, piano: 738, pali: [250, 276] });
    torreSuPali(c, { x0: 1720, x1: 1754, piano: 690, pali: [1722, 1748] });
    const scala = (x: number, yAlto: number) => ({ tipo: 'scala' as const, x, yAlto, yBasso: suolo(c, x, yAlto) });
    return { ...senzaDecorazioniSotto(c, m), appigli: [scala(236, 738), scala(292, 738), ...scostaAppigli(c, m.appigli ?? []), scala(1710, 690), scala(1766, 690)] };
  },

  /**
   * 1C Forte Rampino (seme 2103): il bastione della Marina sull'altopiano (x 864-1150). Due muri ai bordi
   * dell'altopiano: architrave di FERRO (non si scava) e portone di LEGNO sotto (si sfonda). Alti 28 px: fanno
   * riparo e si scavalcano. Niente garitte su pali: i pali tagliano la strada sull'altopiano (provato coi test di
   * percorribilità). Il tetto resta aperto: l'area non è mai chiusa dal ferro (06 §7.5).
   */
  '1C': (c, m) => {
    // muri alti 28 px: si scavalcano (BIL.movimento.scavalcoMax) e fanno riparo; ogni coppia di partenze resta
    // collegata a piedi (06 §7.5). Il portone di legno si sfonda, l'architrave di ferro no.
    // i muri stanno sul piano dell'altopiano (x 896-1088): su un pendio chi scivola non si ferma per scavalcarli
    for (const [x0, x1] of [[900, 915], [1070, 1085]] as const) {
      const r = muro(c, x0, x1, 28, MATERIALE.legno);
      riempi(c, { x0, y0: r.y0, x1, y1: r.y0 + 7 }, MATERIALE.ferro);
    }
    return { ...senzaDecorazioniSotto(c, m), appigli: scostaAppigli(c, m.appigli ?? []) };
  },
};
