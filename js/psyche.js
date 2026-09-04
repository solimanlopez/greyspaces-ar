/* ==========================================================================
   16 PSYCHE
   El asteroide flotando en el centro de la obra.

   Si existe models/psyche.glb se carga ese (el modelo bueno del pipeline de
   IRIDIA). Si no, se genera aquí uno procedural con la silueta triaxial real
   y cráteres tallados, sin depender de ninguna textura externa.
   ========================================================================== */

import * as THREE from 'three';
import { PSYCHE, PALETA, PIEZA } from './config.js';

/* --- ruido de valor con fBm, suficiente para desplazar una malla ---------- */
function hash3(x, y, z) {
  let h = x * 374761393 + y * 668265263 + z * 2147483647;
  h = (h ^ (h >> 13)) * 1274126177;
  return ((h ^ (h >> 16)) >>> 0) / 4294967295;
}
function suave(t) { return t * t * (3 - 2 * t); }
function ruido(x, y, z) {
  const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z);
  const xf = x - xi, yf = y - yi, zf = z - zi;
  const u = suave(xf), v = suave(yf), w = suave(zf);
  let r = 0;
  for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) for (let k = 0; k < 2; k++) {
    const p = hash3(xi + i, yi + j, zi + k);
    const wx = i ? u : 1 - u, wy = j ? v : 1 - v, wz = k ? w : 1 - w;
    r += p * wx * wy * wz;
  }
  return r * 2 - 1;
}
function fbm(x, y, z, octavas = 5) {
  let a = 0.5, f = 1, s = 0, norm = 0;
  for (let i = 0; i < octavas; i++) {
    s += a * ruido(x * f, y * f, z * f);
    norm += a; a *= 0.5; f *= 2.03;
  }
  return s / norm;
}

/* --- cráteres ------------------------------------------------------------ */
function generarCrateres(n, semilla = 7) {
  const c = [];
  let s = semilla;
  const rnd = () => { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x7fffffff; };
  for (let i = 0; i < n; i++) {
    const u = rnd() * 2 - 1, th = rnd() * Math.PI * 2;
    const r = Math.sqrt(1 - u * u);
    // Los dos primeros son las grandes depresiones de Psyche.
    const radio = i < 2 ? 0.42 + rnd() * 0.16 : 0.05 + Math.pow(rnd(), 2.2) * 0.22;
    c.push({
      dir: new THREE.Vector3(r * Math.cos(th), u, r * Math.sin(th)),
      radio,
      profundidad: radio * (0.22 + rnd() * 0.18),
    });
  }
  return c;
}

export function asteroideProcedural(detalle = 5) {
  const g = new THREE.IcosahedronGeometry(1, detalle);
  g.deleteAttribute('uv');
  const pos = g.attributes.position;
  const crateres = generarCrateres(30);
  const v = new THREE.Vector3();
  const colores = [];
  const base = new THREE.Color(PALETA.psyche);
  const claro = new THREE.Color(0x9aa0a6);
  const oscuro = new THREE.Color(0x33373b);

  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i).normalize();

    // Relieve general.
    let r = 1
      + fbm(v.x * 1.6, v.y * 1.6, v.z * 1.6, 3) * 0.16
      + fbm(v.x * 4.4, v.y * 4.4, v.z * 4.4, 4) * 0.055
      + fbm(v.x * 13.0, v.y * 13.0, v.z * 13.0, 3) * 0.020
      + fbm(v.x * 31.0, v.y * 31.0, v.z * 31.0, 2) * 0.007;

    // Cráteres: cuenco con borde levantado.
    let marca = 0;
    for (const c of crateres) {
      const d = v.angleTo(c.dir) / c.radio;
      if (d < 1.35) {
        const cuenco = -c.profundidad * (1 - d * d) * Math.exp(-d * d * 0.8);
        const borde = c.profundidad * 0.42 * Math.exp(-Math.pow((d - 1.0) * 4.0, 2));
        r += cuenco + borde;
        marca = Math.max(marca, 1 - Math.min(d, 1));
      }
    }

    // Elipsoide triaxial de 16 Psyche.
    v.multiplyScalar(r);
    v.x *= PSYCHE.ejes[0];
    v.y *= PSYCHE.ejes[2];
    v.z *= PSYCHE.ejes[1];
    pos.setXYZ(i, v.x, v.y, v.z);

    const t = 0.5 + 0.5 * fbm(v.x * 7, v.y * 7, v.z * 7, 3);
    const c = base.clone().lerp(claro, t * 0.55).lerp(oscuro, marca * 0.55);
    colores.push(c.r, c.g, c.b);
  }

  g.setAttribute('color', new THREE.Float32BufferAttribute(colores, 3));
  g.computeVertexNormals();
  g.computeBoundingSphere();

  const mat = new THREE.MeshStandardMaterial({
    vertexColors: true,
    metalness: 0.55,     // Psyche es de tipo M, rica en metal
    roughness: 0.78,
    flatShading: false,
  });
  return new THREE.Mesh(g, mat);
}

export class Asteroide {
  constructor() {
    this.grupo = new THREE.Group();
    this.grupo.position.set(...PSYCHE.posicion);

    this.pivote = new THREE.Group();
    this.pivote.rotation.z = THREE.MathUtils.degToRad(PSYCHE.inclinacionEje);
    this.grupo.add(this.pivote);

    this.cuerpo = asteroideProcedural(5);
    this._escalar(this.cuerpo);
    this.pivote.add(this.cuerpo);

    this._halo();
    this._enlace();

    // Las luces viven dentro del grupo del asteroide y apuntan a su centro,
    // así la iluminación no cambia al girar alrededor de la obra.
    this.luces = new THREE.Group();
    const diana = new THREE.Object3D();
    const key = new THREE.DirectionalLight(0xffffff, 2.1);
    key.position.set(0.6, 0.9, 0.8);
    key.target = diana;
    const rim = new THREE.DirectionalLight(0x8fd8ff, 1.3);
    rim.position.set(-0.8, -0.2, -0.7);
    rim.target = diana;
    const amb = new THREE.HemisphereLight(0xa8c4d4, 0x2a2c30, 0.55);
    amb.position.set(0, 1, 0);
    this.luces.add(diana, key, rim, amb);
    this.grupo.add(this.luces);

    this.cargarGLB();
  }

  _escalar(obj) {
    const caja = new THREE.Box3().setFromObject(obj);
    const t = caja.getSize(new THREE.Vector3());
    const k = PSYCHE.diametro / Math.max(t.x, t.y, t.z);
    obj.scale.setScalar(k);
    caja.getCenter(t);
    obj.position.sub(t.multiplyScalar(k));
  }

  /** Halo de recepción: se enciende cuando llega la señal. */
  _halo() {
    const g = new THREE.PlaneGeometry(PSYCHE.diametro * 3.2, PSYCHE.diametro * 3.2);
    this.matHalo = new THREE.ShaderMaterial({
      uniforms: {
        uNivel: { value: 0 },
        uOpacidad: { value: 1 },
        uColor: { value: new THREE.Color(PALETA.campo) },
      },
      vertexShader: `varying vec2 vUv; void main(){ vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
      fragmentShader: /* glsl */`
        precision mediump float;
        varying vec2 vUv;
        uniform float uNivel; uniform float uOpacidad; uniform vec3 uColor;
        void main() {
          float d = length(vUv - 0.5) * 2.0;
          // Anillo que se expande al recibir la señal.
          float anillo = exp(-pow((d - uNivel * 1.05) * 9.0, 2.0)) * (1.0 - uNivel);
          float aura = exp(-d * d * 3.2) * 0.35 * sin(uNivel * 3.14159);
          float a = (anillo + aura) * smoothstep(0.0, 0.06, uNivel);
          a *= smoothstep(1.0, 0.72, d);
          gl_FragColor = vec4(uColor, a * 0.75 * uOpacidad);
        }`,
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    });
    this.halo = new THREE.Mesh(g, this.matHalo);
    this.halo.frustumCulled = false;
    this.grupo.add(this.halo);
  }

  /** Enlace: partículas que suben del eje de la línea hasta el asteroide. */
  _enlace() {
    const N = 220;
    const pos = new Float32Array(N * 3);
    const off = new Float32Array(N);
    const lat = new Float32Array(N);
    for (let i = 0; i < N; i++) {
      off[i] = Math.random();
      lat[i] = (Math.random() * 2 - 1);
      pos[i * 3] = 0; pos[i * 3 + 1] = 0; pos[i * 3 + 2] = 0;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('aOff', new THREE.BufferAttribute(off, 1));
    g.setAttribute('aLat', new THREE.BufferAttribute(lat, 1));

    this.matEnlace = new THREE.ShaderMaterial({
      uniforms: {
        uTiempo: { value: 0 },
        uOpacidad: { value: 1 },
        uAlto: { value: PSYCHE.posicion[1] },
        uAncho: { value: PIEZA.recorrido * 0.30 },
        uColor: { value: new THREE.Color(PALETA.campo) },
        uEscala: { value: 1 },
      },
      vertexShader: /* glsl */`
        attribute float aOff; attribute float aLat;
        uniform float uTiempo; uniform float uAlto; uniform float uAncho;
        uniform float uEscala;
        varying float vI;
        void main() {
          float t = fract(uTiempo * 0.11 + aOff);
          // Sube desde la línea y converge hacia el asteroide.
          float y = -uAlto + t * uAlto;
          float x = aLat * uAncho * (1.0 - t) * (1.0 - t);
          float z = sin(aOff * 43.0) * uAncho * 0.35 * (1.0 - t) * (1.0 - t);
          vec3 p = vec3(x, y, z);
          vI = smoothstep(0.0, 0.15, t) * (1.0 - smoothstep(0.82, 1.0, t));
          vec4 mv = modelViewMatrix * vec4(p, 1.0);
          float s = (2.0 + 5.0 * vI) * uEscala / max(-mv.z, 0.001);
          gl_PointSize = clamp(s, 1.0, 22.0);
          gl_Position = projectionMatrix * mv;
        }`,
      fragmentShader: /* glsl */`
        precision mediump float;
        uniform vec3 uColor; uniform float uOpacidad; varying float vI;
        void main() {
          float d = length(gl_PointCoord - 0.5) * 2.0;
          if (d > 1.0) discard;
          gl_FragColor = vec4(uColor, (1.0 - d) * vI * 0.65 * uOpacidad);
        }`,
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    });
    this.enlace = new THREE.Points(g, this.matEnlace);
    this.enlace.frustumCulled = false;
    this.grupo.add(this.enlace);
  }

  /** Sustituye el asteroide procedural por el GLB si está disponible. */
  async cargarGLB() {
    try {
      const { GLTFLoader } = await import('three/addons/loaders/GLTFLoader.js');
      const gltf = await new GLTFLoader().loadAsync(PSYCHE.glb);
      const modelo = gltf.scene;
      modelo.traverse((o) => {
        if (o.isMesh && o.material && o.material.isMeshStandardMaterial) {
          o.material.metalness = Math.max(o.material.metalness, 0.5);
          o.material.roughness = Math.min(Math.max(o.material.roughness, 0.6), 0.9);
        }
      });
      this._escalar(modelo);
      this.pivote.remove(this.cuerpo);
      this.cuerpo.geometry.dispose();
      this.cuerpo.material.dispose();
      this.cuerpo = modelo;
      this.pivote.add(modelo);
      console.info('[psyche] usando models/psyche.glb');
    } catch (e) {
      console.info('[psyche] sin GLB, se usa el asteroide procedural');
    }
  }

  /**
   * @param {number} t segundos
   * @param {number} llegada 0..1, cuánta señal está llegando ahora
   */
  actualizar(t, dt, camara, opacidad = 1, llegada = 0, escalaPixel = 1) {
    this.pivote.rotation.y = (t / PSYCHE.periodoRotacion) * Math.PI * 2;
    // Ligera libración, para que no parezca un giro de motor.
    this.pivote.rotation.x = Math.sin(t * 0.13) * 0.05;

    this.nivel = (this.nivel || 0) + (llegada - (this.nivel || 0)) * 0.08;
    this.matHalo.uniforms.uNivel.value = this.nivel;
    this.matHalo.uniforms.uOpacidad.value = opacidad;
    if (camara) this.halo.quaternion.copy(camara.quaternion);

    this.matEnlace.uniforms.uTiempo.value = t;
    this.matEnlace.uniforms.uOpacidad.value = opacidad;
    this.matEnlace.uniforms.uEscala.value = escalaPixel;
  }
}
