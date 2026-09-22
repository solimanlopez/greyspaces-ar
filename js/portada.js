/* ==========================================================================
   PORTADA — la bienvenida
   Un canvas 2D en la mitad alta de la pantalla, sin librerías y sin efectos
   de plantilla: 16 Psyche (el mezzotint de la plancha) como imagen, y debajo
   la línea de cobre con la onda circular dibujada a un solo trazo, como un
   grabado. El pulso recorre los diez hitos y el contador de la portada salta
   a cada distancia cuando pasa por ella: es el mismo dato que va impreso en
   los bloques.

   Se detiene sola cuando la portada se oculta (clase .fuera) para no robar
   fotogramas a la realidad aumentada.
   ========================================================================== */

import { HITOS } from './config.js';

const VERDE = [0, 255, 33];
const COBRE = [208, 139, 79];

export function arrancarPortada() {
  const portada = document.getElementById('portada');
  const canvas = document.getElementById('cielo');
  const contador = document.getElementById('contador');
  const hitoNum = document.getElementById('contador-hito');
  if (!portada || !canvas) return;

  const ctx = canvas.getContext('2d', { alpha: false });
  const reducir = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const dpr = Math.min(devicePixelRatio || 1, 2);
  let W = 0, H = 0, activo = true, t0 = performance.now();
  let ultimoHito = -1;

  const psyche = new Image();
  psyche.src = 'img/psyche-mezzotint.webp';
  let psycheListo = false;
  psyche.onload = () => { psycheListo = true; };

  function medir() {
    const r = canvas.getBoundingClientRect();
    W = Math.max(1, Math.round(r.width)); H = Math.max(1, Math.round(r.height));
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  medir();
  addEventListener('resize', medir);

  const rgba = (c, a) => `rgba(${c[0]},${c[1]},${c[2]},${a})`;
  const suave = (x) => x * x * (3 - 2 * x);

  function dibujar(ahora) {
    if (!activo) return;
    if (portada.classList.contains('fuera')) { activo = false; return; }
    const t = (ahora - t0) / 1000;
    const nacer = suave(Math.min(1, t / 1.8));

    ctx.fillStyle = '#07090b';
    ctx.fillRect(0, 0, W, H);

    // ---- la línea: horizonte entre la imagen y el texto
    const ly = H - 26;
    const x0 = -10, x1 = W + 10, largo = x1 - x0;

    // ---- 16 Psyche, girando apenas
    if (psycheListo) {
      const ar = psyche.height / psyche.width;
      const alto = Math.min((ly - 34) * 0.96, W * 0.92 * ar);
      const ancho = alto / ar;
      const cy = 12 + (ly - 34) / 2;
      ctx.save();
      ctx.translate(W / 2, cy);
      if (!reducir) ctx.rotate(t * 0.011);
      ctx.globalAlpha = 0.92 * nacer;
      ctx.drawImage(psyche, -ancho / 2, -alto / 2, ancho, alto);
      ctx.restore();
    }

    // ---- onda circular: anillos finos alrededor de la línea, a un trazo
    const nAn = 22;
    ctx.lineWidth = 1;
    for (let i = 0; i < nAn; i++) {
      const u = (i + 0.5) / nAn;
      const x = x0 + largo * u;
      const fase = t * 1.5 - u * 9;
      const env = 0.5 + 0.5 * Math.sin(fase);
      const r = 6 + 20 * env;
      ctx.strokeStyle = rgba(VERDE, (0.14 + 0.30 * env) * nacer);
      ctx.beginPath(); ctx.ellipse(x, ly, r * 0.34, r, 0, 0, Math.PI * 2); ctx.stroke();
    }

    // ---- los dos tubos
    for (const dy of [-4, 4]) {
      ctx.strokeStyle = rgba(COBRE, 0.6 * nacer); ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(x0, ly + dy); ctx.lineTo(x1, ly + dy); ctx.stroke();
    }

    // ---- marcas de hito y pulso
    const per = 9.0;
    const p = (t / per) % 1;
    const px = x0 + largo * p;
    const idx = Math.min(HITOS.length - 1, Math.floor(p * HITOS.length));
    if (idx !== ultimoHito) {
      ultimoHito = idx;
      if (contador) contador.textContent = HITOS[idx].etiqueta;
      if (hitoNum) hitoNum.textContent = String(idx + 1).padStart(2, '0') + ' / ' + String(HITOS.length).padStart(2, '0');
    }
    for (let i = 0; i < HITOS.length; i++) {
      const hx = x0 + largo * ((i + 0.5) / HITOS.length);
      const pasado = hx <= px;
      ctx.fillStyle = rgba(pasado ? VERDE : [186, 191, 196], (pasado ? 0.9 : 0.35) * nacer);
      ctx.fillRect(Math.round(hx) - 0.5, ly + 9, 1, 8);
    }
    ctx.fillStyle = rgba([255, 255, 255], nacer);
    ctx.beginPath(); ctx.arc(px, ly, 2.2, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = rgba(VERDE, 0.9 * nacer); ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(px, ly, 6, 0, Math.PI * 2); ctx.stroke();

    requestAnimationFrame(dibujar);
  }
  requestAnimationFrame(dibujar);

  // Si vuelve a la portada (por ejemplo al salir del modo libre), reanuda.
  new MutationObserver(() => {
    if (!portada.classList.contains('fuera') && !activo) {
      activo = true; t0 = performance.now(); medir(); requestAnimationFrame(dibujar);
    }
  }).observe(portada, { attributes: true, attributeFilter: ['class'] });
}
