/* ==========================================================================
   GUÍA DE LA PIEZA FÍSICA
   Un calco en alambre de los dos tubos y los diez bloques. No es contenido de
   la obra: sirve para comprobar en sala que la AR encaja con lo que hay
   delante. Si el alambre se pega al cobre, la calibración está bien.
   ========================================================================== */

import * as THREE from 'three';
import { PIEZA, PALETA } from './config.js';

export function crearGuia() {
  const g = new THREE.Group();
  const L = PIEZA.largoTubo;
  const a = PIEZA.separacionTubos / 2;

  const matTubo = new THREE.MeshBasicMaterial({
    color: PALETA.cobre, wireframe: true, transparent: true, opacity: 0.55,
  });
  const geoTubo = new THREE.CylinderGeometry(PIEZA.radioTubo, PIEZA.radioTubo, L, 10, 1, true);
  geoTubo.rotateZ(Math.PI / 2);

  for (const s of [-1, 1]) {
    const t = new THREE.Mesh(geoTubo, matTubo);
    t.position.set(0, 0, s * a);
    g.add(t);
  }

  const matBloque = new THREE.MeshBasicMaterial({
    color: PALETA.hito, wireframe: true, transparent: true, opacity: 0.35,
  });
  const b = PIEZA.bloque;
  const geoBloque = new THREE.BoxGeometry(b.largo, b.alto, b.fondo);
  for (let i = 0; i < PIEZA.nBloques; i++) {
    const xn = PIEZA.nBloques === 1 ? 0.5 : i / (PIEZA.nBloques - 1);
    const m = new THREE.Mesh(geoBloque, matBloque);
    m.position.set((xn - 0.5) * PIEZA.recorrido, -b.alto / 2 - PIEZA.radioTubo, 0);
    g.add(m);
  }

  // Ejes del sistema de la pieza, para orientarse durante la calibración.
  const ejes = new THREE.AxesHelper(0.15);
  ejes.material.transparent = true;
  ejes.material.opacity = 0.8;
  g.add(ejes);

  return g;
}

/** Rectángulos donde deberían estar los marcadores, para verificar el montaje. */
export function crearFantasmasMarcadores(marcadores) {
  const g = new THREE.Group();
  for (const cfg of marcadores) {
    const alto = cfg.anchoImpreso * 0.707;   // proporción A4 aproximada
    const geo = new THREE.PlaneGeometry(cfg.anchoImpreso, alto);
    const bordes = new THREE.LineSegments(
      new THREE.EdgesGeometry(geo),
      new THREE.LineBasicMaterial({ color: PALETA.claiming, transparent: true, opacity: 0.9 })
    );
    bordes.position.set(...cfg.posicion);
    bordes.rotation.set(
      THREE.MathUtils.degToRad(cfg.rotacionDeg[0]),
      THREE.MathUtils.degToRad(cfg.rotacionDeg[1]),
      THREE.MathUtils.degToRad(cfg.rotacionDeg[2]),
      'XYZ'
    );
    bordes.userData.id = cfg.id;
    g.add(bordes);
    geo.dispose();
  }
  return g;
}
