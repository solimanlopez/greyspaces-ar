/* ==========================================================================
   MODO LIBRE · WebXR, sin marcador
   Android con Chrome, y iPhone si se activa Variant Launch.

   Se toca "Enter the work" y la obra aparece sola: el móvil busca el suelo
   con un rayo que sale de la cámara hacia delante y un poco hacia abajo, y
   en cuanto lo encuentra coloca la obra sobre él, a LANZAMIENTO.distancia
   en la dirección en que mira el visitante, con la línea de cobre de
   través. Luego la ancla al espacio (XRAnchor) y el SLAM del móvil la
   mantiene fija mientras el visitante camina, la rodea o se agacha.

   Nada que reconocer en la imagen: la luz de la galería no le afecta más
   allá de que el móvil vea algo de textura en el suelo, y si en unos
   segundos no lo encuentra, usa la altura del suelo que da el propio
   dispositivo (local-floor) o la estima.
   ========================================================================== */

import * as THREE from 'three';
import { LANZAMIENTO } from './config.js';

const _m = new THREE.Matrix4();
const _pos = new THREE.Vector3();
const _quat = new THREE.Quaternion();
const _scl = new THREE.Vector3();
const _n = new THREE.Vector3();
const _f = new THREE.Vector3();
const _x = new THREE.Vector3();
const _z = new THREE.Vector3();
const _ARRIBA = new THREE.Vector3(0, 1, 0);

export async function soportado() {
  if (!('xr' in navigator) || !navigator.xr) return false;
  try { return await navigator.xr.isSessionSupported('immersive-ar'); }
  catch { return false; }
}

export class SesionLibre {
  /**
   * @param {object} o
   * @param {THREE.WebGLRenderer} o.renderer
   * @param {THREE.Scene} o.scene
   * @param {THREE.Object3D} o.raiz       raíz de la obra, en metros
   * @param {HTMLElement} o.overlay       raíz del DOM que se ve sobre la AR
   * @param {Function} o.alColocar        callback cuando la obra aparece
   */
  constructor({ renderer, scene, raiz, overlay, alColocar }) {
    this.renderer = renderer;
    this.scene = scene;
    this.raiz = raiz;
    this.overlay = overlay;
    this.alColocar = alColocar;

    this.raiz.matrixAutoUpdate = false;
    this.raiz.visible = false;

    this.sesion = null;
    this.fuenteHit = null;
    this.ancla = null;
    this.colocada = false;
    this.sueloY = null;          // altura del suelo en el espacio de referencia
    this.tipoRef = 'local';
  }

  async iniciar() {
    this.sesion = await navigator.xr.requestSession('immersive-ar', {
      optionalFeatures: ['hit-test', 'local-floor', 'anchors', 'dom-overlay'],
      domOverlay: { root: this.overlay },
    });

    this.tipoRef = 'local-floor';
    try { await this.sesion.requestReferenceSpace('local-floor'); }
    catch { this.tipoRef = 'local'; }
    this.renderer.xr.enabled = true;
    this.renderer.xr.setReferenceSpaceType(this.tipoRef);
    await this.renderer.xr.setSession(this.sesion);

    // Rayo de búsqueda del suelo: desde la cámara, hacia delante y unos 25°
    // hacia abajo. Con el móvil a la altura del pecho cae a unos tres metros.
    try {
      const viewer = await this.sesion.requestReferenceSpace('viewer');
      const opciones = { space: viewer };
      if (typeof XRRay === 'function') {
        opciones.offsetRay = new XRRay({ x: 0, y: 0, z: 0, w: 1 }, { x: 0, y: -0.47, z: -1, w: 0 });
      }
      this.fuenteHit = await this.sesion.requestHitTestSource(opciones);
    } catch { this.fuenteHit = null; }

    // Los toques en los botones del visor no cuentan como toques en la AR.
    this.overlay.addEventListener('beforexrselect', (e) => {
      if (e.target.closest && e.target.closest('a, button, #capas, #calibrar')) e.preventDefault();
    });

    this.sesion.addEventListener('end', () => { this.sesion = null; this.alTerminar?.(); });
    this.t0 = performance.now();
    return this.sesion;
  }

  terminar() { this.sesion?.end(); }

  /** La vuelve a poner delante, en la dirección en que se mira ahora. */
  recolocar() {
    this.colocada = false;
    this.raiz.visible = false;
    if (this.ancla) { try { this.ancla.delete(); } catch {} this.ancla = null; }
  }

  _colocar(frame, ref, poseVisor) {
    const t = poseVisor.transform;
    _pos.set(t.position.x, t.position.y, t.position.z);
    _quat.set(t.orientation.x, t.orientation.y, t.orientation.z, t.orientation.w);
    _f.set(0, 0, -1).applyQuaternion(_quat);
    _f.y = 0;
    if (_f.lengthSq() < 1e-4) _f.set(0, 0, -1);
    _f.normalize();

    const d = LANZAMIENTO.distancia;
    _pos.x += _f.x * d;
    _pos.z += _f.z * d;
    _pos.y = this.sueloY + LANZAMIENTO.alturaEje;

    // La pieza mira al visitante: su +Z es la dirección hacia él.
    _z.copy(_f).negate();
    _x.crossVectors(_ARRIBA, _z).normalize();
    _m.makeBasis(_x, _ARRIBA, _z).setPosition(_pos);
    this.raiz.matrix.copy(_m);
    this.raiz.matrixWorldNeedsUpdate = true;
    this.raiz.visible = true;
    this.colocada = true;

    // Ancla del espacio: el SLAM la corrige si el mapa se reajusta.
    if (typeof frame.createAnchor === 'function' && typeof XRRigidTransform === 'function') {
      _m.decompose(_pos, _quat, _scl);
      const pose = new XRRigidTransform(
        { x: _pos.x, y: _pos.y, z: _pos.z, w: 1 },
        { x: _quat.x, y: _quat.y, z: _quat.z, w: _quat.w }
      );
      frame.createAnchor(pose, ref).then((a) => { this.ancla = a; }).catch(() => {});
    }
    this.alColocar?.();
  }

  /**
   * Una vez por fotograma con el XRFrame que da three.
   * @returns {{estado:string}}
   */
  actualizar(frame) {
    if (!frame || !this.sesion) return { estado: 'buscando' };
    const ref = this.renderer.xr.getReferenceSpace();
    if (!ref) return { estado: 'buscando' };

    if (this.colocada) {
      if (this.ancla && frame.trackedAnchors?.has(this.ancla)) {
        const p = frame.getPose(this.ancla.anchorSpace, ref);
        if (p) {
          this.raiz.matrix.fromArray(p.transform.matrix);
          this.raiz.matrixWorldNeedsUpdate = true;
        }
      }
      return { estado: 'anclada' };
    }

    const visor = frame.getViewerPose(ref);
    if (!visor) return { estado: 'buscando' };

    // ¿Suelo? Un impacto con la normal hacia arriba y por debajo del móvil.
    if (this.fuenteHit) {
      const hits = frame.getHitTestResults(this.fuenteHit);
      for (const h of hits) {
        const p = h.getPose(ref);
        if (!p) continue;
        _m.fromArray(p.transform.matrix);
        _m.decompose(_pos, _quat, _scl);
        _n.set(0, 1, 0).applyQuaternion(_quat);
        if (_n.y > 0.85 && _pos.y < visor.transform.position.y - 0.5) {
          this.sueloY = this.sueloY === null ? _pos.y : Math.min(this.sueloY, _pos.y);
          break;
        }
      }
    }
    // Si no aparece, lo que diga el dispositivo, o una estimación.
    const espera = performance.now() - this.t0;
    if (this.sueloY === null && this.tipoRef === 'local-floor' && espera > 2500) this.sueloY = 0;
    if (this.sueloY === null && espera > 5000) {
      this.sueloY = visor.transform.position.y - LANZAMIENTO.alturaMovil;
    }

    if (this.sueloY !== null) {
      this._colocar(frame, ref, visor);
      return { estado: 'anclada' };
    }
    return { estado: 'buscando' };
  }
}
