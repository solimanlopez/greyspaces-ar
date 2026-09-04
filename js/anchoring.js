/* ==========================================================================
   ANCLAJE MULTI-MARCADOR
   Varios marcadores, una sola obra.

   Cada marcador conoce su pose respecto al origen de la pieza. Sea cual sea el
   que esté a la vista, la obra aparece en el mismo sitio del espacio real. Al
   rodear la instalación se va pasando de un marcador al siguiente sin que la
   obra salte, y si se pierden todos se sostiene unos segundos con el
   giroscopio antes de desvanecerse.
   ========================================================================== */

import * as THREE from 'three';
import { MARCADORES, ANCLAJE } from './config.js';

const _m = new THREE.Matrix4();
const _pos = new THREE.Vector3();
const _quat = new THREE.Quaternion();
const _scl = new THREE.Vector3();
const _v = new THREE.Vector3();
const _normal = new THREE.Vector3();
const _q = new THREE.Quaternion();
const _R4 = new THREE.Matrix4();

/* Conversión de los ángulos de deviceorientation al sistema de la cámara,
   igual que hacía DeviceOrientationControls de three. */
const _EJE_Z = new THREE.Vector3(0, 0, 1);
const _Q_MEDIA_VUELTA = new THREE.Quaternion(-Math.sqrt(0.5), 0, 0, Math.sqrt(0.5));
const _euler = new THREE.Euler();
const _qGiroPantalla = new THREE.Quaternion();

function quaternionDesdeOrientacion(alpha, beta, gamma, orient) {
  _euler.set(beta, alpha, -gamma, 'YXZ');
  const q = new THREE.Quaternion().setFromEuler(_euler);
  q.multiply(_Q_MEDIA_VUELTA);                                  // cámara mirando al fondo
  _qGiroPantalla.setFromAxisAngle(_EJE_Z, -orient);             // rotación de pantalla
  q.multiply(_qGiroPantalla);
  return q;
}

export class AnclajeMultiMarcador {
  /**
   * @param {object} mindarThree instancia de MindARThree
   * @param {THREE.Object3D} raiz objeto que contiene toda la obra, en metros
   */
  constructor(mindarThree, raiz) {
    this.mindar = mindarThree;
    this.raiz = raiz;
    this.raiz.matrixAutoUpdate = false;

    this.anclas = [];
    this.activo = null;          // marcador que manda ahora mismo
    this.tienePose = false;      // ya se ha visto algo alguna vez
    this.perdidoDesde = null;    // timestamp de la última pérdida total
    this.opacidad = 0;           // 0..1, para el desvanecido

    // Pose suavizada que se aplica a la raíz.
    this.posSuave = new THREE.Vector3();
    this.quatSuave = new THREE.Quaternion();
    this.esclSuave = new THREE.Vector3(1, 1, 1);
    this.inicializada = false;

    // Estado del giroscopio para la retención.
    this.quatDispositivo = null;
    this.quatAlPerder = null;
    this.orientacionPantalla = 0;

    this._prepararAnclas();
    this._escucharGiroscopio();
  }

  _prepararAnclas() {
    MARCADORES.forEach((cfg, i) => {
      const ancla = this.mindar.addAnchor(i);

      // Pose del marcador dentro del sistema de la pieza.
      const rot = new THREE.Euler(
        THREE.MathUtils.degToRad(cfg.rotacionDeg[0]),
        THREE.MathUtils.degToRad(cfg.rotacionDeg[1]),
        THREE.MathUtils.degToRad(cfg.rotacionDeg[2]),
        'XYZ'
      );
      const M = new THREE.Matrix4().compose(
        new THREE.Vector3(...cfg.posicion),
        new THREE.Quaternion().setFromEuler(rot),
        new THREE.Vector3(1, 1, 1)
      );

      // De coordenadas de pieza (metros) a coordenadas del ancla de MindAR,
      // donde 1 unidad = el ancho del marcador impreso.
      const escala = new THREE.Matrix4().makeScale(
        1 / cfg.anchoImpreso, 1 / cfg.anchoImpreso, 1 / cfg.anchoImpreso
      );

      const correccion = new THREE.Matrix4()
        .multiplyMatrices(escala, new THREE.Matrix4().copy(M).invert());

      this.anclas.push({
        cfg,
        indice: i,
        ancla,
        correccion,
        // Se recalcula si se toca la calibración en sala.
        recalcular: () => this._recalcular(this.anclas[i]),
        visible: false,
        vistaEn: 0,
        centralidad: 0,
      });

      ancla.onTargetFound = () => {
        const a = this.anclas[i];
        a.visible = true;
        a.vistaEn = performance.now();
      };
      ancla.onTargetLost = () => {
        this.anclas[i].visible = false;
      };
    });
  }

  /** Rehace la matriz de corrección tras editar la calibración. */
  _recalcular(a) {
    const cfg = a.cfg;
    const rot = new THREE.Euler(
      THREE.MathUtils.degToRad(cfg.rotacionDeg[0]),
      THREE.MathUtils.degToRad(cfg.rotacionDeg[1]),
      THREE.MathUtils.degToRad(cfg.rotacionDeg[2]),
      'XYZ'
    );
    const M = new THREE.Matrix4().compose(
      new THREE.Vector3(...cfg.posicion),
      new THREE.Quaternion().setFromEuler(rot),
      new THREE.Vector3(1, 1, 1)
    );
    const escala = new THREE.Matrix4().makeScale(
      1 / cfg.anchoImpreso, 1 / cfg.anchoImpreso, 1 / cfg.anchoImpreso
    );
    a.correccion.multiplyMatrices(escala, new THREE.Matrix4().copy(M).invert());
  }

  recalcularTodo() {
    this.anclas.forEach((a) => this._recalcular(a));
  }

  _escucharGiroscopio() {
    this.orientacionPantalla = (screen.orientation && screen.orientation.angle) || 0;
    window.addEventListener('orientationchange', () => {
      this.orientacionPantalla = (screen.orientation && screen.orientation.angle) || 0;
    });
    this._onOrient = (e) => {
      if (e.alpha === null) return;
      this.quatDispositivo = quaternionDesdeOrientacion(
        THREE.MathUtils.degToRad(e.alpha),
        THREE.MathUtils.degToRad(e.beta),
        THREE.MathUtils.degToRad(e.gamma),
        THREE.MathUtils.degToRad(this.orientacionPantalla)
      );
    };
    window.addEventListener('deviceorientation', this._onOrient, true);
  }

  /** Pide permiso de giroscopio en iOS. Debe llamarse desde un gesto. */
  static async pedirPermisoGiroscopio() {
    const D = window.DeviceOrientationEvent;
    if (D && typeof D.requestPermission === 'function') {
      try { return (await D.requestPermission()) === 'granted'; } catch { return false; }
    }
    return true;
  }

  /**
   * Elige qué marcador manda. Gana el que esté más centrado en pantalla y más
   * de frente, que es el que da mejor pose. Se histerésis para no oscilar.
   */
  _elegirActivo(camara) {
    let mejor = null;
    let mejorPuntuacion = -Infinity;

    for (const a of this.anclas) {
      if (!a.ancla.visible) continue;

      _m.copy(a.ancla.group.matrix);
      _m.decompose(_pos, _quat, _scl);

      // La cámara de MindAR vive en el origen, así que |pos| es la distancia.
      const dist = _pos.length() || 1e-6;

      // Centralidad: cuánto se aleja el marcador del centro del encuadre.
      _v.copy(_pos).project(camara);
      const fueraDeCentro = Math.hypot(_v.x, _v.y);

      // Frontalidad: cuánto mira su normal (+Z local) hacia la cámara. Un
      // marcador visto muy de canto da una pose pobre y conviene descartarlo.
      _normal.set(0, 0, 1).applyQuaternion(_quat);
      _v.copy(_pos).normalize();
      const frontalidad = Math.abs(_normal.dot(_v));

      let p = 0;
      p -= fueraDeCentro * 1.6;
      p -= dist * 0.15;
      p += frontalidad * 0.9;
      // Histéresis: el que ya manda tiene ventaja, para que no oscile.
      if (this.activo && this.activo.indice === a.indice) p += 0.35;

      a.centralidad = -fueraDeCentro;
      if (p > mejorPuntuacion) { mejorPuntuacion = p; mejor = a; }
    }
    return mejor;
  }

  /**
   * Se llama una vez por fotograma, antes de renderizar.
   * @returns {{estado:string, marcador:?string, opacidad:number}}
   */
  actualizar(camara, dt) {
    const ahora = performance.now();
    const elegido = this._elegirActivo(camara);

    if (elegido) {
      this.activo = elegido;
      this.perdidoDesde = null;
      this.tienePose = true;

      // Matriz objetivo: ancla × corrección del marcador.
      _m.multiplyMatrices(elegido.ancla.group.matrix, elegido.correccion);
      _m.decompose(_pos, _quat, _scl);

      if (!this.inicializada) {
        this.posSuave.copy(_pos);
        this.quatSuave.copy(_quat);
        this.esclSuave.copy(_scl);
        this.inicializada = true;
      } else {
        // Suavizado adaptativo: si la pose se mueve poco, suavizamos más.
        const salto = this.posSuave.distanceTo(_pos);
        const base = salto > 0.08 ? ANCLAJE.suavizado * 0.75 : ANCLAJE.suavizadoQuieto;
        // Normalizar el factor a 60 fps para que no dependa del framerate.
        const k = 1 - Math.pow(base, Math.max(dt, 1 / 120) * 60);
        this.posSuave.lerp(_pos, k);
        this.quatSuave.slerp(_quat, k);
        this.esclSuave.lerp(_scl, k);
      }

      this.opacidad = Math.min(1, this.opacidad + dt * 2.5);
      this.quatAlPerder = null;
      this._aplicar();
      return { estado: 'seguido', marcador: elegido.cfg.id, opacidad: this.opacidad };
    }

    // Nada a la vista.
    if (!this.tienePose) {
      this.opacidad = 0;
      this.raiz.visible = false;
      return { estado: 'buscando', marcador: null, opacidad: 0 };
    }

    if (this.perdidoDesde === null) {
      this.perdidoDesde = ahora;
      this.quatAlPerder = this.quatDispositivo ? this.quatDispositivo.clone() : null;
    }

    const transcurrido = (ahora - this.perdidoDesde) / 1000;
    const { retencionSegundos: R, desvanecidoSegundos: F } = ANCLAJE;

    if (transcurrido > R + F) {
      this.opacidad = 0;
      this.raiz.visible = false;
      return { estado: 'perdido', marcador: null, opacidad: 0 };
    }

    this.opacidad = transcurrido <= R ? 1 : 1 - (transcurrido - R) / F;

    // Retención por giroscopio: la obra se queda donde estaba en el espacio
    // aunque el móvil gire. No corrige traslación, así que si el visitante
    // camina se irá despegando; por eso solo dura unos segundos.
    if (this.quatDispositivo && this.quatAlPerder) {
      _q.copy(this.quatDispositivo).invert().multiply(this.quatAlPerder);
      _R4.makeRotationFromQuaternion(_q);
      _m.compose(this.posSuave, this.quatSuave, this.esclSuave);
      _m.premultiply(_R4);
      _m.decompose(_pos, _quat, _scl);
      this.raiz.matrix.compose(_pos, _quat, _scl);
    } else {
      this.raiz.matrix.compose(this.posSuave, this.quatSuave, this.esclSuave);
    }
    this.raiz.visible = true;
    this.raiz.matrixWorldNeedsUpdate = true;
    return { estado: 'reteniendo', marcador: null, opacidad: this.opacidad };
  }

  _aplicar() {
    this.raiz.visible = true;
    this.raiz.matrix.compose(this.posSuave, this.quatSuave, this.esclSuave);
    this.raiz.matrixWorldNeedsUpdate = true;
  }
}
