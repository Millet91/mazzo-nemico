# battaglia/partita/ — ciclo di gioco della battaglia: passo fisso, comandi, turni dell'IA, VistaBattaglia sul bus. Proprietario: agente Rendering e input (da M1, ramo claude/m1-render).

- `partita.ts`: ciclo di gioco SENZA grafica (si prova in Node): passo fisso 60 Hz (`accumulatore.ts`, max 5 tick per frame), comandi timbrati col tick e registrati nel replay, turni dell'IA (medita ≥ 1 s → mira animata → fuoco → fuga).
- `vista.ts`: StatoBattaglia → VistaBattaglia per l'HUD.
- `regista.ts`: collega bus, Partita, scena Pixi, camera e input. Lo avvia `render/grafica.ts`.
- `diagnostica.ts`: `provaFps()` per Impostazioni → Diagnostica (da caricare con `import()` dinamico).
