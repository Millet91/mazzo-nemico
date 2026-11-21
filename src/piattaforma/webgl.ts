// Controllo WebGL2 all'avvio (rischio di 05 §2.7). PixiJS 8 lavora su WebGL2: senza, il gioco non parte.
export interface EsitoWebgl { ok: boolean; renderer: string }

export function controllaWebgl2(): EsitoWebgl {
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2');
    if (!gl) return { ok: false, renderer: '' };
    const dbg = gl.getExtension('WEBGL_debug_renderer_info');
    const renderer = String(dbg ? gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER));
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return { ok: true, renderer };
  } catch {
    return { ok: false, renderer: '' };
  }
}
