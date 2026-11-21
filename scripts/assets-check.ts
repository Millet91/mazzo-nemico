// npm run assets:check: quante voci del registro hanno già l'asset definitivo e quali sono ancora segnaposto.
import * as R from '../src/assets/registry';

const groups: Record<string, Record<string, { image?: string; sample?: string }>> = {
  ENEMY_ART: R.ENEMY_ART, DEFENSE_ART: R.DEFENSE_ART, SCENE_ART: R.SCENE_ART, FRAME_ART: R.FRAME_ART,
  OVERLAY_ART: R.OVERLAY_ART, VFX_ART: R.VFX_ART, SOUNDS: R.SOUNDS, MUSIC: R.MUSIC,
};
let tot = 0, done = 0;
for (const [name, g] of Object.entries(groups)) {
  const ids = Object.keys(g);
  const missing = ids.filter((id) => !g[id].image && !g[id].sample);
  tot += ids.length; done += ids.length - missing.length;
  console.log(`${name.padEnd(12)} ${ids.length - missing.length}/${ids.length}${missing.length ? '  mancano: ' + missing.join(', ') : ''}`);
}
console.log(`\nTotale: ${done}/${tot} asset definitivi`);
