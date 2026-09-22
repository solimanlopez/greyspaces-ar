/* ==========================================================================
   GREY SPACES · AR — arranque
   IRIDIA / SLStudio

   Modos de anclaje:
     libre      WebXR (Android con Chrome): una cartela, un toque, y la obra se
                queda fija en la sala mientras el visitante la recorre
     imagen     seguimiento por imagen (iPhone y respaldo): la obra se sostiene
                mientras la cartela esté a la vista o unos segundos después

   Parámetros de URL:
     ?modo=libre | ?modo=imagen   fuerza un modo
     ?previa=1                    la escena sin cámara, para el ordenador
     ?mesa=1                      prueba de escritorio, la obra encogida
     ?calibrar=1                  panel de calibración (modo imagen)
     ?capas=guia,psyche           qué capas arrancan encendidas
     ?nacer=0.4                   congela la materialización, para revisarla
   ========================================================================== */

import * as THREE from 'three';
import { PIEZA, PSYCHE, CAPAS, MARCADORES, ANCLAJE, TEXTOS, HITOS, MODO } from './config.js';
import { AnclajeMultiMarcador } from './anchoring.js';
import { CampoRF } from './rf-field.js';
import { Asteroide } from './psyche.js';
import { crearGuia, crearFantasmasMarcadores } from './piece.js';
import { HUD, Calibrador, montarEnlaces } from './ui.js';
import { arrancarPortada } from './portada.js';
import * as XR from './xr.js';

const params = new URLSearchParams(location.search);
const MODO_PREVIA = params.has('previa') || params.has('preview');
const ABRIR_CALIBRACION = params.has('calibrar');
const MODO_FORZADO = params.get('modo');          // 'libre' | 'imagen' | null
const NACER_FIJO = params.has('nacer') ? parseFloat(params.get('nacer')) : null;

// ?mesa=1 es el modo de prueba de escritorio: pone la cartela en el origen y
// encoge la obra hasta que cabe sobre la mesa, para verla con la webcam del
// ordenador o con el móvil sin la instalación delante. ?mesa=0.30 la deja
// algo más grande.
const MODO_MESA = params.has('mesa');
const ESCALA_MESA = MODO_MESA ? (parseFloat(params.get('mesa')) || 0.18) : 1;
if (MODO_MESA) {
  for (const m of MARCADORES) { m.posicion = [0, 0, 0]; m.rotacionDeg = [0, 0, 0]; }
}

if (params.has('capas')) {
  const pedidas = new Set(params.get('capas').split(',').map((s) => s.trim()));
  for (const k of Object.keys(CAPAS)) CAPAS[k] = pedidas.has(k);
}

const $ = (s) => document.querySelector(s);

/* -------------------------------------------------------------------------
   Reflejos de estudio para el metal de Psyche. Sin un entorno, un material
   metálico se ve plano; con este refleja una sala neutra. Se genera una vez.
   ------------------------------------------------------------------------- */
async function entornoReflejos(renderer, scene) {
  try {
    const { RoomEnvironment } = await import('three/addons/environments/RoomEnvironment.js');
    const pmrem = new THREE.PMREMGenerator(renderer);
    scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    pmrem.dispose();
  } catch (e) { console.warn('[entorno]', e.message); }
}

/* -------------------------------------------------------------------------
   La obra: todo en metros, con el origen en el centro del recorrido.
   ------------------------------------------------------------------------- */
function construirObra() {
  const raiz = new THREE.Group();
  const contenido = new THREE.Group();          // se encoge entera en modo mesa
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

/* Fantasma para el modo libre: la guía en alambre, tenue, en el punto donde
   caerá la obra si el visitante toca ahora. */
function construirFantasmaLibre() {
  const raiz = new THREE.Group();
  raiz.matrixAutoUpdate = false;
  raiz.visible = false;
  const g = crearGuia();
  g.scale.setScalar(ESCALA_MESA);
  g.traverse((o) => { if (o.material) { o.material = o.material.clone(); o.material.opacity *= 0.55; } });
  raiz.add(g);
  return raiz;
}

/* Índice del bloque por el que pasa el pulso ahora mismo, o null. */
function hitoActivo(tPaquete) {
  if (tPaquete < 0 || tPaquete > 1) return null;
  const n = PIEZA.nBloques;
  const idx = Math.round(tPaquete * (n - 1));
  return Math.abs(tPaquete - idx / (n - 1)) < 0.05 ? idx : null;
}

/* Cuánta señal está llegando al asteroide, 0..1. */
function nivelLlegada(tPaquete) {
  if (tPaquete < 0.96) return 0;
  return Math.min(1, (tPaquete - 0.96) / 0.30);
}

/* -------------------------------------------------------------------------
   Materialización: la obra se dibuja de un extremo al otro al anclarse.
   ------------------------------------------------------------------------- */
class Nacimiento {
  constructor(obra) { this.obra = obra; this.t = -1; this.set(NACER_FIJO ?? 0); }
  set(v) { this.obra.campo.nacer = v; this.obra.asteroide.nacer = v; }
  empezar() { if (NACER_FIJO === null) { this.t = 0; this.set(0); } }
  get completo() { return NACER_FIJO !== null || this.t < 0; }
  actualizar(dt) {
    if (NACER_FIJO !== null) { this.set(NACER_FIJO); return; }
    if (this.t < 0) return;
    this.t += dt / MODO.nacimientoSegundos;
    if (this.t >= 1) { this.set(1); this.t = -1; return; }
    // Arranca despacio, corre, y frena al final.
    const e = this.t < 0.5 ? 2 * this.t * this.t : 1 - Math.pow(-2 * this.t + 2, 2) / 2;
    this.set(e);
  }
}

function conectarCapas(obra) {
  return (clave, valor) => {
    if (clave === 'guia') { obra.guia.visible = valor; obra.fantasmas.visible = valor; }
    else if (clave === 'psyche') obra.asteroide.grupo.visible = valor;
    else obra.campo.aplicarCapas(CAPAS);
  };
}

/* Un fotograma de la obra, común a los tres modos. */
function paso(obra, nacimiento, camera, renderer, dt, t, opacidad) {
  nacimiento.actualizar(dt);
  const esc = renderer.domElement.height / 500;
  obra.campo.actualizar(t, dt, camera, opacidad, esc);
  obra.asteroide.actualizar(t, dt, camera, opacidad, nivelLlegada(obra.campo.tPaquete), esc);
}

/* =========================================================================
   MODO IMAGEN — MindAR
   ========================================================================= */
async function arrancarImagen() {
  const { MindARThree } = await import('mindar-image-three');

  const mindar = new MindARThree({
    container: $('#ar'),
    imageTargetSrc: 'targets/targets.mind',
    maxTrack: ANCLAJE.maxTrack,
    filterMinCF: ANCLAJE.filterMinCF,
    filterBeta: ANCLAJE.filterBeta,
    missTolerance: ANCLAJE.missTolerance,
    warmupTolerance: ANCLAJE.warmupTolerance,
    uiLoading: 'no', uiScanning: 'no', uiError: 'no',
  });

  const { renderer, scene, camera } = mindar;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  const obra = construirObra();
  scene.add(obra.raiz);
  entornoReflejos(renderer, scene);

  const anclaje = new AnclajeMultiMarcador(mindar, obra.raiz);
  const nacimiento = new Nacimiento(obra);
  const hud = new HUD({ onCapa: conectarCapas(obra), modo: 'imagen' });
  const calibrador = new Calibrador({ onCambio: () => anclaje.recalcularTodo(), hud });
  if (ABRIR_CALIBRACION) {
    calibrador.abrir();
    CAPAS.guia = true; obra.guia.visible = true; obra.fantasmas.visible = true;
  }
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
  let nacida = false;
  renderer.setAnimationLoop(() => {
    const ahora = performance.now();
    const dt = Math.min((ahora - anterior) / 1000, 0.1);
    anterior = ahora;
    const t = ahora / 1000;

    const info = anclaje.actualizar(camera, dt);
    if (info.estado === 'seguido' && !nacida) { nacida = true; nacimiento.empezar(); }
    paso(obra, nacimiento, camera, renderer, dt, t, info.opacidad);
    hud.actualizar(info, hitoActivo(obra.campo.tPaquete));
    renderer.render(scene, camera);
  });

  window.__gs = { modo: 'imagen', mindar, obra, anclaje, hud, calibrador };
}

/* =========================================================================
   MODO LIBRE — WebXR
   ========================================================================= */
async function arrancarLibre() {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(innerWidth, innerHeight);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  $('#ar').appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(60, innerWidth / innerHeight, 0.02, 40);

  const obra = construirObra();
  scene.add(obra.raiz);
  entornoReflejos(renderer, scene);

  const fantasma = construirFantasmaLibre();
  scene.add(fantasma);

  const nacimiento = new Nacimiento(obra);
  const hud = new HUD({ onCapa: conectarCapas(obra), modo: 'libre' });

  const sesion = new XR.SesionLibre({
    renderer, scene, raiz: obra.raiz, fantasma,
    overlay: document.body,
    alColocar: () => { nacimiento.empezar(); hud.mensaje('Anchored. You can now walk around it.', 2600); },
  });
  sesion.alTerminar = () => {
    renderer.setAnimationLoop(null);
    $('#portada').classList.remove('fuera');
    document.body.classList.remove('libre');
  };

  $('#btn-recolocar').addEventListener('click', () => {
    sesion.recolocar();
    nacimiento.set(0);
    hud.mensaje(`Centre the ${TEXTOS.trigger} and tap the screen.`, 3000);
  });

  await sesion.iniciar();
  document.body.classList.add('libre');
  $('#portada').classList.add('fuera');

  let anterior = performance.now();
  renderer.setAnimationLoop((_, frame) => {
    const ahora = performance.now();
    const dt = Math.min((ahora - anterior) / 1000, 0.1);
    anterior = ahora;
    const t = ahora / 1000;

    const info = sesion.actualizar(frame, renderer.xr.getCamera());
    paso(obra, nacimiento, renderer.xr.getCamera(), renderer, dt, t, 1);
    hud.actualizar(info, info.estado === 'anclada' ? hitoActivo(obra.campo.tPaquete) : null);
    renderer.render(scene, camera);
  });

  window.__gs = { modo: 'libre', sesion, obra, hud };
}

/* =========================================================================
   MODO PREVIA — sin cámara, con órbita
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
  camera.position.set(2.6 * ESCALA_MESA, 1.7 * ESCALA_MESA, 4.6 * ESCALA_MESA);

  const obra = construirObra();
  scene.add(obra.raiz);
  entornoReflejos(renderer, scene);

  const ctr = new OrbitControls(camera, renderer.domElement);
  ctr.target.set(0, 0.55 * ESCALA_MESA, 0.9 * ESCALA_MESA);
  ctr.enableDamping = true;
  ctr.autoRotate = !params.has('quieto');
  ctr.autoRotateSpeed = 0.45;
  ctr.update();

  const nacimiento = new Nacimiento(obra);
  const hud = new HUD({ onCapa: conectarCapas(obra), modo: 'previa' });
  hud.actualizar({ estado: 'seguido', marcador: '—', opacidad: 1 }, null);
  document.body.classList.add('previa');
  $('#portada').classList.add('fuera');
  // En la previa la obra nace nada más abrir, para ver la materialización.
  setTimeout(() => nacimiento.empezar(), 500);

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
    paso(obra, nacimiento, camera, renderer, dt, t, 1);
    hud.actualizar({ estado: 'seguido', marcador: '—', opacidad: 1 }, hitoActivo(obra.campo.tPaquete));
    renderer.render(scene, camera);
  });

  window.__gs = { modo: 'previa', obra, hud, nacimiento };
  window.__listo = true;
}

/* =========================================================================
   ARRANQUE
   ========================================================================= */
$('#titulo').textContent = TEXTOS.titulo;
$('#subtitulo').textContent = TEXTOS.subtitulo;
montarEnlaces();
if (!MODO_PREVIA) arrancarPortada();

/* Variant Launch, si hay clave: carga su SDK y espera a que diga si hay WebXR.
   En iPhone redirige a su Launch Card y vuelve dentro de un navegador con
   WebXR, así que después de esto navigator.xr existe también en Safari. */
let variantListo = null;
function prepararVariant() {
  if (!MODO.variantKey) return Promise.resolve();
  if (variantListo) return variantListo;
  variantListo = new Promise((res) => {
    const s = document.createElement('script');
    s.src = `https://launchar.app/sdk/v1?key=${encodeURIComponent(MODO.variantKey)}&redirect=true`;
    window.addEventListener('vlaunch-initialized', (e) => {
      console.info('[variant]', e.detail);
      res();
    }, { once: true });
    s.onerror = () => res();
    document.head.appendChild(s);
    setTimeout(res, 5000);
  });
  return variantListo;
}

async function elegirModo() {
  if (MODO_FORZADO === 'libre' || MODO_FORZADO === 'imagen') return MODO_FORZADO;
  if (MODO.preferido !== 'auto') return MODO.preferido;
  await prepararVariant();
  return (await XR.soportado()) ? 'libre' : 'imagen';
}

async function iniciar() {
  const btn = $('#btn-entrar');
  btn.disabled = true;
  btn.textContent = 'Opening the camera…';
  try {
    const modo = await elegirModo();
    if (document.fonts) { document.fonts.load('300 72px Lato').catch(() => {}); }
    if (modo === 'libre') {
      try {
        await arrancarLibre();
        return;
      } catch (e) {
        // Si WebXR falla (permiso denegado, ARCore ausente), caemos a imagen.
        console.warn('[libre] no se pudo iniciar, se usa el modo imagen:', e.message);
        document.body.classList.remove('libre');
      }
    }
    await AnclajeMultiMarcador.pedirPermisoGiroscopio();
    await arrancarImagen();
  } catch (e) {
    console.error(e);
    btn.disabled = false;
    btn.textContent = 'Try again';
    $('#error').textContent =
      'The camera could not be opened. Make sure the page is served over https ' +
      'and the browser has camera permission. On iPhone, open it in Safari.';
    $('#error').classList.add('visible');
  }
}

// La portada avisa de qué modo va a tocar en este móvil.
(async () => {
  const modo = await elegirModo();
  const pista = $('.pista');
  if (modo === 'libre') {
    pista.textContent = `Centre the ${TEXTOS.trigger}, tap the screen, and walk.`;
    $('#btn-entrar').textContent = 'Enter the work';
  } else {
    pista.textContent = `Point the camera at the ${TEXTOS.trigger} beside the work.`;
  }
})();

if (MODO_PREVIA) {
  arrancarPrevia();
} else {
  $('#btn-entrar').addEventListener('click', iniciar);
}

export { HITOS, PSYCHE };
