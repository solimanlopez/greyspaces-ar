/* ==========================================================================
   CAMPO DE RADIOFRECUENCIA
   Lo que circula por los dos tubos de cobre y no se ve.

   Cuatro capas, todas animadas en la GPU a partir de un único uniform de
   tiempo. En el móvil no se recalcula ni un vértice por fotograma.

     1. campo cercano   arcos de campo eléctrico entre los dos conductores,
                        la solución bipolar clásica de una línea de dos hilos
     2. estacionaria    envolvente de tensión y corriente a lo largo de la
                        línea, con sus nodos y sus vientres
     3. radiación       frentes cilíndricos que se desprenden hacia la sala
     4. paquete         el pulso que recorre los diez hitos de distancia
   ========================================================================== */

import * as THREE from 'three';
import { PIEZA, SENAL, PALETA, HITOS, C_LUZ_KMS, RENDIMIENTO } from './config.js';

const GAMMA = (SENAL.roe - 1) / (SENAL.roe + 1);   // coeficiente de reflexión
const K_VIS = (2 * Math.PI * SENAL.ciclosVisibles); // número de onda en x normalizado

/* Trozo de GLSL compartido: envolvente y fase de la onda estacionaria.
   x llega normalizado 0..1 a lo largo del recorrido. */
const GLSL_ONDA = /* glsl */`
  uniform float uTiempo;
  uniform float uGamma;
  uniform float uK;
  uniform float uVel;
  uniform float uNacer;

  float envolvente(float x) {
    // |1 + G·e^{-2ikx}| normalizado a 0..1
    float c = cos(2.0 * uK * x);
    float e = sqrt(1.0 + uGamma * uGamma + 2.0 * uGamma * c);
    return e / (1.0 + uGamma);
  }
  float fase(float x) {
    return sin(uK * x - uTiempo * uVel);
  }
  // Desvanecido suave en los dos extremos del recorrido, y la materialización:
  // al anclarse, la obra se dibuja de un extremo al otro en vez de aparecer
  // de golpe. uNacer va de 0 a 1 en un par de segundos y luego se queda en 1.
  float extremos(float x) {
    float bordes = smoothstep(0.0, 0.06, x) * smoothstep(1.0, 0.94, x);
    float frente = uNacer * 1.3 - x;
    float nacer = smoothstep(0.0, 0.22, frente);
    // Un filo brillante justo en el frente de la materialización.
    float filo = exp(-frente * frente * 90.0) * (1.0 - step(1.0, uNacer)) * 2.5;
    return bordes * (nacer + filo);
  }
  // Igual pero sin el filo: para lo que mueve geometría, no brillo.
  float revelado(float x) {
    float bordes = smoothstep(0.0, 0.06, x) * smoothstep(1.0, 0.94, x);
    return bordes * smoothstep(0.0, 0.22, uNacer * 1.3 - x);
  }
`;

export class CampoRF {
  constructor(capas) {
    this.capas = capas;
    this.grupo = new THREE.Group();
    this.uniformes = {
      uTiempo: { value: 0 },
      uGamma: { value: GAMMA },
      uK: { value: K_VIS },
      uVel: { value: 2.4 },
      uOpacidad: { value: 1 },
      uPaquete: { value: -1 },   // posición del pulso, 0..1; <0 = apagado
      uNacer: { value: 1 },      // materialización, 0..1
    };

    this.L = PIEZA.recorrido;
    this.a = PIEZA.separacionTubos / 2;

    this._campoCercano();
    this._ondaEstacionaria();
    this._radiacion();
    this._paquete();

    this.aplicarCapas(capas);
  }

  /* ---------------------------------------------------------------------
     1. CAMPO CERCANO
     En cada plano transversal, las líneas de campo entre dos conductores
     paralelos son arcos de circunferencia que pasan por ambos. Se generan
     unos cuantos planos a lo largo del recorrido y se modulan por la
     envolvente de la onda.
     --------------------------------------------------------------------- */
  _campoCercano() {
    const PLANOS = RENDIMIENTO.planos;
    const ARCOS = RENDIMIENTO.arcos;   // por lado
    const SEG = RENDIMIENTO.segmentos;
    const a = this.a;

    const pos = [];
    const attrX = [];        // posición normalizada a lo largo del recorrido
    const attrPeso = [];     // qué cerca del conductor está la línea

    for (let p = 0; p < PLANOS; p++) {
      const xn = p / (PLANOS - 1);
      const x = (xn - 0.5) * this.L;

      for (let s = -1; s <= 1; s += 2) {
        for (let k = 0; k < ARCOS; k++) {
          // v0 controla lo abierto que sale el arco.
          const t = (k + 1) / (ARCOS + 1);
          const v0 = s * a * (0.22 + Math.pow(t, 1.8) * 4.2);
          const r = Math.hypot(a, v0);
          // Ángulos de los dos conductores vistos desde el centro del arco.
          const th0 = Math.atan2(0 - v0, -a);
          const th1 = Math.atan2(0 - v0, a);
          let d = th1 - th0;
          if (s > 0) { if (d < 0) d += Math.PI * 2; } else { if (d > 0) d -= Math.PI * 2; }

          const peso = 1 - t * 0.72;
          for (let i = 0; i < SEG; i++) {
            for (const j of [i, i + 1]) {
              const th = th0 + d * (j / SEG);
              // Plano transversal: y arriba, z hacia el espectador.
              const z = Math.cos(th) * r;
              const y = v0 + Math.sin(th) * r;
              pos.push(x, y, z);
              attrX.push(xn);
              attrPeso.push(peso);
            }
          }
        }
      }
    }

    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('aX', new THREE.Float32BufferAttribute(attrX, 1));
    g.setAttribute('aPeso', new THREE.Float32BufferAttribute(attrPeso, 1));

    const mat = new THREE.ShaderMaterial({
      uniforms: {
        ...this.uniformes,
        uColor: { value: new THREE.Color(PALETA.campo) },
        uColorAlto: { value: new THREE.Color(PALETA.campoAlto) },
      },
      vertexShader: /* glsl */`
        attribute float aX;
        attribute float aPeso;
        varying float vI;
        ${GLSL_ONDA}
        uniform float uPaquete;
        void main() {
          float e = envolvente(aX);
          float f = abs(fase(aX));
          float i = e * (0.30 + 0.70 * f) * aPeso * extremos(aX);
          // El pulso que recorre la pieza enciende el campo a su paso.
          if (uPaquete >= 0.0) {
            float d = abs(aX - uPaquete);
            i += exp(-d * d / 0.0016) * aPeso * 1.5;
          }
          vI = i;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }`,
      fragmentShader: /* glsl */`
        precision mediump float;
        uniform vec3 uColor;
        uniform vec3 uColorAlto;
        uniform float uOpacidad;
        varying float vI;
        void main() {
          float i = clamp(vI, 0.0, 2.0);
          vec3 c = mix(uColor, uColorAlto, smoothstep(0.75, 1.6, i));
          gl_FragColor = vec4(c, clamp(i, 0.0, 1.0) * 0.55 * uOpacidad);
        }`,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    this.mallaCampo = new THREE.LineSegments(g, mat);
    this.mallaCampo.frustumCulled = false;
    this.grupo.add(this.mallaCampo);
  }

  /* ---------------------------------------------------------------------
     2. ONDA ESTACIONARIA
     Dos cintas cruzadas, una vertical y otra horizontal, para que la onda
     se lea desde cualquier punto alrededor de la pieza. La envolvente queda
     dibujada aparte, en fijo: ahí se ven los nodos.
     --------------------------------------------------------------------- */
  _ondaEstacionaria() {
    this.grupoOnda = new THREE.Group();
    const N = 320;
    const alturaOnda = 0.10;      // amplitud máxima en metros
    const grosor = 0.0035;

    const hacerCinta = (planoHorizontal) => {
      const pos = [], aX = [], aLado = [];
      const idx = [];
      for (let i = 0; i <= N; i++) {
        const xn = i / N;
        const x = (xn - 0.5) * this.L;
        for (const lado of [-1, 1]) {
          pos.push(x, 0, 0);
          aX.push(xn);
          aLado.push(lado);
        }
        if (i < N) {
          const b = i * 2;
          idx.push(b, b + 1, b + 2, b + 1, b + 3, b + 2);
        }
      }
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
      g.setAttribute('aX', new THREE.Float32BufferAttribute(aX, 1));
      g.setAttribute('aLado', new THREE.Float32BufferAttribute(aLado, 1));
      g.setIndex(idx);

      const mat = new THREE.ShaderMaterial({
        uniforms: {
          ...this.uniformes,
          uColor: { value: new THREE.Color(PALETA.campoAlto) },
          uColorBase: { value: new THREE.Color(PALETA.campo) },
          uAmp: { value: alturaOnda },
          uGrosor: { value: grosor },
          uHorizontal: { value: planoHorizontal ? 1 : 0 },
        },
        vertexShader: /* glsl */`
          attribute float aX;
          attribute float aLado;
          uniform float uAmp;
          uniform float uGrosor;
          uniform float uHorizontal;
          uniform float uPaquete;
          varying float vI;
          varying float vX;
          ${GLSL_ONDA}
          void main() {
            float e = envolvente(aX);
            float w = e * fase(aX) * uAmp * revelado(aX);
            vec3 p = position;
            vec3 dir = (uHorizontal > 0.5) ? vec3(0.0, 0.0, 1.0) : vec3(0.0, 1.0, 0.0);
            p += dir * w;
            p += dir * aLado * uGrosor;
            vX = aX;
            vI = e * extremos(aX);
            if (uPaquete >= 0.0) {
              float d = abs(aX - uPaquete);
              vI += exp(-d * d / 0.0008) * 1.8;
            }
            gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
          }`,
        fragmentShader: /* glsl */`
          precision mediump float;
          uniform vec3 uColor;
          uniform vec3 uColorBase;
          uniform float uOpacidad;
          varying float vI;
          void main() {
            vec3 c = mix(uColorBase, uColor, smoothstep(0.72, 1.5, vI));
            gl_FragColor = vec4(c, clamp(vI, 0.0, 1.0) * 0.96 * uOpacidad);
          }`,
        transparent: true,
        depthWrite: false,
        side: THREE.DoubleSide,
        // Mezcla normal, no aditiva: sobre una pared blanca de galería el
        // aditivo se vuelve blanco y la señal se pierde. Esta es la capa que
        // tiene que leerse siempre, así que se pinta con su color.
        blending: THREE.NormalBlending,
      });
      return new THREE.Mesh(g, mat);
    };

    this.cintaV = hacerCinta(false);
    this.cintaH = hacerCinta(true);
    this.cintaV.frustumCulled = false;
    this.cintaH.frustumCulled = false;
    this.grupoOnda.add(this.cintaV, this.cintaH);

    // Envolvente estática: el contorno dentro del que oscila la onda.
    const pos = [], aX = [], aSigno = [];
    for (let i = 0; i < N; i++) {
      for (const signo of [1, -1]) {
        for (const j of [i, i + 1]) {
          const xn = j / N;
          pos.push((xn - 0.5) * this.L, 0, 0);
          aX.push(xn);
          aSigno.push(signo);
        }
      }
    }
    const ge = new THREE.BufferGeometry();
    ge.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    ge.setAttribute('aX', new THREE.Float32BufferAttribute(aX, 1));
    ge.setAttribute('aSigno', new THREE.Float32BufferAttribute(aSigno, 1));
    const me = new THREE.ShaderMaterial({
      uniforms: { ...this.uniformes, uAmp: { value: alturaOnda },
                  uColor: { value: new THREE.Color(PALETA.campo) } },
      vertexShader: /* glsl */`
        attribute float aX; attribute float aSigno;
        uniform float uAmp; varying float vI;
        ${GLSL_ONDA}
        void main() {
          float e = envolvente(aX) * revelado(aX);
          vec3 p = position + vec3(0.0, aSigno * e * uAmp, 0.0);
          vI = envolvente(aX) * extremos(aX);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
        }`,
      fragmentShader: /* glsl */`
        precision mediump float;
        uniform vec3 uColor; uniform float uOpacidad; varying float vI;
        void main(){ gl_FragColor = vec4(uColor, vI * 0.30 * uOpacidad); }`,
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    });
    this.envolvente = new THREE.LineSegments(ge, me);
    this.envolvente.frustumCulled = false;
    this.grupoOnda.add(this.envolvente);
    this.grupo.add(this.grupoOnda);
  }

  /* ---------------------------------------------------------------------
     3. RADIACIÓN
     Anillos que crecen alrededor del eje de la línea y se apagan al
     alejarse. Instanciados: una sola geometría de círculo repetida.
     --------------------------------------------------------------------- */
  _radiacion() {
    const ANILLOS = RENDIMIENTO.anillos;
    const SEG = 64;
    const radioMax = 0.42;

    const base = new THREE.BufferGeometry();
    const p = [];
    for (let i = 0; i < SEG; i++) {
      const t0 = (i / SEG) * Math.PI * 2;
      const t1 = ((i + 1) / SEG) * Math.PI * 2;
      p.push(0, Math.sin(t0), Math.cos(t0));
      p.push(0, Math.sin(t1), Math.cos(t1));
    }
    base.setAttribute('position', new THREE.Float32BufferAttribute(p, 3));

    const g = new THREE.InstancedBufferGeometry();
    g.setAttribute('position', base.attributes.position);
    const off = new Float32Array(ANILLOS);
    const xs = new Float32Array(ANILLOS);
    for (let i = 0; i < ANILLOS; i++) {
      off[i] = i / ANILLOS;
      // Reparto a lo largo del recorrido, más denso en los vientres.
      xs[i] = (i + 0.5) / ANILLOS;
    }
    g.setAttribute('aOffset', new THREE.InstancedBufferAttribute(off, 1));
    g.setAttribute('aXn', new THREE.InstancedBufferAttribute(xs, 1));
    g.instanceCount = ANILLOS;

    const mat = new THREE.ShaderMaterial({
      uniforms: {
        ...this.uniformes,
        uColor: { value: new THREE.Color(PALETA.campo) },
        uRadioMax: { value: radioMax },
        uLargo: { value: this.L },
      },
      vertexShader: /* glsl */`
        attribute float aOffset;
        attribute float aXn;
        uniform float uRadioMax;
        uniform float uLargo;
        varying float vI;
        ${GLSL_ONDA}
        void main() {
          float ciclo = fract(uTiempo * 0.13 + aOffset);
          float r = ciclo * uRadioMax;
          float e = envolvente(aXn) * extremos(aXn);
          vec3 p = position * r;
          p.x = (aXn - 0.5) * uLargo;
          // Se apaga al alejarse y nace con fuerza en los vientres.
          vI = e * (1.0 - ciclo) * (1.0 - ciclo) * smoothstep(0.0, 0.12, ciclo);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
        }`,
      fragmentShader: /* glsl */`
        precision mediump float;
        uniform vec3 uColor; uniform float uOpacidad; varying float vI;
        void main(){ gl_FragColor = vec4(uColor, vI * 0.26 * uOpacidad); }`,
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    });

    this.radiacion = new THREE.LineSegments(g, mat);
    this.radiacion.frustumCulled = false;
    this.grupo.add(this.radiacion);
  }

  /* ---------------------------------------------------------------------
     4. PAQUETE Y HITOS
     Un pulso recorre la línea. Al pasar por cada bloque enciende su hito de
     distancia y el tiempo que tarda la luz en cubrirla.
     --------------------------------------------------------------------- */
  _paquete() {
    this.grupoHitos = new THREE.Group();
    this.hitos = [];

    const geo = new THREE.PlaneGeometry(1, 1);
    HITOS.forEach((h, i) => {
      const tex = etiquetaTextura(h);
      const mat = new THREE.MeshBasicMaterial({
        map: tex, transparent: true, depthWrite: false,
        opacity: 0, blending: THREE.NormalBlending,
      });
      const m = new THREE.Mesh(geo, mat);
      const ancho = 0.28;
      m.scale.set(ancho, ancho * (tex.image.height / tex.image.width), 1);
      const xn = PIEZA.nBloques === 1 ? 0.5 : i / (PIEZA.nBloques - 1);
      m.position.set(
        (xn - 0.5) * this.L,
        PIEZA.bloque.alto * 0.5 + 0.20,
        0
      );
      m.userData.xn = xn;
      m.renderOrder = 10;
      this.grupoHitos.add(m);
      this.hitos.push(m);
    });
    this.grupo.add(this.grupoHitos);

    // El pulso: un halo aditivo sobre el eje, con núcleo blanco.
    const halo = new THREE.Mesh(
      new THREE.PlaneGeometry(0.24, 0.24),
      new THREE.ShaderMaterial({
        uniforms: { uOpacidad: this.uniformes.uOpacidad,
                    uColor: { value: new THREE.Color(PALETA.campoAlto) },
                    uVerde: { value: new THREE.Color(PALETA.campo) } },
        vertexShader: `varying vec2 vUv; void main(){ vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
        fragmentShader: `precision mediump float; varying vec2 vUv;
          uniform vec3 uColor; uniform vec3 uVerde; uniform float uOpacidad;
          void main(){
            float d = length(vUv - 0.5) * 2.0;
            float nucleo = exp(-d * d * 28.0);
            float aura = exp(-d * d * 5.0) * 0.55;
            float a = (nucleo + aura) * (1.0 - smoothstep(0.85, 1.0, d));
            vec3 c = mix(uVerde, uColor, nucleo);
            gl_FragColor = vec4(c, a * uOpacidad);
          }`,
        transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      })
    );
    halo.frustumCulled = false;
    this.halo = halo;
    this.grupo.add(halo);

    // Estela: partículas que quedan atrás del pulso y se apagan. Todo en GPU:
    // cada partícula lleva su retraso y su dispersión alrededor del eje.
    const N = RENDIMIENTO.estela;
    const pos = new Float32Array(N * 3);
    const retraso = new Float32Array(N);
    const disp = new Float32Array(N * 2);
    for (let i = 0; i < N; i++) {
      retraso[i] = (i / N) * 0.11 + Math.random() * 0.004;
      const ang = Math.random() * Math.PI * 2;
      const r = 0.012 + Math.random() * 0.05;
      disp[i * 2] = Math.cos(ang) * r;
      disp[i * 2 + 1] = Math.sin(ang) * r;
    }
    const ge = new THREE.BufferGeometry();
    ge.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    ge.setAttribute('aRetraso', new THREE.BufferAttribute(retraso, 1));
    ge.setAttribute('aDisp', new THREE.BufferAttribute(disp, 2));
    this.matEstela = new THREE.ShaderMaterial({
      uniforms: {
        ...this.uniformes,
        uLargo: { value: this.L },
        uColor: { value: new THREE.Color(PALETA.campo) },
        uEscala: { value: 1 },
      },
      vertexShader: /* glsl */`
        attribute float aRetraso; attribute vec2 aDisp;
        uniform float uPaquete; uniform float uLargo; uniform float uEscala;
        uniform float uTiempo;
        varying float vI;
        void main() {
          float xn = uPaquete - aRetraso;
          float vivo = step(0.0, uPaquete) * step(0.0, xn);
          float t = aRetraso / 0.11;
          // Se abren un poco al quedarse atrás, como humo frío.
          vec3 p = vec3((xn - 0.5) * uLargo, aDisp.x * (0.6 + t * 1.4), aDisp.y * (0.6 + t * 1.4));
          p.y += sin(uTiempo * 3.0 + aRetraso * 200.0) * 0.004 * t;
          vI = (1.0 - t) * (1.0 - t) * vivo;
          vec4 mv = modelViewMatrix * vec4(p, 1.0);
          gl_PointSize = clamp((1.5 + 4.0 * (1.0 - t)) * uEscala / max(-mv.z, 0.001), 1.0, 16.0);
          gl_Position = projectionMatrix * mv;
        }`,
      fragmentShader: /* glsl */`
        precision mediump float;
        uniform vec3 uColor; uniform float uOpacidad; varying float vI;
        void main() {
          float d = length(gl_PointCoord - 0.5) * 2.0;
          if (d > 1.0 || vI <= 0.001) discard;
          gl_FragColor = vec4(uColor, (1.0 - d) * vI * 0.9 * uOpacidad);
        }`,
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    });
    this.estela = new THREE.Points(ge, this.matEstela);
    this.estela.frustumCulled = false;
    this.grupo.add(this.estela);

    this.tPaquete = 0;
  }

  /** Materialización de la obra: 0 = nada, 1 = entera. */
  set nacer(v) { this.uniformes.uNacer.value = v; }
  get nacer() { return this.uniformes.uNacer.value; }

  /** Enciende y apaga capas desde el HUD. */
  aplicarCapas(c) {
    this.capas = c;
    this.mallaCampo.visible = !!c.campoCercano;
    this.grupoOnda.visible = !!c.estacionaria;
    this.radiacion.visible = !!c.radiacion;
    this.grupoHitos.visible = !!c.paquete;
    this.halo.visible = !!c.paquete;
    this.estela.visible = !!c.paquete;
  }

  /** @param {THREE.Camera} camara para orientar las etiquetas */
  actualizar(t, dt, camara, opacidad = 1, escalaPixel = 1) {
    this.uniformes.uTiempo.value = t;
    this.uniformes.uOpacidad.value = opacidad;
    this.matEstela.uniforms.uEscala.value = escalaPixel;
    // Mientras la obra se materializa el pulso espera en el origen.
    const nacido = this.uniformes.uNacer.value >= 1;

    // Recorrido del pulso, con una pausa al llegar al final.
    if (nacido) this.tPaquete = (this.tPaquete + dt * SENAL.velocidadPaquete) % 1.28;
    else this.tPaquete = 0;
    const p = this.tPaquete <= 1 ? this.tPaquete : -1;
    this.uniformes.uPaquete.value = p;

    if (p >= 0 && nacido) {
      this.halo.visible = !!this.capas.paquete;
      this.halo.position.set((p - 0.5) * this.L, 0, 0);
      if (camara) this.halo.quaternion.copy(camara.quaternion);
    } else {
      this.halo.visible = false;
    }

    // Los hitos se encienden al paso del pulso y se apagan despacio.
    for (const m of this.hitos) {
      let objetivo = 0;
      if (p >= 0) {
        const d = Math.abs(p - m.userData.xn);
        objetivo = d < 0.045 ? 1 : (d < 0.16 ? 1 - (d - 0.045) / 0.115 : 0);
      }
      const actual = m.userData.nivel || 0;
      const k = objetivo > actual ? 0.22 : 0.045;
      m.userData.nivel = actual + (objetivo - actual) * k;
      m.material.opacity = m.userData.nivel * opacidad;
      m.visible = m.material.opacity > 0.01;
      if (camara) m.quaternion.copy(camara.quaternion);
    }
  }
}

/* --------------------------------------------------------------------------
   Etiqueta de hito dibujada en canvas. Usa Lato si está cargada, que es la
   tipografía que llevan pegada los bloques físicos.
   -------------------------------------------------------------------------- */
function etiquetaTextura(hito) {
  const W = 512, H = 224;
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const x = c.getContext('2d');

  x.clearRect(0, 0, W, H);
  x.textAlign = 'center';

  // Placa oscura de fondo: en sala la etiqueta cae sobre pared clara y el texto
  // blanco solo no se lee.
  const r = 14;
  x.fillStyle = 'rgba(8, 11, 13, 0.72)';
  x.beginPath();
  x.moveTo(r, 4);
  x.lineTo(W - r, 4); x.quadraticCurveTo(W - 4, 4, W - 4, 4 + r);
  x.lineTo(W - 4, H - 4 - r); x.quadraticCurveTo(W - 4, H - 4, W - 4 - r, H - 4);
  x.lineTo(r, H - 4); x.quadraticCurveTo(4, H - 4, 4, H - 4 - r);
  x.lineTo(4, 4 + r); x.quadraticCurveTo(4, 4, r, 4);
  x.closePath();
  x.fill();

  const seg = hito.segundosLuz;
  const min = Math.floor(seg / 60);
  const rest = Math.round(seg % 60);
  const tiempo = min > 0 ? `${min} min ${String(rest).padStart(2, '0')} s luz`
                         : `${Math.round(seg)} s luz`;

  x.fillStyle = 'rgba(191,198,204,0.55)';
  x.font = '300 34px Lato, "Helvetica Neue", Arial, sans-serif';
  x.fillText(String(hito.indice + 1).padStart(2, '0'), W / 2, 44);

  x.fillStyle = '#ffffff';
  x.font = '300 72px Lato, "Helvetica Neue", Arial, sans-serif';
  x.fillText(hito.etiqueta, W / 2, 122);

  x.fillStyle = 'rgba(255,255,255,0.62)';
  x.font = '300 34px Lato, "Helvetica Neue", Arial, sans-serif';
  x.fillText('km', W / 2 + medirAncho(x, hito.etiqueta, 72) / 2 + 34, 122);

  x.fillStyle = '#00ff21';
  x.font = '300 38px Lato, "Helvetica Neue", Arial, sans-serif';
  x.fillText(tiempo, W / 2, 186);

  const tex = new THREE.CanvasTexture(c);
  tex.anisotropy = 4;
  tex.needsUpdate = true;
  return tex;
}

function medirAncho(ctx, texto, px) {
  const previo = ctx.font;
  ctx.font = `300 ${px}px Lato, "Helvetica Neue", Arial, sans-serif`;
  const w = ctx.measureText(texto).width;
  ctx.font = previo;
  return w;
}

export { C_LUZ_KMS };
