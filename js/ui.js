/* ==========================================================================
   INTERFAZ: estado del anclaje, capas y calibración en sala.
   Sin framework: en AR cada milisegundo del hilo principal se nota en el
   tracking, así que la superposición va con DOM y transiciones CSS.
   ========================================================================== */

import { MARCADORES, CAPAS, TEXTOS, SENAL, HITOS } from './config.js';

const $ = (s, r = document) => r.querySelector(s);

export class HUD {
  constructor({ onCapa, modo = 'imagen' }) {
    this.onCapa = onCapa;
    this.modo = modo;
    this.estado = $('#estado');
    this.estadoTexto = $('#estado-texto');
    this.pie = $('#pie');
    this.pieDato = $('#pie-dato');
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
      campoCercano: 'Campo cercano',
      estacionaria: 'Onda circular',
      cintas: 'Onda en cinta',
      radiacion: 'Radiación',
      paquete: 'Pulso e hitos',
      psyche: '16 Psyche',
      guia: 'Guía de encaje',
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
      const mapa = {
        // modo imagen
        buscando: ['buscando', this.modo === 'libre' ? 'Busca una superficie' : 'Apunta a la cartela'],
        seguido: ['ok', 'Anclada'],
        reteniendo: ['reten', 'Cartela fuera de vista'],
        perdido: ['buscando', 'Vuelve a mirar la cartela'],
        // modo libre
        apuntando: ['apunta', 'Centra la cartela y toca'],
        anclada: ['ok', 'Anclada · camina'],
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
      this.pieDato.textContent =
        `${h.etiqueta} km · ${min} min ${String(Math.round(s % 60)).padStart(2, '0')} s luz`;
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
      ['x', 'X · a lo largo de los tubos', -4, 4, 0.005, 'm'],
      ['y', 'Y · altura', -2, 2, 0.005, 'm'],
      ['z', 'Z · hacia el espectador', -3, 3, 0.005, 'm'],
      ['rx', 'Giro X', -180, 180, 1, '°'],
      ['ry', 'Giro Y', -180, 180, 1, '°'],
      ['rz', 'Giro Z', -180, 180, 1, '°'],
      ['w', 'Ancho impreso', 0.05, 0.9, 0.001, 'm'],
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
      () => this.hud.mensaje('Calibración copiada. Pégala en js/config.js'),
      () => { console.log(txt); this.hud.mensaje('No se pudo copiar; está en la consola'); }
    );
  }
}

export { SENAL };
