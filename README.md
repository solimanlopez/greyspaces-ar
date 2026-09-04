# GREY SPACES · AR

La parte invisible de la instalación: la radiofrecuencia que circula por los dos
tubos de cobre, el pulso recorriendo los diez hitos de distancia, y 16 Psyche
flotando en el centro de la obra.

Funciona en el navegador del móvil del visitante, iPhone y Android, sin instalar
nada. Se entra por un QR en sala.

---

## Por qué está montado así

En 2026 no hay una sola vía de AR en navegador que valga para todo el mundo:

- **Android + Chrome** tiene WebXR: SLAM real, la obra se ancla al espacio y
  puedes caminar libremente.
- **iPhone + Safari** no expone WebXR. Y 8th Wall, que era la forma de tenerlo
  igualmente, está cerrando.

Como la obra tiene que verla cualquiera que entre en la galería con su móvil,
la única base común es el **seguimiento por imagen**: unas cartelas impresas de
las que el móvil deduce dónde está la pieza. Eso trae una limitación honesta:
mientras no haya ninguna cartela en el encuadre, no hay anclaje. Aquí se
compensa con tres cosas.

1. **Varias cartelas repartidas alrededor de la pieza.** Cada una sabe dónde
   está respecto a la obra, así que da igual cuál veas: la obra aparece siempre
   en el mismo sitio del espacio real. Al rodear la instalación vas pasando de
   una a otra sin que la obra salte.
2. **Retención por giroscopio.** Si dejas de ver todas las cartelas, la obra se
   queda donde estaba durante unos segundos usando el giroscopio del móvil, y
   luego se desvanece en lugar de desaparecer de golpe.
3. **Suavizado adaptativo de la pose**, para que no tiemble cuando el visitante
   está quieto mirando.

Todo el código es abierto y se aloja donde quieras. Coste cero, sin plataforma
de por medio, sin que las imágenes de la obra salgan a ningún servidor ajeno.

---

## Arrancar en tu ordenador

Doble clic en **`ABRIR.command`**. Levanta un servidor local en esta carpeta y
abre el navegador en una página de inicio con todos los modos. Deja abierta la
ventana de Terminal que aparece; al cerrarla se para el servidor.

La primera vez macOS puede decir que no puede abrirlo porque viene de un
desarrollador no identificado. Clic derecho sobre el archivo, *Abrir*, y
*Abrir* otra vez en el aviso. Solo hace falta una vez.

Si prefieres el terminal, es lo mismo a mano:

```bash
cd ruta/a/greyspaces-ar
python3 -m http.server 8123
# y abrir http://localhost:8123/inicio.html
```

Hace falta servidor porque el navegador no da acceso a la cámara ni carga
módulos desde un archivo suelto. `localhost` cuenta como sitio seguro, así que
la webcam funciona sin certificado.

### Probar sin la instalación delante

El modo mesa (`index.html?mesa=1`, o el primer botón de la página de inicio)
pone el origen de la obra sobre el propio marcador y la encoge a un palmo. Abre
`targets/imprimir/marcador-A.png` en el móvil o imprímela, ponla frente a la
webcam, y la obra aparece flotando encima. Con `?mesa=0.30` sale mayor.

Sin el modo mesa la obra aparece donde dicen las medidas de `config.js`, o sea a
un metro largo del marcador y fuera del encuadre de una prueba de escritorio.
Eso es correcto: en sala es donde están los tubos.

---

## Qué hay en la carpeta

```
ABRIR.command               doble clic: servidor local y navegador
inicio.html                 página de inicio con todos los modos
index.html                  la aplicación
js/config.js                TODO lo que hay que tocar para montarla
js/main.js                  arranque, modo AR y modo previa
js/anchoring.js             anclaje multi-marcador, fusión y retención
js/rf-field.js              el campo de radiofrecuencia
js/psyche.js                el asteroide
js/piece.js                 calco en alambre de tubos y bloques, para calibrar
js/ui.js                    estado, capas y panel de calibración
css/                        estilos y Lato autoalojada
vendor/                     three.js 0.160 y MindAR 1.2.5, servidos en local
targets/targets.mind        archivo de seguimiento ya compilado
targets/imprimir/           las cuatro cartelas a 300 ppp, listas para imprenta
targets/compilar/           las mismas a 1024 px, para recompilar si las cambias
tools/generar-marcadores.py genera las cartelas
tools/compilar.html         compila targets.mind en local, sin subir nada
tools/servidor.js           servidor estático, por si no hay python3
vercel.json                 cabeceras de cache para la publicacion
.vercelignore               lo que no viaja al servidor
models/                     aquí va psyche.glb si quieres el modelo bueno
```

---

## Montaje en sala, paso a paso

### 1. Medir la pieza

Abre `js/config.js` y rellena el bloque `PIEZA` con las medidas reales, en
metros: separación entre los ejes de los tubos, radio del tubo, paso entre
bloques, dimensiones del bloque y voladizo. De ahí sale toda la escala.

### 2. Imprimir las cartelas

En `targets/imprimir/` hay cuatro cartelas a 300 ppp, A4 apaisado.

**El tamaño impreso manda sobre la distancia de seguimiento.** Regla práctica:
una cartela se sigue bien hasta unas 6 u 8 veces su anchura.

| Ancho impreso | Distancia de trabajo |
|---|---|
| A4, 297 mm | hasta ~2 m |
| A3, 420 mm | hasta ~3 m |
| A2, 594 mm | hasta ~4 m |

Si la sala es grande, imprime a A3 o A2 y **anota el ancho real en milímetros**:
va en `anchoImpreso` de cada marcador.

Impresión mate. El papel brillante refleja los focos de la galería y el
seguimiento se pierde justo cuando el visitante se acerca.

### 3. Colocarlas

Cuatro es un buen número para una pieza de tres o cuatro metros:

- dos en la pared de fondo, a la altura de la vista, hacia los dos tercios del
  recorrido, separadas entre sí;
- una tumbada boca arriba sobre una peana o sobre uno de los bloques centrales,
  que es la que salva las vistas cenitales y de cerca;
- una en un muro lateral o en la esquina, para cuando el visitante rodea la
  pieza y pierde de vista las de la pared.

Lo importante es que **desde cualquier punto donde vaya a estar el público haya
al menos una cartela en el encuadre**. Camina tú el recorrido con el móvil antes
de abrir.

### 4. Decirle a la app dónde está cada cartela

En `MARCADORES` de `js/config.js`, para cada una:

- `anchoImpreso`: el ancho real impreso, en metros.
- `posicion`: `[x, y, z]` del centro de la cartela, en metros, medidos desde el
  centro del recorrido de los tubos. `+X` a lo largo de los tubos, `+Y` arriba,
  `+Z` hacia el espectador.
- `rotacionDeg`: `[0,0,0]` si está plana en la pared de fondo mirando al
  espectador; `[-90,0,0]` si está tumbada boca arriba; `[0,90,0]` si está en un
  muro lateral, girada un cuarto de vuelta.

El orden del array tiene que coincidir con el orden alfabético de las imágenes
con las que se compiló `targets.mind` (A, B, C, D).

### 5. Calibrar con la pieza delante

Abre la app con `?calibrar=1` al final de la URL. Se enciende la capa **guía de
encaje**: un calco en alambre de los tubos y los bloques, más un rectángulo rojo
donde la app cree que está cada cartela.

Apunta a una cartela y mueve los deslizadores hasta que el alambre se pegue al
cobre real. Repite con cada cartela. Cuando las cuatro encajen, pulsa **copiar
calibración** y pega el bloque en `js/config.js`.

Esto es lo que hace que la obra se superponga de verdad y no flote a un palmo.

### 6. Publicar

La AR necesita **https** obligatoriamente; sin certificado el navegador no da
la camara. Por red local no vale: `http://192.168.x.x` no es sitio seguro.

Desde esta misma carpeta, en Terminal:

```bash
cd ~/Desktop/"GREY SPACES AR"
npx vercel login      # solo la primera vez
npx vercel --prod
```

No hay build: es estatico puro, Vercel lo sirve tal cual. `vercel.json` fija
las cabeceras de cache para que `vendor/`, las fuentes y `targets.mind` no se
vuelvan a descargar en cada visita, que es lo que hace que la segunda carga en
sala sea instantanea. `.vercelignore` deja fuera el zip y el arranque local.

Para colgarlo del dominio propio, en el panel de Vercel, proyecto -> Settings ->
Domains, anadir por ejemplo `greyspaces.iridia.world` y crear en el DNS el CNAME
que Vercel indique. El certificado lo emite Vercel solo. Cambiar de dominio no
obliga a volver a subir nada: la app usa rutas relativas.

Luego genera un QR con la URL y ponlo en la cartela de sala junto a una línea
de instrucción: *apunta con la cámara a cualquiera de las cartelas*.

En iPhone hay que abrirlo en **Safari**. Instagram, WhatsApp y otros navegadores
embebidos no dan acceso a la cámara. Conviene decirlo en la cartela.

---

## Si cambias las cartelas

1. Edita `tools/generar-marcadores.py` y ejecútalo:
   `python3 tools/generar-marcadores.py --dpi 300`
2. Abre `tools/compilar.html` en el navegador, elige las imágenes de
   `targets/compilar/` **en orden alfabético**, compila, y guarda el resultado
   como `targets/targets.mind`.

Una advertencia que costó descubrir: **un punteado fino y uniforme no sirve como
marcador**. A dos metros la cámara lo promedia y lo convierte en un degradado
liso, sin un solo punto característico estable. Lo que sobrevive al reescalado
son las masas: siluetas cerradas, contornos con peso, manchas sólidas y
tipografía grande. Por eso el grabado de Psyche de las cartelas combina talla y
punteado, y las barras del Tratado varían en grosor y sangrado en vez de ser una
retícula regular. Si rediseñas las cartelas, mantén ese principio o el
seguimiento se cae.

---

## El asteroide

Por defecto la app genera un 16 Psyche procedural: elipsoide triaxial con las
proporciones reales (278 × 238 × 171 km), relieve por ruido fractal y cráteres
tallados, sin depender de ninguna textura externa.

Si dejas tu modelo en `models/psyche.glb`, la app lo carga en su lugar y lo
escala solo. Cualquiera de los perfiles del pipeline de IRIDIA vale; conviene
una versión decimada, por debajo de 60.000 triángulos, para que vaya fino en
móvil.

---

## Ajustes que quizá quieras tocar

En `js/config.js`:

- `SENAL.frecuenciaHz` — la frecuencia real que circula por los tubos. Por
  defecto 8,4 GHz, banda X, la de la Deep Space Network.
- `SENAL.ciclosVisibles` — cuántos ciclos de onda se dibujan a lo largo de la
  pieza. La longitud de onda real a 8,4 GHz son 3,5 cm y en pantalla sería
  ruido, así que se escala para que se lea.
- `SENAL.roe` — relación de onda estacionaria. Con valores por encima de 1
  aparecen los nodos y los vientres fijos sobre la línea.
- `SENAL.velocidadPaquete` — lo que tarda el pulso en recorrer la pieza.
- `PSYCHE.posicion` y `PSYCHE.diametro` — dónde flota y cuánto ocupa.
- `ANCLAJE.suavizado` — súbelo si tiembla, bájalo si va con retraso.
- `ANCLAJE.retencionSegundos` — cuánto aguanta la obra sin ver ninguna cartela.

---

## Modos de la aplicación

| URL | Qué hace |
|---|---|
| `inicio.html` | la página de inicio, con enlaces a todo |
| `index.html` | la AR normal |
| `?previa=1` | la misma escena sin cámara, con órbita, para verla en el ordenador |
| `?previa=1&quieto=1` | igual pero sin rotación automática |
| `?calibrar=1` | abre el panel de calibración con la guía encendida |
| `?mesa=1` | prueba de escritorio: la obra encogida sobre el marcador |
| `?mesa=0.30` | igual, con el factor de escala que le pases |
| `?capas=guia,psyche` | fuerza qué capas arrancan encendidas |

Desde el móvil, cinco toques seguidos sobre el indicador de estado también abren
la calibración, sin tener que escribir la URL.

Para diagnóstico, `window.__gs` en la consola expone `mindar`, `anclaje` y la
escena.

---

## Rendimiento

El campo cercano es lo único que pesa. La app mide núcleos y memoria del
dispositivo al arrancar y baja la densidad sola en móviles modestos
(`RENDIMIENTO` en `config.js`). three.js y MindAR van servidos desde la propia
carpeta, no desde un CDN, así que la app carga entera y funciona aunque el wifi
de la sala vaya mal.

El primer arranque descarga unos 6 MB (el motor de seguimiento lleva TensorFlow
dentro). A partir de ahí queda en caché.

---

## Sobre el color

El verde de IRIDIA es `#3DE8A0` y está en un solo sitio, `PALETA.campo` de
`js/config.js`, más la variable `--campo` de `css/app.css`. Cámbialo ahí y
cambia en toda la obra. La onda estacionaria se pinta con mezcla normal y no
aditiva a propósito: sobre una pared blanca de galería el aditivo se vuelve
blanco y la señal se pierde. Las etiquetas de los hitos llevan placa oscura
detrás por la misma razón. El campo cercano y los frentes de radiación sí van
en aditivo, porque ahí lo que se busca es luz difusa.

---

## Nota sobre la interfaz

La superposición va con DOM y transiciones CSS, no con Framer Motion. En AR cada
milisegundo del hilo principal se paga en temblor del seguimiento, y meter React
en la ruta crítica para animar cuatro botones no compensa.

---

IRIDIA · SLStudio · Solimán López
