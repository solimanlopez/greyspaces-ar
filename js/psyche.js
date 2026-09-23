/* ==========================================================================
   16 PSYCHE
   El asteroide flotando en el centro de la obra.

   Si existe models/psyche.glb se carga ese (el modelo bueno del pipeline de
   IRIDIA). Si no, se genera aquí uno procedural con la silueta triaxial real
   y cráteres tallados, sin depender de ninguna textura externa.
   ========================================================================== */

import * as THREE from 'three';
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';
import { PSYCHE, PALETA, PIEZA, RENDIMIENTO, CALIDAD } from './config.js';

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
  // La icoesfera de three viene sin índices, con cada cara suelta: si se
  // desplaza así, las normales salen por cara y el asteroide se ve facetado.
  // Soldar los vértices antes de desplazar da normales suaves de verdad.
  let g = new THREE.IcosahedronGeometry(1, detalle);
  g.deleteAttribute('uv');
  g = mergeVertices(g, 1e-4);
  const pos = g.attributes.position;
  const crateres = generarCrateres(30);
  const v = new THREE.Vector3();
  const colores = [];
  const base = new THREE.Color(0x4f5358);
  const claro = new THREE.Color(0x9aa0a6);
  const oscuro = new THREE.Color(0x1f2225);

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
    metalness: 0.78,     // Psyche es de tipo M, rica en metal
    roughness: 0.64,
    envMapIntensity: 0.5, // hierro oscuro, no aluminio pulido
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

    // Más malla en móviles buenos: el relieve deja de verse facetado.
    this.cuerpo = asteroideProcedural(CALIDAD === 'alta' ? 6 : 5);
    this._escalar(this.cuerpo);
    this.pivote.add(this.cuerpo);
    this._aro(this.cuerpo);

    this._halo();
    this._enlace();

    // Materialización: 0 = nada, 1 = entera.
    this._nacer = 1;
    this.nivel = 0;

    // Las luces viven dentro del grupo del asteroide y apuntan a su centro,
    // así la iluminación no cambia al girar alrededor de la obra.
    this.luces = new THREE.Group();
    const diana = new THREE.Object3D();
    const key = new THREE.DirectionalLight(0xffffff, 2.1);
    key.position.set(0.6, 0.9, 0.8);
    key.target = diana;
    // La luz de borde es la del campo: el asteroide recibe la señal por detrás.
    const rim = new THREE.DirectionalLight(PALETA.campo, 1.1);
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

  /**
   * Aro de recepción: una piel fresnel verde sobre el propio cuerpo, apenas
   * visible en reposo, que se enciende cuando llega la señal, y un barrido
   * que recorre la superficie de abajo arriba en el momento de la llegada.
   * Va como hijo del cuerpo para heredar su escala y su giro.
   */
  _aro(cuerpo) {
    if (this.aro) { this.aro.parent?.remove(this.aro); }
    const geo = cuerpo.geometry;
    this.matAro = new THREE.ShaderMaterial({
      uniforms: {
        uNivel: { value: 0 },
        uOpacidad: { value: 1 },
        uTiempo: { value: 0 },
        uColor: { value: new THREE.Color(PALETA.campo) },
      },
      vertexShader: /* glsl */`
        varying vec3 vN; varying vec3 vV; varying float vY;
        void main() {
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          vN = normalize(normalMatrix * normal);
          vV = normalize(-mv.xyz);
          vY = position.y;
          gl_Position = projectionMatrix * mv;
        }`,
      fragmentShader: /* glsl */`
        precision mediump float;
        varying vec3 vN; varying vec3 vV; varying float vY;
        uniform float uNivel; uniform float uOpacidad; uniform float uTiempo;
        uniform vec3 uColor;
        void main() {
          float f = pow(1.0 - abs(dot(normalize(vN), normalize(vV))), 2.6);
          // Reposo: un filo tenue. Llegada: el filo sube y un barrido cruza.
          float base = f * (0.12 + 0.28 * uNivel);
          float y = vY;                                  // ~ -1..1 en el cuerpo
          float frente = (uNivel * 2.4 - 1.2);
          float barrido = exp(-pow((y - frente) * 3.2, 2.0)) * smoothstep(0.0, 0.08, uNivel) * (1.0 - uNivel * 0.6);
          // Un latido lento, para que nunca esté del todo quieto.
          base *= 0.85 + 0.15 * sin(uTiempo * 1.7);
          gl_FragColor = vec4(uColor, (base + barrido * 0.22) * uOpacidad);
        }`,
      transparent: true, depthWrite: false, blending: THREE.NormalBlending,
    });
    this.aro = new THREE.Mesh(geo, this.matAro);
    this.aro.scale.setScalar(1.012);
    cuerpo.add(this.aro);
  }

  /** Materialización de la obra: 0 = nada, 1 = entera. */
  set nacer(v) {
    this._nacer = v;
    // Crece desde nada con un pequeño rebote al final.
    const t = Math.max(0, Math.min(1, v));
    const e = t < 1 ? 1 - Math.pow(1 - t, 3) : 1;
    const rebote = t < 1 ? Math.sin(t * Math.PI) * 0.12 * (1 - t) : 0;
    this.grupo.scale.setScalar(Math.max(0.0001, e + rebote));
  }
  get nacer() { return this._nacer; }

  /** Halo de recepción: se enciende cuando llega la señal. */
  _halo() {
    const g = new THREE.PlaneGeometry(PSYCHE.diametro * 2.4, PSYCHE.diametro * 2.4);
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
          // Una línea nítida, no un resplandor: banda de borde duro.
          float r = uNivel * 1.05;
          float anillo = (smoothstep(r - 0.022, r - 0.012, d) - smoothstep(r + 0.012, r + 0.022, d)) * (1.0 - uNivel);
          float a = anillo * smoothstep(0.0, 0.06, uNivel);
          a *= smoothstep(1.0, 0.72, d);
          gl_FragColor = vec4(uColor, a * 0.85 * uOpacidad);
        }`,
      transparent: true, depthWrite: false, blending: THREE.NormalBlending,
    });
    this.halo = new THREE.Mesh(g, this.matHalo);
    this.halo.frustumCulled = false;
    this.grupo.add(this.halo);
  }

  /** Enlace: partículas que suben del eje de la línea hasta el asteroide. */
  _enlace() {
    const N = RENDIMIENTO.enlace;
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
        uOrigen: { value: new THREE.Vector3(-PSYCHE.posicion[0], -PSYCHE.posicion[1], -PSYCHE.posicion[2]) },
        uAncho: { value: PIEZA.recorrido * 0.30 },
        uColor: { value: new THREE.Color(PALETA.campo) },
        uEscala: { value: 1 },
      },
      vertexShader: /* glsl */`
        attribute float aOff; attribute float aLat;
        uniform float uTiempo; uniform vec3 uOrigen; uniform float uAncho;
        uniform float uEscala;
        varying float vI;
        void main() {
          float t = fract(uTiempo * 0.11 + aOff);
          // Parte de la línea, repartido a lo largo de ella, y converge hacia
          // el asteroide esté donde esté, con una comba hacia arriba.
          vec3 salida = uOrigen + vec3(aLat * uAncho, 0.0, sin(aOff * 43.0) * 0.05);
          float s = t * t * (3.0 - 2.0 * t);
          vec3 p = mix(salida, vec3(0.0), s);
          p.y += sin(t * 3.14159) * 0.25 * length(uOrigen) * 0.2;
          vI = smoothstep(0.0, 0.15, t) * (1.0 - smoothstep(0.82, 1.0, t));
          vec4 mv = modelViewMatrix * vec4(p, 1.0);
          float tam = (2.0 + 5.0 * vI) * uEscala / max(-mv.z, 0.001);
          gl_PointSize = clamp(tam, 1.0, 22.0);
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
      transparent: true, depthWrite: false, blending: THREE.NormalBlending,
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
      // El aro de recepción se rehace sobre la malla mayor del GLB.
      let mayor = null, nMax = 0;
      modelo.traverse((o) => {
        if (o.isMesh && o.geometry?.attributes?.position?.count > nMax) {
          nMax = o.geometry.attributes.position.count; mayor = o;
        }
      });
      if (mayor) this._aro(mayor);
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
    // Tumbado lento en dos ejes, para que no parezca un giro de motor.
    this.pivote.rotation.x = Math.sin(t * 0.13) * 0.06;
    this.pivote.rotation.z = THREE.MathUtils.degToRad(PSYCHE.inclinacionEje) + Math.sin(t * 0.09) * 0.04;

    // La llegada sube rápido y baja despacio.
    const k = llegada > this.nivel ? 0.10 : 0.035;
    this.nivel += (llegada - this.nivel) * k;
    this.matHalo.uniforms.uNivel.value = this.nivel;
    this.matHalo.uniforms.uOpacidad.value = opacidad;
    this.matAro.uniforms.uNivel.value = this.nivel;
    this.matAro.uniforms.uOpacidad.value = opacidad;
    this.matAro.uniforms.uTiempo.value = t;
    if (camara) this.halo.quaternion.copy(camara.quaternion);

    this.matEnlace.uniforms.uTiempo.value = t;
    this.matEnlace.uniforms.uOpacidad.value = opacidad;
    this.matEnlace.uniforms.uEscala.value = escalaPixel;
  }
}
