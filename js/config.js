/* ==========================================================================
   GREY SPACES · AR — CONFIGURACIÓN
   IRIDIA / SLStudio · Solimán López

   ESTE ES EL ÚNICO ARCHIVO QUE HAY QUE TOCAR PARA MONTAR LA OBRA EN SALA.
   Todo lo demás (escena, campo RF, asteroide, anclaje) lee de aquí.

   Sistema de coordenadas de la pieza, en METROS:
     origen  → centro del recorrido, sobre el eje medio entre los dos tubos,
               a la altura de los tubos
     +X      → a lo largo de los tubos, del bloque 01 al bloque 10
     +Y      → arriba
     +Z      → hacia el espectador (saliendo de la pared)
   ========================================================================== */

export const PIEZA = {
  // ---- MEDIR EN SALA -----------------------------------------------------
  // Distancia entre los ejes de los dos tubos de cobre.
  separacionTubos: 0.080,
  // Radio exterior del tubo de cobre.
  radioTubo: 0.011,
  // Número de bloques grises de soporte.
  nBloques: 10,
  // Distancia de centro a centro entre bloques consecutivos.
  pasoBloques: 0.400,
  // Bloque de soporte: largo (X) x fondo (Z) x alto (Y), en metros.
  bloque: { largo: 0.350, fondo: 0.200, alto: 0.080 },
  // Voladizo de tubo que sobresale por cada extremo más allá del último bloque.
  voladizo: 0.150,
  // ------------------------------------------------------------------------

  get recorrido() {
    // Longitud útil entre el primer y el último bloque.
    return (this.nBloques - 1) * this.pasoBloques;
  },
  get largoTubo() {
    return this.recorrido + this.bloque.largo + 2 * this.voladizo;
  },
};

/* --------------------------------------------------------------------------
   SEÑAL
   La frecuencia real que circula por los tubos. Determina la longitud de onda
   que se dibuja sobre la línea, así que conviene que sea la de verdad.
   -------------------------------------------------------------------------- */
export const SENAL = {
  frecuenciaHz: 8.4e9,      // banda X, la que usa la Deep Space Network
  // Factor de velocidad de la línea de dos hilos al aire (~0.95 c).
  factorVelocidad: 0.95,
  // La onda dibujada no puede ser la real (a 8,4 GHz la longitud de onda son
  // 3,5 cm y en pantalla sería ruido). Se escala para que se lea.
  // longitudOndaVisible = recorrido / ciclosVisibles
  ciclosVisibles: 6.5,
  // Relación de onda estacionaria: 1 = todo transmitido, >1 = hay reflexión.
  // Con ROE > 1 aparecen nodos y vientres fijos sobre la línea.
  roe: 2.6,
  // Velocidad del paquete que recorre la pieza, en recorridos por segundo.
  velocidadPaquete: 0.055,
};

/* --------------------------------------------------------------------------
   HITOS DE DISTANCIA TIERRA–PSYCHE
   Los mismos que van serigrafiados sobre los bloques grises.
   39.573.000 km × n, con n de 1 a 10.
   -------------------------------------------------------------------------- */
export const C_LUZ_KMS = 299792.458;

export const HITOS = Array.from({ length: PIEZA.nBloques }, (_, i) => {
  const km = 39573000 * (i + 1);
  return {
    indice: i,
    km,
    // Etiqueta con separador de millares en punto, estilo español.
    etiqueta: km.toLocaleString('de-DE'),
    segundosLuz: km / C_LUZ_KMS,
  };
});

/* --------------------------------------------------------------------------
   MARCADORES
   Cada marcador es una cartela impresa cuyo pose respecto a la pieza conocemos.
   El orden de este array DEBE coincidir con el orden en que se compilaron las
   imágenes en el archivo targets/targets.mind.

   anchoImpreso : ancho físico real del marcador impreso, en metros. Crítico:
                  de aquí sale toda la escala de la escena.
   posicion     : [x, y, z] del CENTRO del marcador, en coordenadas de pieza.
   rotacionDeg  : [rx, ry, rz] en grados, orden XYZ. Un marcador plano sobre la
                  pared mirando al espectador es [0, 0, 0]. Uno tumbado boca
                  arriba sobre un bloque es [-90, 0, 0].
   -------------------------------------------------------------------------- */
export const MARCADORES = [
  {
    id: 'A',
    nombre: 'Cartela izquierda',
    anchoImpreso: 0.297,                 // A4 apaisado
    posicion: [-1.05, 0.34, -0.12],
    rotacionDeg: [0, 0, 0],
  },
  {
    id: 'B',
    nombre: 'Cartela derecha',
    anchoImpreso: 0.297,
    posicion: [1.05, 0.34, -0.12],
    rotacionDeg: [0, 0, 0],
  },
  {
    id: 'C',
    nombre: 'Peana central, boca arriba',
    anchoImpreso: 0.200,
    posicion: [0.0, -0.055, 0.26],
    rotacionDeg: [-90, 0, 0],
  },
  {
    id: 'D',
    nombre: 'Cartela lateral, muro corto',
    anchoImpreso: 0.297,
    posicion: [2.30, 0.34, 0.60],
    rotacionDeg: [0, 90, 0],
  },
];

/* --------------------------------------------------------------------------
   ASTEROIDE
   -------------------------------------------------------------------------- */
export const PSYCHE = {
  // Dónde flota, en coordenadas de pieza.
  posicion: [0.0, 0.52, 0.0],
  // Diámetro aparente de la pieza AR, en metros.
  diametro: 0.34,
  // Proporciones del elipsoide triaxial real de 16 Psyche (278 x 238 x 171 km).
  ejes: [1.0, 0.856, 0.615],
  // Periodo de rotación en segundos. El real es de 4,196 h; aquí se comprime
  // para que se perciba el giro sin marear.
  periodoRotacion: 90,
  // Inclinación del eje, en grados.
  inclinacionEje: 12,
  // Ruta a un GLB propio. Si el archivo existe se usa; si no, la app genera
  // un asteroide procedural con la misma silueta.
  glb: 'models/psyche.glb',
};

/* --------------------------------------------------------------------------
   PALETA
   Gris y cobre de la pieza física; la radiofrecuencia entra en frío.
   -------------------------------------------------------------------------- */
export const PALETA = {
  // El verde de IRIDIA. Aquí no hay azules.
  cobre:      0xd08b4f,
  campo:      0x3de8a0,
  campoAlto:  0xffffff,
  campoBajo:  0x12503a,
  claiming:   0xff4d3d,   // la barra vertical, el silencio reclamado
  hito:       0xbfc6cc,
  psyche:     0x6b6f74,
};

/* --------------------------------------------------------------------------
   ANCLAJE Y ESTABILIDAD
   -------------------------------------------------------------------------- */
export const ANCLAJE = {
  // Cuántos marcadores puede seguir MindAR a la vez. 2 da continuidad al pasar
  // de uno a otro; subirlo cuesta fps.
  maxTrack: 2,
  // Suavizado exponencial de la pose. 0 = sin suavizado (tiembla),
  // 1 = congelado. 0,82 va bien en móviles de gama media.
  suavizado: 0.82,
  // Suavizado extra cuando el visitante está quieto, para matar el temblor.
  suavizadoQuieto: 0.93,
  // Segundos que la obra se mantiene en su sitio con el giroscopio después de
  // perder todos los marcadores, antes de desvanecerse.
  retencionSegundos: 4.0,
  // Segundos de desvanecido al final de la retención.
  desvanecidoSegundos: 1.2,
  // Parámetros del filtro one-euro interno de MindAR. Bajar filterMinCF da más
  // estabilidad y más latencia.
  filterMinCF: 0.0008,
  filterBeta: 800,
  // Fotogramas que aguanta un target perdido antes de darlo por perdido.
  missTolerance: 8,
  warmupTolerance: 3,
};

/* --------------------------------------------------------------------------
   CAPAS VISIBLES
   Se pueden apagar desde el HUD; esto define el estado inicial.
   -------------------------------------------------------------------------- */
export const CAPAS = {
  guia: false,        // wireframe de tubos y bloques, para verificar el encaje
  campoCercano: true, // líneas de campo envolviendo los tubos
  estacionaria: true, // envolvente de la onda estacionaria
  radiacion: true,    // frentes que se desprenden hacia la sala
  paquete: true,      // el paquete que recorre los hitos
  psyche: true,
  hud: true,
};

/* --------------------------------------------------------------------------
   RENDIMIENTO
   El campo cercano es lo único que pesa de verdad. En móviles modestos se
   dibujan menos planos y menos arcos; visualmente casi no se nota.
   -------------------------------------------------------------------------- */
const nucleos = (typeof navigator !== 'undefined' && navigator.hardwareConcurrency) || 4;
const memoria = (typeof navigator !== 'undefined' && navigator.deviceMemory) || 4;
export const CALIDAD = (nucleos >= 8 && memoria >= 6) ? 'alta'
                     : (nucleos >= 6 ? 'media' : 'baja');

export const RENDIMIENTO = {
  alta:  { planos: 64, arcos: 9, segmentos: 22, anillos: 34 },
  media: { planos: 48, arcos: 7, segmentos: 20, anillos: 26 },
  baja:  { planos: 32, arcos: 5, segmentos: 16, anillos: 18 },
}[CALIDAD];

export const TEXTOS = {
  titulo: 'GREY SPACES',
  subtitulo: 'ACT · IRIDIA — la parte invisible de la obra',
  frecuencia: `${(SENAL.frecuenciaHz / 1e9).toLocaleString('de-DE')} GHz · banda X`,
};
