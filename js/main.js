/* ==========================================================================
   GREY SPACES · AR — arranque
   IRIDIA / SLStudio

   Modos:
     (por defecto)  AR con cámara y marcadores
     ?previa=1      la misma escena sin cámara, para verla en el ordenador
     ?calibrar=1    abre el panel de calibración de marcadores
   ========================================================================== */

import * as THREE from 'three';
import { PIEZA, PSYCHE, CAPAS, MARCADORES, ANCLAJE, TEXTOS, HITOS } from './config.js';
import { AnclajeMultiMarcador } from './anchoring.js';
import { CampoRF } from './rf-field.js';
import { Asteroide } from './psyche.js';
import { crearGuia, crearFantasmasMarcadores } from './piece.js';
import { HUD, Calibrador } from './ui.js';

const params = new URLSearchParams(location.search);
const MODO_PREVIA = params.has('previa') || params.has('preview');
const ABRIR_CALIBRACION = params.has('calibrar');

// ?mesa=1 es el modo de prueba de escritorio: pone todos los marcadores en el
// origen y encoge la obra hasta que cabe sobre la mesa, para poder verla con la
// webcam del ordenador y una cartela impresa, sin la instalación delante.
// Acepta un factor: ?mesa=0.30 la deja algo más grande.
const MODO_MESA = params.has('mesa');
const ESCALA_MESA = MODO_MESA ? (parseFloat(params.get('mesa')) || 0.18) : 1;
if (MODO_MESA) {
  for (const m of MARCADORES) { m.posicion = [0, 0, 0]; m.rotacionDeg = [0, 0, 0]; }
}

// ?capas=guia,psyche fuerza qué capas arrancan encendidas. Útil para dejar al
// personal de sala un enlace con la guía de encaje ya visible.
if (params.has('capas')) {
  const pedidas = new Set(params.get('capas').split(',').map((s) => s.trim()));
  for (const k of Object.keys(CAPAS)) CAPAS[k] = pedidas.has(k);
}

const $ = (s) => document.querySelector(s);

/* -------------------------------------------------------------------------
   Escena de la obra: todo en metros, con el origen en el centro del recorrido.
   ------------------------------------------------------------------------- */
function construirObra() {
  const raiz = new THREE.Group();
  // Grupo intermedio: la obra se define siempre en metros reales, y aquí se
  // encoge entera si estamos en modo mesa.
  const contenido = new THREE.Group();
  contenido.scale.setScalar(ESCALA_MESA);
  raiz.add(contenido);

  const guia = crearGuia();
  guia.visible = CAPAS.guia;
  contenido.add(guia);

  const fantasmas = crearFantasmasMarcadores(MARCADORES);
  fantasmas.visible = CAPAS.guia && !MODO_MESA;
  contenido.add(fantasmas);

  const campo = new CampoRF(CAPAS);
  contenido.add(campo.grupo);

  const asteroide = new Asteroide();
  asteroide.grupo.visible = CAPAS.psyche;
  contenido.add(asteroide.grupo);

  return { raiz, contenido, guia, fantasmas, campo, asteroide };
}

/* Índice del bloque por el que pasa el pulso ahora mismo, o null. */
function hitoActivo(tPaquete) {
  if (tPaquete < 0 || tPaquete > 1) return null;
  const n = PIEZA.nBloques;
  const idx = Math.round(tPaquete * (n - 1));
  const xn = idx / (n - 1);
  return Math.abs(tPaquete - xn) < 0.05 ? idx : null;
}

/* Cuánta señal está llegando al asteroide, 0..1. El pulso sale de la línea al
   terminar el recorrido y tarda un momento en alcanzar a Psyche. */
function nivelLlegada(tPaquete) {
  if (tPaquete < 0.96) return 0;
  return Math.min(1, (tPaquete - 0.96) / 0.30);
}

/* =========================================================================
   MODO AR
   ========================================================================= */
async function arrancarAR() {
  const { MindARThree } = await import('mindar-image-three');

  const mindar = new MindARThree({
    container: $('#ar'),
    imageTargetSrc: 'targets/targets.mind',
    maxTrack: ANCLAJE.maxTrack,
    filterMinCF: ANCLAJE.filterMinCF,
    filterBeta: ANCLAJE.filterBeta,
    missTolerance: ANCLAJE.missTolerance,
    warmupTolerance: ANCLAJE.warmupTolerance,
    uiLoading: 'no',
    uiScanning: 'no',
    uiError: 'no',
  });

  const { renderer, scene, camera } = mindar;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  const obra = construirObra();
  scene.add(obra.raiz);

  const anclaje = new AnclajeMultiMarcador(mindar, obra.raiz);

  const hud = new HUD({
    onCapa: (clave, valor) => {
      if (clave === 'guia') { obra.guia.visible = valor; obra.fantasmas.visible = valor; }
      else if (clave === 'psyche') obra.asteroide.grupo.visible = valor;
      else obra.campo.aplicarCapas(CAPAS);
    },
  });
  const calibrador = new Calibrador({
    onCambio: () => anclaje.recalcularTodo(),
    hud,
  });
  if (ABRIR_CALIBRACION) {
    calibrador.abrir();
    CAPAS.guia = true;
    obra.guia.visible = true;
    obra.fantasmas.visible = true;
  }
  // Cinco toques sobre el indicador de estado abren la calibración en sala.
  let toques = 0, ultimoToque = 0;
  $('#estado').addEventListener('click', () => {
    const t = Date.now();
    toques = (t - ultimoToque < 700) ? toques + 1 : 1;
    ultimoToque = t;
    if (toques >= 5) { toques = 0; calibrador.alternar(); }
  });

  await mindar.start();
  $('#portada').classList.add('fuera');

  let anterior = performance.now();
  renderer.setAnimationLoop(() => {
    const ahora = performance.now();
    const dt = Math.min((ahora - anterior) / 1000, 0.1);
    anterior = ahora;
    const t = ahora / 1000;

    const info = anclaje.actualizar(camera, dt);
    const esc = renderer.domElement.height / 500;
    obra.campo.actualizar(t, dt, camera, info.opacidad);
    obra.asteroide.actualizar(
      t, dt, camera, info.opacidad, nivelLlegada(obra.campo.tPaquete), esc
    );
    hud.actualizar(info, hitoActivo(obra.campo.tPaquete));

    renderer.render(scene, camera);
  });

  // Punto de inspección para diagnóstico en sala desde la consola del móvil.
  window.__gs = { mindar, obra, anclaje, hud, calibrador };
  return { mindar, obra, hud };
}

/* =========================================================================
   MODO PREVIA — la misma obra sin cámara, para revisarla fuera de sala
   ========================================================================= */
async function arrancarPrevia() {
  const { OrbitControls } = await import('three/addons/controls/OrbitControls.js');

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(innerWidth, innerHeight);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  $('#ar').appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0b0d0f);
  const camera = new THREE.PerspectiveCamera(38, innerWidth / innerHeight, 0.05, 60);
  camera.position.set(1.42 * ESCALA_MESA, 0.92 * ESCALA_MESA, 3.05 * ESCALA_MESA);

  const obra = construirObra();
  scene.add(obra.raiz);
  obra.raiz.matrixAutoUpdate = true;

  const ctr = new OrbitControls(camera, renderer.domElement);
  ctr.target.set(0, 0.18 * ESCALA_MESA, 0);
  ctr.enableDamping = true;
  ctr.autoRotate = !params.has('quieto');
  ctr.autoRotateSpeed = 0.45;
  ctr.update();

  const hud = new HUD({
    onCapa: (clave, valor) => {
      if (clave === 'guia') { obra.guia.visible = valor; obra.fantasmas.visible = valor; }
      else if (clave === 'psyche') obra.asteroide.grupo.visible = valor;
      else obra.campo.aplicarCapas(CAPAS);
    },
  });
  hud.actualizar({ estado: 'seguido', marcador: '—', opacidad: 1 }, null);
  document.body.classList.add('previa');
  $('#portada').classList.add('fuera');

  addEventListener('resize', () => {
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(innerWidth, innerHeight);
  });

  let anterior = performance.now();
  renderer.setAnimationLoop(() => {
    const ahora = performance.now();
    const dt = Math.min((ahora - anterior) / 1000, 0.1);
    anterior = ahora;
    const t = ahora / 1000;

    ctr.update();
    const esc = renderer.domElement.height / 500;
    obra.campo.actualizar(t, dt, camera, 1);
    obra.asteroide.actualizar(t, dt, camera, 1, nivelLlegada(obra.campo.tPaquete), esc);
    hud.actualizar({ estado: 'seguido', marcador: '—', opacidad: 1 },
                   hitoActivo(obra.campo.tPaquete));
    renderer.render(scene, camera);
  });

  window.__listo = true;
}

/* =========================================================================
   ARRANQUE
   ========================================================================= */
$('#titulo').textContent = TEXTOS.titulo;
$('#subtitulo').textContent = TEXTOS.subtitulo;

async function iniciar() {
  const btn = $('#btn-entrar');
  btn.disabled = true;
  btn.textContent = 'Abriendo la cámara…';
  try {
    // La tipografía de los hitos es la misma que va pegada sobre los bloques.
    if (document.fonts) { try { await document.fonts.load('300 72px Lato'); } catch {} }
    await AnclajeMultiMarcador.pedirPermisoGiroscopio();
    await arrancarAR();
  } catch (e) {
    console.error(e);
    btn.disabled = false;
    btn.textContent = 'Reintentar';
    $('#error').textContent =
      'No se pudo abrir la cámara. Comprueba que la página va por https y que ' +
      'el navegador tiene permiso de cámara. En iPhone hace falta Safari.';
    $('#error').classList.add('visible');
  }
}

if (MODO_PREVIA) {
  if (document.fonts) { document.fonts.load('300 72px Lato').catch(() => {}); }
  arrancarPrevia();
} else {
  $('#btn-entrar').addEventListener('click', iniciar);
}

export { HITOS, PSYCHE };
