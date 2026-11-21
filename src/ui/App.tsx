import { useEffect } from 'preact/hooks';
import { useStore, set } from './store';
import { RunBoard, stepPlayback } from './board';
import { finishWave } from './store';
import { IntroModal, SellPickScreen, MapScreen, SummaryScreen, PattoScreen, ForestieroScreen, ExileScreen, ShopScreen, RestScreen, EventScreen, EndScreen } from './screens';
import { Title, NewRun, Codex, Unlocks, SettingsScreen, Rules, GameMenu, InspectModal, loadReplayFromHash } from './menus';

export function App() {
  const s = useStore();
  useEffect(() => {
    loadReplayFromHash();
    const onKey = (e: KeyboardEvent) => {
      const st = s;
      if ((e.target as HTMLElement)?.tagName === 'INPUT') return;
      const pb = st.playback ?? st.review;
      if (e.key === 'Escape') set({ inspect: null, menu: false, selected: null, pending: null, intro: null });
      if (!pb) return;
      const key = st.playback ? 'playback' : 'review';
      if (e.key === ' ') { e.preventDefault(); set({ [key]: { ...pb, playing: !pb.playing } } as never); }
      if (e.key === 'ArrowRight') { e.preventDefault(); stepPlayback('next'); }
      if (e.key === 'ArrowLeft') { e.preventDefault(); stepPlayback('prev'); }
      if (e.key === 'End') { e.preventDefault(); stepPlayback('end'); }
      if (e.key === 'Enter' && pb.idx >= pb.out.events.length - 1) { e.preventDefault(); if (st.playback) finishWave(); else set({ review: null }); }
      if (['1', '2', '3', '4'].includes(e.key)) set({ settings: { ...st.settings, speed: [1, 2, 4, 99][Number(e.key) - 1] } });
    };
    window.addEventListener('keydown', onKey);
    // tasto Indietro di Android (Capacitor): chiude ciò che è aperto, altrimenti apre il menu
    const onBack = () => {
      const st = s;
      if (st.inspect || st.intro || st.menu) set({ inspect: null, intro: null, menu: false });
      else if (st.run && st.screen === 'run') set({ menu: true });
      else set({ screen: 'title' });
    };
    document.addEventListener('backbutton', onBack);
    return () => { window.removeEventListener('keydown', onKey); document.removeEventListener('backbutton', onBack); };
  }, [s]);
  useEffect(() => {
    const r = document.documentElement;
    r.dataset.palette = s.settings.palette;
    r.dataset.motion = s.settings.reduceMotion ? 'reduce' : 'full';
    r.style.setProperty('--text-scale', String(s.settings.textScale));
  }, [s.settings]);

  let body;
  if (s.screen === 'title') body = <Title />;
  else if (s.screen === 'newrun') body = <NewRun />;
  else if (s.screen === 'codex') body = <Codex />;
  else if (s.screen === 'unlocks') body = <Unlocks />;
  else if (s.screen === 'settings') body = <SettingsScreen />;
  else if (s.screen === 'rules') body = <Rules />;
  else if (s.run) {
    const ph = s.run.phase;
    if (s.review) body = <RunBoard />;
    else if (ph === 'victory' || ph === 'defeat') body = s.playback ? <RunBoard /> : <EndScreen />;
    else if (ph === 'map') body = <MapScreen />;
    else if (ph === 'summary') body = <SummaryScreen />;
    else if (ph === 'patto') body = <PattoScreen />;
    else if (ph === 'forestiero') body = <ForestieroScreen />;
    else if (ph === 'exilePick') body = <ExileScreen />;
    else if (ph === 'shop') body = <ShopScreen />;
    else if (ph === 'rest') body = <RestScreen />;
    else if (ph === 'event') body = <EventScreen />;
    else if (ph === 'sellPick') body = <SellPickScreen />;
    else body = <RunBoard />;
  } else body = <Title />;

  return (
    <div class={`app act-${s.run?.act ?? 1}`}>
      <main>{body}</main>
      {s.intro && !s.inspect && <IntroModal />}
      {s.inspect && <InspectModal />}
      {s.menu && <GameMenu />}
      {s.toast && <div class="toast" role="status">{s.toast}</div>}
    </div>
  );
}
