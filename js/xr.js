/* ==========================================================================
   MODO LIBRE · WebXR
   Una cartela, un toque, y la obra se queda clavada en la sala.

   Aquí no se reconoce la imagen: el visitante apunta la retícula al centro
   de la cartela y toca la pantalla. El punto de impacto sobre la pared o el
   suelo, con su normal, define dónde está la cartela; de ahí, con la misma
   configuración que usa el modo imagen, sale dónde está la obra. Luego la
   obra se ancla al espacio (XRAnchor) y el SLAM del móvil la mantiene fija
   mientras el visitante camina, la rodea o mira a otro lado.

   Funciona en Android con Chrome. Safari en iPhone no expone WebXR en 2026,
   así que ahí la app cae al modo imagen.
   ========================================================================== */

import * as THREE from 'three';
import { MARCADORES, PALETA } from './config.js';

const _m = new THREE.Matrix4();
const _pos = new THREE.Vector3();
const _quat = new THREE.Quaternion();
const _scl = new THREE.Vector3();
const _n = new THREE.Vector3();
const _x = new THREE.Vector3();
const _y = new THREE.Vector3();
const _z = new THREE.Vector3();
const _cam = new THREE.Vector3();
const _ARRIBA = new THREE.Vector3(0, 1, 0);
const _GIRO_RETICULA = new THREE.Matrix4().makeRotationX(-Math.PI / 2);

export async function soportado() {
  if (!('xr' in navigator) || !navigator.xr) return false;
  try { return await navigator.xr.isSessionSupported('immersive-ar'); }
  catch { return false; }
}

/** Pose de la cartela dentro del sistema de la pieza, desde config. */
function poseMarcadorEnPieza(cfg) {
  const rot = new THREE.Euler(
    THREE.MathUtils.degToRad(cfg.rotacionDeg[0]),
    THREE.MathUtils.degToRad(cfg.rotacionDeg[1]),
    THREE.MathUtils.degToRad(cfg.rotacionDeg[2]),
    'XYZ'
  );
  return new THREE.Matrix4().compose(
    new THREE.Vector3(...cfg.posicion),
    new THREE.Quaternion().setFromEuler(rot),
    new THREE.Vector3(1, 1, 1)
  );
}

export class SesionLibre {
  /**
   * @param {object} o
   * @param {THREE.WebGLRenderer} o.renderer
   * @param {THREE.Scene} o.scene
   * @param {THREE.Object3D} o.raiz       raíz de la obra, en metros
   * @param {THREE.Object3D} o.fantasma   guía que se enseña antes de colocar
   * @param {HTMLElement} o.overlay       raíz del DOM que se ve sobre la AR
   * @param {Function} o.alColocar        callback cuando la obra queda anclada
   */
  constructor({ renderer, scene, raiz, fantasma, overlay, alColocar }) {
    this.renderer = renderer;
    this.scene = scene;
    this.raiz = raiz;
    this.fantasma = fantasma;
    this.overlay = overlay;
    this.alColocar = alColocar;

    this.raiz.matrixAutoUpdate = false;
    this.raiz.visible = false;

    this.sesion = null;
    this.refSpace = null;
    this.fuenteHit = null;
    this.ancla = null;
    this.colocada = false;
    this.poseFija = new THREE.Matrix4();   // por si no hay anclas
    this.ultimoHit = null;
    this.matrizCandidata = new THREE.Matrix4();
    this.hayCandidata = false;

    this.inversaMarcador = poseMarcadorEnPieza(MARCADORES[0]).invert();
    this._reticula();
  }

  /* Retícula: un aro fino en el verde de la obra con un punto en el centro,
     tumbado sobre la superficie que apunta la cámara. */
  _reticula() {
    const g = new THREE.Group();
    const aro = new THREE.Mesh(
      new THREE.RingGeometry(0.030, 0.036, 48),
      new THREE.MeshBasicMaterial({ color: PALETA.campo, transparent: true, opacity: 0.9,
                                    side: THREE.DoubleSide, depthTest: false })
    );
    const punto = new THREE.Mesh(
      new THREE.CircleGeometry(0.004, 16),
      new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.95,
                                    depthTest: false })
    );
    // Cuatro marcas de puntería, como en un visor.
    const marcas = new THREE.Group();
    for (let i = 0; i < 4; i++) {
      const m = new THREE.Mesh(
        new THREE.PlaneGeometry(0.014, 0.0016),
        new THREE.MeshBasicMaterial({ color: PALETA.campo, transparent: true, opacity: 0.7,
                                      side: THREE.DoubleSide, depthTest: false })
      );
      const a = (i / 4) * Math.PI * 2;
      m.position.set(Math.cos(a) * 0.052, Math.sin(a) * 0.052, 0);
      m.rotation.z = a;
      marcas.add(m);
    }
    g.add(aro, punto, marcas);
    g.matrixAutoUpdate = false;
    g.visible = false;
    g.renderOrder = 20;
    this.reticula = g;
    this.scene.add(g);
  }

  async iniciar() {
    const opciones = {
      requiredFeatures: ['hit-test'],
      optionalFeatures: ['local-floor', 'anchors', 'dom-overlay'],
      domOverlay: { root: this.overlay },
    };
    this.sesion = await navigator.xr.requestSession('immersive-ar', opciones);

    // local-floor si el dispositivo lo da; si no, local. Da igual para la
    // colocación, que va relativa al punto de impacto, pero three necesita
    // un tipo que exista.
    let tipoRef = 'local-floor';
    try { await this.sesion.requestReferenceSpace('local-floor'); }
    catch { tipoRef = 'local'; }
    this.renderer.xr.enabled = true;
    this.renderer.xr.setReferenceSpaceType(tipoRef);
    await this.renderer.xr.setSession(this.sesion);

    // Referencia del visor para lanzar el rayo de puntería desde la cámara.
    const viewer = await this.sesion.requestReferenceSpace('viewer');
    this.fuenteHit = await this.sesion.requestHitTestSource({ space: viewer });

    this.sesion.addEventListener('select', () => this._colocar());
    this.sesion.addEventListener('end', () => { this.sesion = null; this.alTerminar?.(); });
    return this.sesion;
  }

  terminar() { this.sesion?.end(); }

  /** Vuelve a pedir un punto: la obra desaparece hasta el siguiente toque. */
  recolocar() {
    this.colocada = false;
    if (this.ancla) { try { this.ancla.delete(); } catch {} this.ancla = null; }
    this.raiz.visible = false;
  }

  /* Del impacto sobre la superficie a la matriz de la obra. El eje Y del
     impacto es la normal de la superficie. Con esa normal y la vertical del
     mundo se monta el sistema de la cartela, y de ahí sale el de la pieza. */
  _matrizDesdeHit(matHit, camaraPos, destino) {
    matHit.decompose(_pos, _quat, _scl);
    _n.set(0, 1, 0).applyQuaternion(_quat).normalize();

    if (Math.abs(_n.dot(_ARRIBA)) < 0.6) {
      // Pared: la cartela mira hacia fuera, su arriba es el arriba del mundo.
      _z.copy(_n);
      _x.crossVectors(_ARRIBA, _z).normalize();
      _y.crossVectors(_z, _x).normalize();
    } else {
      // Suelo o peana: la cartela mira hacia arriba y su cabecera queda
      // lejos del visitante, como se lee de pie delante de ella.
      _z.copy(_ARRIBA);
      _y.copy(camaraPos).sub(_pos); _y.y = 0;
      if (_y.lengthSq() < 1e-6) _y.set(0, 0, 1);
      _y.normalize().negate();
      _x.crossVectors(_y, _z).normalize();
    }
    destino.makeBasis(_x, _y, _z);
    destino.setPosition(_pos);
    destino.multiply(this.inversaMarcador);
    return destino;
  }

  _colocar() {
    if (!this.hayCandidata) return;
    this.colocada = true;
    this.poseFija.copy(this.matrizCandidata);
    this.raiz.matrix.copy(this.poseFija);
    this.raiz.matrixWorldNeedsUpdate = true;
    this.raiz.visible = true;
    this.reticula.visible = false;
    this.fantasma.visible = false;

    // Ancla del espacio: el SLAM la corrige sola si el mapa se ajusta.
    if (this.ultimoHit && typeof this.ultimoHit.createAnchor === 'function') {
      this.ultimoHit.createAnchor().then((a) => { this.ancla = a; }).catch(() => {});
      // La obra no está exactamente en el punto de impacto: guardamos el
      // desplazamiento entre el ancla (el impacto) y la obra.
      this.offsetAncla = new THREE.Matrix4()
        .copy(this.matrizHitCandidata).invert().multiply(this.matrizCandidata);
    }
    this.alColocar?.();
  }

  /**
   * Una vez por fotograma con el XRFrame que da three.
   * @returns {{estado:string}}
   */
  actualizar(frame, camara) {
    if (!frame || !this.sesion) return { estado: 'buscando' };
    const ref = this.renderer.xr.getReferenceSpace();
    if (!ref) return { estado: 'buscando' };

    if (this.colocada) {
      // Con ancla, seguimos el ancla; sin ella, la pose fija en local-floor.
      if (this.ancla && frame.trackedAnchors?.has(this.ancla)) {
        const p = frame.getPose(this.ancla.anchorSpace, ref);
        if (p) {
          _m.fromArray(p.transform.matrix);
          this.raiz.matrix.multiplyMatrices(_m, this.offsetAncla);
          this.raiz.matrixWorldNeedsUpdate = true;
        }
      }
      return { estado: 'anclada' };
    }

    // Apuntando: retícula y fantasma de la obra en el punto candidato.
    const hits = frame.getHitTestResults(this.fuenteHit);
    if (hits.length > 0) {
      const hit = hits[0];
      const pose = hit.getPose(ref);
      if (pose) {
        _m.fromArray(pose.transform.matrix);
        this.matrizHitCandidata = this.matrizHitCandidata || new THREE.Matrix4();
        this.matrizHitCandidata.copy(_m);
        this.reticula.matrix.multiplyMatrices(_m, _GIRO_RETICULA);
        this.reticula.matrixWorldNeedsUpdate = true;
        this.reticula.visible = true;

        camara.getWorldPosition(_cam);
        this._matrizDesdeHit(_m, _cam, this.matrizCandidata);
        this.fantasma.matrix.copy(this.matrizCandidata);
        this.fantasma.matrixWorldNeedsUpdate = true;
        this.fantasma.visible = true;
        this.hayCandidata = true;
        this.ultimoHit = hit;
        return { estado: 'apuntando' };
      }
    }
    this.reticula.visible = false;
    this.fantasma.visible = false;
    this.hayCandidata = false;
    return { estado: 'buscando' };
  }
}
