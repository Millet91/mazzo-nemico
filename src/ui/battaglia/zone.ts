// Zone dei controlli dell'HUD (doppio joystick e tasti), per la regola "ogni tocco appartiene al controllo
// dove comincia": B le riceve con impostaZoneControlli e il canvas ignora i tocchi che partono lì.

/** Il punto (px CSS della finestra) sta su un controllo dell'HUD (cerchio di un joystick o tasto)? */
export function puntoSuiComandi(x: number, y: number): boolean {
  if (typeof document === 'undefined') return false;
  for (const el of document.querySelectorAll<HTMLElement>('[data-zona-comando], .hud button')) {
    const r = el.getBoundingClientRect();
    if (r.width === 0) continue;
    if (el.dataset.zonaComando === 'cerchio') {
      if (Math.hypot(x - (r.left + r.width / 2), y - (r.top + r.height / 2)) <= r.width / 2) return true;
    } else if (x >= r.left && x <= r.right && y >= r.top && y <= r.bottom) return true;
  }
  return false;
}
