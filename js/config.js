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
   LA CARTELA
   Una sola imagen impresa que emplaza la obra. Sirve de dos maneras:

     · en modo libre (WebXR, Android): el visitante apunta la retícula al
       centro de la cartela y toca la pantalla. La obra se ancla a ese punto
       del espacio y ya puede caminar y rodearla sin volver a mirar el papel.
     · en modo imagen (iPhone y respaldo): el móvil reconoce la cartela y la
       obra se sostiene mientras esté a la vista o unos segundos después.

   anchoImpreso : ancho real impreso, en metros. De aquí sale toda la escala.
   posicion     : [x, y, z] del CENTRO de la cartela en coordenadas de pieza.
                  Con [0, 0.34, -0.12] queda en la pared de fondo, centrada,
                  a 34 cm sobre los tubos y 12 cm por detrás de su eje.
   rotacionDeg  : [0,0,0] plana en la pared mirando al espectador;
                  [-90,0,0] tumbada boca arriba sobre una peana.

   Se pueden añadir más cartelas al array si la sala lo pide; el orden debe
   coincidir con el orden de compilación de targets/targets.mind (A, B, C, D).
   -------------------------------------------------------------------------- */
export const MARCADORES = [
  {
    id: 'A',
    nombre: 'Cartela principal',
    anchoImpreso: 0.420,                 // A3 apaisado
    posicion: [0.0, 0.34, -0.12],
    rotacionDeg: [0, 0, 0],
  },
];

/* --------------------------------------------------------------------------
   ASTEROIDE
   -------------------------------------------------------------------------- */
export const PSYCHE = {
  // Dónde flota, en coordenadas de pieza. En el centro de la sala: dos metros
  // hacia el espectador desde los tubos y 1,2 m por encima de ellos, para que
  // quede a la altura de la vista y se pueda rodear.
  posicion: [0.0, 1.2, 2.0],
  // Diámetro aparente de la pieza AR, en metros.
  diametro: 0.60,
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
  campo:      0x00ff21,
  campoAlto:  0xffffff,
  campoBajo:  0x0a4a16,
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
  // perder la cartela, antes de desvanecerse. Solo en modo imagen; en modo
  // libre el anclaje es del espacio y no caduca.
  retencionSegundos: 8.0,
  // Segundos de desvanecido al final de la retención.
  desvanecidoSegundos: 1.6,
  // Parámetros del filtro one-euro interno de MindAR. Bajar filterMinCF da más
  // estabilidad y más latencia.
  filterMinCF: 0.0008,
  filterBeta: 800,
  // Fotogramas que aguanta un target perdido antes de darlo por perdido.
  missTolerance: 8,
  warmupTolerance: 3,
};

/* --------------------------------------------------------------------------
   MODO DE ANCLAJE
   'auto'   usa WebXR si el móvil lo tiene (Android con Chrome) y si no, imagen
   'libre'  fuerza WebXR
   'imagen' fuerza el seguimiento por imagen
   Se puede sobreescribir con ?modo=libre o ?modo=imagen en la URL.
   -------------------------------------------------------------------------- */
export const MODO = {
  preferido: 'auto',
  // Duración de la materialización de la obra al anclarse, en segundos.
  nacimientoSegundos: 2.6,
  // Variant Launch: WebXR en iPhone vía App Clip. Con la clave del proyecto
  // aquí, la app carga su SDK y el iPhone entra en modo libre igual que
  // Android. Vacío = no se carga nada y el iPhone usa el modo imagen.
  // Plan gratuito hasta 3.000 aperturas al mes en launch.variant3d.com.
  variantKey: '',
};

/* --------------------------------------------------------------------------
   CAPAS VISIBLES
   Se pueden apagar desde el HUD; esto define el estado inicial.
   -------------------------------------------------------------------------- */
export const CAPAS = {
  guia: false,        // wireframe de tubos y bloques, para verificar el encaje
  campoCercano: true, // líneas de campo envolviendo los tubos
  estacionaria: true, // la onda circular: anillos alrededor de la línea
  cintas: false,      // la onda plana antigua, en cinta; apagada por defecto
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
  alta:  { planos: 48, arcos: 7, segmentos: 22, anillos: 48, ondaAnillos: 120, estela: 160, enlace: 360 },
  media: { planos: 36, arcos: 6, segmentos: 20, anillos: 36, ondaAnillos: 90,  estela: 110, enlace: 240 },
  baja:  { planos: 24, arcos: 5, segmentos: 16, anillos: 24, ondaAnillos: 64,  estela: 70,  enlace: 150 },
}[CALIDAD];

export const TEXTOS = {
  titulo: 'GREY SPACES',
  subtitulo: 'IRIDIA · la parte invisible de la obra',
  frecuencia: `${(SENAL.frecuenciaHz / 1e9).toLocaleString('de-DE')} GHz · banda X`,
};
