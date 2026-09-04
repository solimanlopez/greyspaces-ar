import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { CAPAS, PIEZA } from '../js/config.js';
import { CampoRF } from '../js/rf-field.js';
import { Asteroide } from '../js/psyche.js';
import { crearGuia } from '../js/piece.js';

function nivelLlegada(t) { return t < 0.96 ? 0 : Math.min(1, (t - 0.96) / 0.30); }

export function montar(contenedor, opciones = {}) {
  const capas = Object.assign({}, CAPAS, opciones.capas || {});
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  contenedor.appendChild(renderer.domElement);
  renderer.domElement.style.cssText = 'width:100%;height:100%;display:block';

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0b0d0f);
  const camera = new THREE.PerspectiveCamera(38, 1, 0.05, 60);
  camera.position.set(1.06, 0.66, 2.28);

  const raiz = new THREE.Group();
  const guia = crearGuia(); guia.visible = !!capas.guia; raiz.add(guia);
  const campo = new CampoRF(capas); raiz.add(campo.grupo);
  const ast = new Asteroide(); ast.grupo.visible = capas.psyche !== false; raiz.add(ast.grupo);
  scene.add(raiz);

  const ctr = new OrbitControls(camera, renderer.domElement);
  ctr.target.set(0, 0.18, 0);
  ctr.enableDamping = true;
  ctr.autoRotate = true;
  ctr.autoRotateSpeed = 0.4;
  ctr.minDistance = 0.9; ctr.maxDistance = 9;

  function medir() {
    const r = contenedor.getBoundingClientRect();
    camera.aspect = r.width / Math.max(r.height, 1);
    camera.updateProjectionMatrix();
    renderer.setSize(r.width, r.height, false);
  }
  medir();
  new ResizeObserver(medir).observe(contenedor);

  let anterior = performance.now();
  renderer.setAnimationLoop(() => {
    const ahora = performance.now();
    const dt = Math.min((ahora - anterior) / 1000, 0.1);
    anterior = ahora;
    const t = ahora / 1000;
    ctr.update();
    const esc = renderer.domElement.height / 500;
    campo.actualizar(t, dt, camera, 1);
    ast.actualizar(t, dt, camera, 1, nivelLlegada(campo.tPaquete), esc);
    renderer.render(scene, camera);
  });

  return {
    capa(nombre, valor) {
      capas[nombre] = valor;
      if (nombre === 'guia') guia.visible = valor;
      else if (nombre === 'psyche') ast.grupo.visible = valor;
      else campo.aplicarCapas(capas);
    },
    recorrido: PIEZA.recorrido,
  };
}
