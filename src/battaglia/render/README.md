# battaglia/render/ — Pixi della battaglia: tile del terreno, sprite, camera, input, particelle. Proprietario: agente Rendering e input (da M1, ramo claude/m1-render).

- `camera.ts`, `fionda.ts`, `pittura-terreno.ts`: parti pure (testate in `tests/render/`).
- `terreno.ts`: 32 tile 256×256, ridisegno solo delle tile toccate dai crateri, max 6 caricamenti per frame.
- `forme.ts`: segnaposto di 11 §5 disegnati una volta e trasformati in texture.
- `scena-battaglia.ts`, `effetti.ts`: pirati, proiettili, acqua, traiettoria, anello e freccia, esplosioni, numeri di danno.
- `input.ts`: fionda dall'anello, trascinamento della camera fuori dall'anello, pinch, doppio tocco.
