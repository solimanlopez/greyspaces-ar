/* ==========================================================================
   MODO GIRO · sin marcador, para iPhone (y cualquier móvil sin WebXR)
   Se escanea el QR, se toca "Enter the work", y la obra aparece delante.

   La cámara del móvil va de fondo (getUserMedia) y la escena se orienta con
   el giroscopio (deviceorientation). No hay nada que reconocer: al arrancar,
   la obra se coloca en el suelo, a la distancia de LANZAMIENTO.distancia en
   la dirección en que mira el visitante, con la línea de cobre de través.
   A partir de ahí, girar el móvil es mirar alrededor: la obra se queda en su
   sitio de la sala. Lo que este modo no sabe es cuánto camina el visitante
   (eso es SLAM, solo lo da WebXR), así que si alguien anda varios metros la
   obra se va con él; "Re-centre" la vuelve a poner delante.

   La luz de la galería no le afecta: el giroscopio no mira la imagen.
   Sin giroscopio (ordenador), se mira arrastrando con el dedo o el ratón.
   ========================================================================== */

import * as THREE from 'three';
import { LANZAMIENTO } from './config.js';

const _EJE_Z = new THREE.Vector3(0, 0, 1);
const _Q_MEDIA_VUELTA = new THREE.Quaternion(-Math.sqrt(0.5), 0, 0, Math.sqrt(0.5));
const _euler = new THREE.Euler();
const _qPantalla = new THREE.Quaternion();
const _f = new THREE.Vector3();

/* Ángulos de deviceorientation → orientación de la cámara de three, como
   hacía DeviceOrientationControls. */
function quaternionDesdeOrientacion(alpha, beta, gamma, orient, destino) {
  _euler.set(beta, alpha, -gamma, 'YXZ');
  destino.setFromEuler(_euler);
  destino.multiply(_Q_MEDIA_VUELTA);
  _qPantalla.setFromAxisAngle(_EJE_Z, -orient);
  destino.multiply(_qPantalla);
  return destino;
}

/** Permiso del giroscopio en iOS. Llamar DENTRO del gesto (el toque). */
export function pedirPermisoGiroscopio() {
  const D = window.DeviceOrientationEvent;
  if (D && typeof D.requestPermission === 'function') {
    return D.requestPermission().then((r) => r === 'granted').catch(() => false);
  }
  return Promise.resolve(true);
}

export class SesionGiro {
  /**
   * @param {object} o
   * @param {HTMLElement} o.contenedor   #ar
   * @param {THREE.WebGLRenderer} o.renderer
   * @param {THREE.PerspectiveCamera} o.camera
   * @param {THREE.Object3D} o.raiz      raíz de la obra, en metros
   * @param {Function} o.alColocar
   */
  constructor({ contenedor, renderer, camera, raiz, alColocar }) {
    this.contenedor = contenedor;
    this.renderer = renderer;
    this.camera = camera;
    this.raiz = raiz;
    this.alColocar = alColocar;

    this.raiz.visible = false;
    this.colocada = false;
    this.hayGiro = false;
    this.qObjetivo = new THREE.Quaternion();
    this.orient = 0;

    // Sin giroscopio: arrastrar para mirar.
    this.yaw = 0; this.pitch = 0;
  }

  async iniciar() {
    // ---- cámara de fondo
    const video = document.createElement('video');
    video.setAttribute('playsinline', '');
    video.setAttribute('muted', '');
    video.muted = true;
    video.autoplay = true;
    Object.assign(video.style, {
      position: 'absolute', inset: '0', width: '100%', height: '100%',
      objectFit: 'cover', zIndex: '0', background: '#000',
    });
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: false,
      video: { facingMode: { ideal: 'environment' }, width: { ideal: 1920 }, height: { ideal: 1080 } },
    });
    video.srcObject = stream;
    this.contenedor.appendChild(video);
    await video.play().catch(() => {});
    this.video = video;
    this.stream = stream;

    const lienzo = this.renderer.domElement;
    Object.assign(lienzo.style, { position: 'absolute', inset: '0', zIndex: '1' });
    this.contenedor.appendChild(lienzo);

    // ---- giroscopio
    const leerOrient = () => {
      const a = (screen.orientation && typeof screen.orientation.angle === 'number')
        ? screen.orientation.angle : (window.orientation || 0);
      this.orient = THREE.MathUtils.degToRad(a);
    };
    leerOrient();
    addEventListener('orientationchange', leerOrient);
    screen.orientation?.addEventListener?.('change', leerOrient);

    this._onOrient = (e) => {
      if (e.alpha === null && e.beta === null) return;
      quaternionDesdeOrientacion(
        THREE.MathUtils.degToRad(e.alpha || 0),
        THREE.MathUtils.degToRad(e.beta || 0),
        THREE.MathUtils.degToRad(e.gamma || 0),
        this.orient, this.qObjetivo
      );
      if (!this.hayGiro) { this.hayGiro = true; this.camera.quaternion.copy(this.qObjetivo); }
    };
    addEventListener('deviceorientation', this._onOrient, true);

    // ---- arrastre, solo si no llega giroscopio
    let x0 = 0, y0 = 0, arrastrando = false;
    lienzo.style.touchAction = 'none';
    lienzo.addEventListener('pointerdown', (e) => { arrastrando = true; x0 = e.clientX; y0 = e.clientY; });
    addEventListener('pointerup', () => { arrastrando = false; });
    addEventListener('pointermove', (e) => {
      if (!arrastrando || this.hayGiro) return;
      this.yaw += (e.clientX - x0) * 0.004;
      this.pitch = THREE.MathUtils.clamp(this.pitch + (e.clientY - y0) * 0.004, -1.2, 1.2);
      x0 = e.clientX; y0 = e.clientY;
    });

    this.ajustarVista();
    addEventListener('resize', () => this.ajustarVista());
    video.addEventListener('loadedmetadata', () => this.ajustarVista());

    this.t0 = performance.now();
  }

  /* El campo de visión de la cámara virtual tiene que coincidir con lo que
     se ve del vídeo: la cámara del móvil abarca LANZAMIENTO.fovCamara grados
     en su lado largo, y el vídeo se recorta para llenar la pantalla. */
  ajustarVista() {
    const W = innerWidth, H = innerHeight;
    this.renderer.setSize(W, H);
    this.camera.aspect = W / H;
    const vw = this.video?.videoWidth || 0, vh = this.video?.videoHeight || 0;
    let fovV = 60;
    if (vw && vh) {
      const largo = THREE.MathUtils.degToRad(LANZAMIENTO.fovCamara);
      const tLargo = Math.tan(largo / 2);
      const tV = vh >= vw ? tLargo : tLargo * (vh / vw);      // tangente del medio fov vertical del vídeo
      const s = Math.max(W / vw, H / vh);                     // escala de object-fit: cover
      const fraccion = H / (vh * s);                          // qué parte del alto del vídeo se ve
      fovV = THREE.MathUtils.radToDeg(2 * Math.atan(tV * fraccion));
    }
    this.camera.fov = fovV;
    this.camera.updateProjectionMatrix();
  }

  /** La obra delante, en la dirección en que se mira ahora. */
  colocar() {
    _f.set(0, 0, -1).applyQuaternion(this.camera.quaternion);
    _f.y = 0;
    if (_f.lengthSq() < 1e-4) _f.set(0, 0, -1);
    _f.normalize();
    const d = LANZAMIENTO.distancia;
    this.raiz.position.set(_f.x * d, -LANZAMIENTO.alturaMovil + LANZAMIENTO.alturaEje, _f.z * d);
    this.raiz.rotation.set(0, Math.atan2(-_f.x, -_f.z), 0);
    this.raiz.visible = true;
    this.colocada = true;
    this.alColocar?.();
  }

  recolocar() { this.colocada = false; this.raiz.visible = false; this._pedido = true; }

  terminar() {
    removeEventListener('deviceorientation', this._onOrient, true);
    this.stream?.getTracks().forEach((t) => t.stop());
  }

  actualizar() {
    if (this.hayGiro) {
      // Suavizado corto: quita el temblor del sensor sin notarse el retardo.
      this.camera.quaternion.slerp(this.qObjetivo, 0.35);
    } else {
      _euler.set(this.pitch, this.yaw, 0, 'YXZ');
      this.camera.quaternion.setFromEuler(_euler);
    }
    // Se coloca en cuanto hay giroscopio, o a los 0,8 s si no llega (ordenador).
    const listo = this.hayGiro || performance.now() - this.t0 > 800;
    if (!this.colocada && listo) this.colocar();
    return { estado: this.colocada ? 'giro' : 'buscando' };
  }
}
