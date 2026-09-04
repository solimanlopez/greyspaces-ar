# GREY SPACES · AR

La parte invisible de la instalación: la radiofrecuencia que circula por los dos
tubos de cobre, el pulso recorriendo los diez hitos de distancia, y 16 Psyche
flotando en el centro de la obra.

Funciona en el navegador del móvil del visitante, iPhone y Android, sin instalar
nada. Se entra por un QR en sala.

---

## Cómo se ancla

Una sola cartela emplaza la obra. Después, la pieza se queda quieta y es el
visitante quien se mueve. Lo que sostiene la obra en su sitio depende de lo
que sepa hacer el móvil, y en 2026 eso divide el mundo en dos:

- **Modo libre, Android con Chrome.** WebXR, o sea SLAM de verdad. El
  visitante centra la retícula en la cruz de la cartela y toca la pantalla. La
  obra se ancla a ese punto del espacio (`XRAnchor`) y ya puede caminar a lo
  largo de los tubos, rodear la pieza, agacharse. Sigue ahí. Hay un botón de
  recolocar por si el primer anclaje no convence.
- **Modo imagen, iPhone y respaldo.** Safari no expone WebXR. El móvil
  reconoce la cartela y sostiene la obra mientras la tenga a la vista, y unos
  ocho segundos después con el giroscopio. Si el visitante camina, se despega.
- **iPhone en modo libre: Variant Launch.** Inyecta WebXR en Safari vía App
  Clip. Plan gratuito hasta 3.000 aperturas al mes, sin tarjeta; Basic 99 $/mes
  por proyecto si se pasa. La integración ya está hecha: pegar la clave del
  proyecto en `MODO.variantKey` de `js/config.js` y autorizar el dominio en su
  panel. El código es WebXR estándar, así que es el mismo modo libre.

La app elige sola: si hay WebXR usa el modo libre, si no, imagen. Se puede
forzar con `?modo=libre` o `?modo=imagen`.

Al anclarse, la obra no aparece de golpe: se dibuja de un extremo al otro de la
línea con un filo brillante por delante, Psyche crece desde nada, y sale el
primer pulso. Dura dos segundos y medio.

Todo el código es abierto y se aloja donde quieras. Sin plataforma de por
medio salvo que se active Variant para iPhone.

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
js/anchoring.js             modo imagen: anclaje por cartela y retención
js/xr.js                    modo libre: retícula, colocación y anclas WebXR
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
vercel.json                 cabeceras de caché para la publicación
.vercelignore               lo que no viaja al servidor
models/                     aquí va psyche.glb si quieres el modelo bueno
```

---

## Montaje en sala, paso a paso

### 1. Medir la pieza

Abre `js/config.js` y rellena el bloque `PIEZA` con las medidas reales, en
metros: separación entre los ejes de los tubos, radio del tubo, paso entre
bloques, dimensiones del bloque y voladizo. De ahí sale toda la escala.

### 2. Imprimir la cartela

En `targets/imprimir/marcador-A.png`, a 300 ppp. **A3 apaisado, mate.** El
papel brillante refleja los focos y el seguimiento se cae.

En modo imagen una cartela se sigue bien hasta unas 6 u 8 veces su anchura. En
modo libre solo hace falta verla una vez, pero la retícula tiene que poder
centrarse en la cruz con comodidad.

| Ancho impreso | Distancia de entrada |
|---|---|
| A4, 297 mm | hasta ~2 m |
| A3, 420 mm | hasta ~3 m |
| A2, 594 mm | hasta ~4 m |

Anota el ancho real en milímetros: va en `anchoImpreso`.

### 3. Colgarla y marcar el suelo

La cartela va en la pared de fondo, centrada sobre el recorrido de los tubos, a
la altura de la vista. En el suelo, a dos o tres metros de la pared y frente a
la cartela, una marca: un círculo de vinilo o cinta. Es desde donde el
visitante apunta y toca; después ya no importa dónde esté.

Si la sala lo pide se pueden añadir más cartelas al array `MARCADORES`; el
orden tiene que coincidir con el de compilación de `targets.mind` (A, B, C, D).

### 4. Decirle a la app dónde está la cartela

En `MARCADORES` de `js/config.js`:

- `anchoImpreso`: el ancho real impreso, en metros.
- `posicion`: `[x, y, z]` del centro de la cartela, en metros, medidos desde el
  centro del recorrido de los tubos. `+X` a lo largo de los tubos, `+Y` arriba,
  `+Z` hacia el espectador. Centrada en la pared de fondo, a 34 cm sobre los
  tubos y 12 cm por detrás de su eje: `[0, 0.34, -0.12]`.
- `rotacionDeg`: `[0,0,0]` plana en la pared mirando al espectador;
  `[-90,0,0]` tumbada boca arriba sobre una peana.

Los mismos números valen para los dos modos.

### 5. Calibrar con la pieza delante

Abre la app con `?modo=imagen&calibrar=1` al final de la URL. Se enciende la capa **guía de
encaje**: un calco en alambre de los tubos y los bloques, más un rectángulo rojo
donde la app cree que está cada cartela.

Apunta a una cartela y mueve los deslizadores hasta que el alambre se pegue al
cobre real. Repite con cada cartela. Cuando las cuatro encajen, pulsa **copiar
calibración** y pega el bloque en `js/config.js`.

Esto es lo que hace que la obra se superponga de verdad y no flote a un palmo.

### 6. Publicar

La AR necesita **https** obligatoriamente; sin certificado el navegador no da
la cámara. Por red local no vale: `http://192.168.x.x` no es sitio seguro.

Desde esta misma carpeta, en Terminal:

```bash
cd ~/Desktop/"GREY SPACES AR"
npx vercel login      # solo la primera vez
npx vercel --prod
```

No hay build: es estático puro, Vercel lo sirve tal cual. `vercel.json` fija
las cabeceras de caché para que `vendor/`, las fuentes y `targets.mind` no se
vuelvan a descargar en cada visita, que es lo que hace que la segunda carga en
sala sea instantánea. `.vercelignore` deja fuera el zip y el arranque local.

Para colgarlo del dominio propio, en el panel de Vercel, proyecto → Settings →
Domains, añadir por ejemplo `greyspaces.iridia.world` y crear en el DNS el CNAME
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
| `?modo=libre` / `?modo=imagen` | fuerza el modo de anclaje |
| `?previa=1` | la misma escena sin cámara, con órbita, para verla en el ordenador |
| `?nacer=0.4` | congela la materialización en ese punto, para revisarla |
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

El verde de IRIDIA es `rgb(0,255,33)`, o sea `#00FF21`, y está en un solo sitio, `PALETA.campo` de
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
