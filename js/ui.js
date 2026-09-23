/* ==========================================================================
   INTERFAZ: estado del anclaje, capas y calibración en sala.
   Sin framework: en AR cada milisegundo del hilo principal se nota en el
   tracking, así que la superposición va con DOM y transiciones CSS.
   ========================================================================== */

import { MARCADORES, CAPAS, TEXTOS, SENAL, HITOS, ENLACES } from './config.js';

const $ = (s, r = document) => r.querySelector(s);

/* Enlaces permanentes: PDF de la obra, web del artista, iridia.world.
   Se pintan en la portada y en la barra inferior de la vista AR. */
export function montarEnlaces() {
  const items = [
    { texto: 'About the work (PDF)', url: ENLACES.pdf, clase: 'pdf' },
    { texto: ENLACES.artista.texto, url: ENLACES.artista.url },
    { texto: ENLACES.iridia.texto, url: ENLACES.iridia.url },
  ];
  // Los botones fijos del visor.
  const fijo = (id, url) => { const el = document.getElementById(id); if (el) el.href = url; };
  fijo('cta-iridia', ENLACES.iridia.url);
  fijo('cta-artista', ENLACES.artista.url);
  fijo('cta-pdf', ENLACES.pdf);
  document.querySelectorAll('.enlaces').forEach((cont) => {
    cont.innerHTML = '';
    for (const it of items) {
      const a = document.createElement('a');
      a.href = it.url;
      a.target = '_blank';
      a.rel = 'noopener';
      a.textContent = it.texto;
      if (it.clase) a.classList.add(it.clase);
      cont.appendChild(a);
    }
  });
}

export class HUD {
  constructor({ onCapa, modo = 'imagen' }) {
    this.onCapa = onCapa;
    this.modo = modo;
    this.estado = $('#estado');
    this.estadoTexto = $('#estado-texto');
    this.pie = $('#pie');
    this.pieDato = $('#pie-dato');
    this.pieLuz = $('#pie-luz');
    this.aviso = $('#aviso');
    this.panelCapas = $('#capas');
    this._construirCapas();

    $('#btn-capas').addEventListener('click', () => {
      this.panelCapas.classList.toggle('abierto');
    });
    $('#pie-frec').textContent = TEXTOS.frecuencia;
    this._ultimoEstado = null;
  }

  _construirCapas() {
    const nombres = {
      radiacion: 'Rings',
      estacionaria: 'Field tube',
      campoCercano: 'Near field',
      cintas: 'Ribbon wave',
      paquete: 'Pulse & milestones',
      psyche: '16 Psyche',
      guia: 'Alignment guide',
    };
    for (const [clave, etiqueta] of Object.entries(nombres)) {
      const b = document.createElement('button');
      b.className = 'capa' + (CAPAS[clave] ? ' on' : '');
      b.textContent = etiqueta;
      b.addEventListener('click', () => {
        CAPAS[clave] = !CAPAS[clave];
        b.classList.toggle('on', CAPAS[clave]);
        this.onCapa(clave, CAPAS[clave]);
      });
      this.panelCapas.appendChild(b);
    }
  }

  actualizar(info, hitoActivo) {
    if (info.estado !== this._ultimoEstado) {
      this._ultimoEstado = info.estado;
      const T = TEXTOS.trigger;
      const mapa = {
        // modo imagen
        buscando: ['buscando', this.modo === 'libre' ? 'Finding the floor · hold the phone forward'
                             : this.modo === 'giro' ? 'Starting' : `Point at the ${T}`],
        seguido: ['ok', 'Anchored'],
        reteniendo: ['reten', `${T[0].toUpperCase() + T.slice(1)} out of view`],
        perdido: ['buscando', `Look back at the ${T}`],
        // modo libre
        apuntando: ['apunta', `Centre the ${T} and tap`],
        anclada: ['ok', 'Anchored · walk around'],
        // modo giro
        giro: ['ok', 'Look around'],
      };
      const [clase, texto] = mapa[info.estado] || mapa.buscando;
      this.estado.className = 'estado ' + clase;
      this.estadoTexto.textContent = texto;
      document.body.classList.toggle('rastreando', info.estado === 'seguido');
    }
    if (info.marcador) this.estado.dataset.marcador = info.marcador;

    if (hitoActivo != null) {
      const h = HITOS[hitoActivo];
      const s = h.segundosLuz;
      const min = Math.floor(s / 60);
      this.pieDato.textContent = `${h.etiqueta} km`;
      this.pieLuz.textContent = `${min} min ${String(Math.round(s % 60)).padStart(2, '0')} s light-time`;
      this.pie.classList.add('visible');
    } else {
      this.pie.classList.remove('visible');
    }
  }

  mensaje(txt, ms = 3200) {
    this.aviso.textContent = txt;
    this.aviso.classList.add('visible');
    clearTimeout(this._t);
    this._t = setTimeout(() => this.aviso.classList.remove('visible'), ms);
  }
}

/* --------------------------------------------------------------------------
   CALIBRACIÓN
   Se abre con ?calibrar=1 o pulsando cinco veces el estado. Permite mover cada
   marcador respecto a la pieza hasta que la guía se pegue al cobre, y copiar
   el bloque MARCADORES ya corregido para pegarlo en config.js.
   -------------------------------------------------------------------------- */
export class Calibrador {
  constructor({ onCambio, hud }) {
    this.onCambio = onCambio;
    this.hud = hud;
    this.el = $('#calibrar');
    this.sel = $('#cal-marcador');
    this.campos = {};
    this.indice = 0;

    MARCADORES.forEach((m, i) => {
      const o = document.createElement('option');
      o.value = String(i);
      o.textContent = `${m.id} · ${m.nombre}`;
      this.sel.appendChild(o);
    });
    this.sel.addEventListener('change', () => {
      this.indice = Number(this.sel.value);
      this._cargar();
    });

    const filas = [
      ['x', 'X · along the tubes', -4, 4, 0.005, 'm'],
      ['y', 'Y · height', -2, 2, 0.005, 'm'],
      ['z', 'Z · towards the viewer', -3, 3, 0.005, 'm'],
      ['rx', 'Rotation X', -180, 180, 1, '°'],
      ['ry', 'Rotation Y', -180, 180, 1, '°'],
      ['rz', 'Rotation Z', -180, 180, 1, '°'],
      ['w', 'Printed width', 0.05, 0.9, 0.001, 'm'],
    ];
    const cont = $('#cal-campos');
    for (const [clave, etiqueta, min, max, paso, u] of filas) {
      const fila = document.createElement('label');
      fila.className = 'cal-fila';
      fila.innerHTML = `<span>${etiqueta}</span>
        <input type="range" min="${min}" max="${max}" step="${paso}">
        <output></output>`;
      const input = $('input', fila);
      const out = $('output', fila);
      input.addEventListener('input', () => {
        out.textContent = Number(input.value).toFixed(u === '°' ? 0 : 3) + ' ' + u;
        this._aplicar();
      });
      this.campos[clave] = { input, out, u };
      cont.appendChild(fila);
    }

    $('#cal-copiar').addEventListener('click', () => this._copiar());
    $('#cal-cerrar').addEventListener('click', () => this.cerrar());
    this._cargar();
  }

  abrir() { this.el.classList.add('abierto'); this._cargar(); }
  cerrar() { this.el.classList.remove('abierto'); }
  alternar() { this.el.classList.toggle('abierto'); }

  _cargar() {
    const m = MARCADORES[this.indice];
    const v = {
      x: m.posicion[0], y: m.posicion[1], z: m.posicion[2],
      rx: m.rotacionDeg[0], ry: m.rotacionDeg[1], rz: m.rotacionDeg[2],
      w: m.anchoImpreso,
    };
    for (const [k, c] of Object.entries(this.campos)) {
      c.input.value = v[k];
      c.out.textContent = Number(v[k]).toFixed(c.u === '°' ? 0 : 3) + ' ' + c.u;
    }
  }

  _aplicar() {
    const m = MARCADORES[this.indice];
    const n = (k) => Number(this.campos[k].input.value);
    m.posicion = [n('x'), n('y'), n('z')];
    m.rotacionDeg = [n('rx'), n('ry'), n('rz')];
    m.anchoImpreso = n('w');
    this.onCambio();
  }

  _copiar() {
    const txt = 'export const MARCADORES = ' + JSON.stringify(
      MARCADORES.map((m) => ({
        id: m.id, nombre: m.nombre,
        anchoImpreso: Number(m.anchoImpreso.toFixed(4)),
        posicion: m.posicion.map((v) => Number(v.toFixed(4))),
        rotacionDeg: m.rotacionDeg.map((v) => Number(v.toFixed(2))),
      })), null, 2) + ';';
    navigator.clipboard?.writeText(txt).then(
      () => this.hud.mensaje('Calibration copied. Paste it into js/config.js'),
      () => { console.log(txt); this.hud.mensaje('Could not copy; it is in the console'); }
    );
  }
}

export { SENAL };
