# GREY SPACES · AR

La parte invisible de la instalación: la radiofrecuencia que circula por los dos
tubos de cobre, el pulso recorriendo los diez hitos de distancia, y 16 Psyche
flotando en el centro de la obra.

Funciona en el navegador del móvil del visitante, iPhone y Android, sin instalar
nada. Se entra por un QR en sala. La app publicada va en inglés; este README y
los comentarios del código, en castellano.

**Grey Spaces Exhibition · Foundry, Downtown Dubai.** La bienvenida lleva esa
mención, el mezzotint de 16 Psyche, y el contador de distancias corriendo al
paso del pulso. Sin brillos ni efectos de plantilla: una cartela.

---

## Cómo se ancla

Un trigger físico emplaza la obra (en la interfaz se le llama *celestial body*,
nunca cartela). Hay dos, y los dos van compilados en `targets/targets.mind`:

- **La tarjeta del QR en el suelo, junto a la obra.** Es el principal. La misma
  tarjeta que abre la app sirve para anclarla: el visitante escanea, se abre la
  app, apunta al mismo QR y aparece la obra. Imprimirla a **30 cm de ancho**,
  papel mate, plastificado mate o bajo metacrilato mate. Colocarla con el
  título "AR Grey Spaces" del lado del visitante. Probada en simulación de pie
  mirando al suelo en ángulo, cerca y lejos: ancla en menos de tres segundos.
- **La plancha de cobre con el mezzotint de 16 Psyche.** También ancla, en sala
  clara y en sala oscura. Su único punto débil es el cobre pulido: si refleja
  algo oscuro y queda más oscuro que la marca del láser, el contraste se
  invierte y el seguimiento la pierde. Por eso va compilada dos veces, normal e
  invertida, apuntando al mismo sitio (`A` y `A2` en `config.js`). Cuando la
  plancha esté colgada hay que medir su posición respecto a los tubos y ponerla
  en `MARCADORES`.

Después de anclarse, la pieza se queda quieta y es el visitante quien se
mueve. Lo que sostiene la obra en su sitio depende de lo
que sepa hacer el móvil, y en 2026 eso divide el mundo en dos:

- **Modo libre, Android con Chrome.** WebXR, o sea SLAM de verdad. El
  visitante centra la retícula en el trigger y toca la pantalla. La
  obra se ancla a ese punto del espacio (`XRAnchor`) y ya puede caminar a lo
  largo de los tubos, rodear la pieza, agacharse. Sigue ahí. Hay un botón de
  recolocar por si el primer anclaje no convence.
- **Modo imagen, iPhone y respaldo.** Safari no expone WebXR. El móvil
  reconoce el trigger y sostiene la obra mientras lo tenga a la vista, y unos
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
`targets/imprimir/qr-cartela.png` en el móvil o imprímela, ponla frente a la
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
js/anchoring.js             modo imagen: anclaje por trigger y retención
js/xr.js                    modo libre: retícula, colocación y anclas WebXR
js/rf-field.js              el campo de radiofrecuencia
js/psyche.js                el asteroide
js/piece.js                 calco en alambre de tubos y bloques, para calibrar
js/ui.js                    estado, capas y panel de calibración
css/                        estilos y Lato autoalojada
vendor/                     three.js 0.160 y MindAR 1.2.5, servidos en local
targets/targets.mind        archivo de seguimiento ya compilado
targets/imprimir/           qr-cartela.png (el trigger principal, imprimir a 30 cm)
                            y qr-solo.png; las cartelas de papel antiguas siguen ahí
targets/compilar/           qr-A.png, plancha-A.png y plancha-A-inv.png: lo que está
                            compilado en targets.mind, en ese orden
tools/generar-qr.py         genera la tarjeta del QR: python3 tools/generar-qr.py https://ar.iridia.world
tools/generar-pdf-placeholder.py  genera un docs/grey-spaces.pdf provisional
docs/grey-spaces.pdf        el PDF de la obra que abre "About the work". SUSTITUIR
                            por el definitivo con el mismo nombre y publicar
img/psyche-mezzotint.webp   el grabado de la plancha, para la bienvenida
js/portada.js               la animación de la bienvenida (canvas 2D, sin librerías)
tools/compilar.html         compila targets.mind en local, sin subir nada
tools/servidor.js           servidor estático, por si no hay python3
vercel.json                 cabeceras de caché para la publicación
.vercelignore               lo que no viaja al servidor
models/                     aquí va psyche.glb si quieres el modelo bueno
```

---

## Enlaces y PDF

En la bienvenida y en la barra inferior de la vista AR hay tres enlaces fijos:
*About the work (PDF)*, *solimanlopez.com* e *iridia.world*. Se definen en
`ENLACES` dentro de `js/config.js`.

El PDF vive en `docs/grey-spaces.pdf`. Para poner el bueno: copiar tu PDF a la
carpeta `docs`, con ese mismo nombre, sustituyendo al que hay; luego
`GUARDAR-CAMBIOS.command` y `PUBLICAR.command`. Nada más que tocar.

---

## Montaje en sala, paso a paso

### 1. Medir la pieza

Abre `js/config.js` y rellena el bloque `PIEZA` con las medidas reales, en
metros: separación entre los ejes de los tubos, radio del tubo, paso entre
bloques, dimensiones del bloque y voladizo. De ahí sale toda la escala.

### 2. Imprimir la tarjeta del QR

`targets/imprimir/qr-cartela.png` (100 x 111 mm a 300 ppp) impresa a **30 cm de
ancho**, mate. Es a la vez la entrada a la app y el trigger, así que tiene que
sobrevivir a la sala: plastificado mate o bajo un metacrilato mate, nunca
brillante, que los focos se reflejan y el seguimiento se cae. El papel puede
ir pegado sobre un cartón pluma o una plancha fina para que no se levante.

En modo imagen un trigger se sigue bien hasta unas 6 u 8 veces su anchura; a
30 cm eso son unos 2 m, más que de sobra para alguien de pie mirándolo. En
modo libre solo hace falta verlo una vez.

Anota el ancho real en metros: va en `anchoImpreso`. Si lo imprimes a otro
tamaño, cambia ese número y nada más.

### 3. Colocar los triggers

**La tarjeta** va en el suelo, delante de la obra, centrada en el recorrido de
los tubos y a medio metro largo del eje de los tubos hacia el visitante, con el
título *AR Grey Spaces* del lado del visitante. Fíjala con cinta de doble cara
de moqueta para que nadie la mueva con el pie.

**La plancha de cobre** va donde la obra la pida (pared de fondo o peana). Mide
la posición de su centro respecto al centro de los tubos.

### 4. Decirle a la app dónde está cada trigger

En `MARCADORES` de `js/config.js`:

- `anchoImpreso`: el ancho real, en metros, de la imagen completa (la tarjeta
  entera, la plancha entera).
- `posicion`: `[x, y, z]` del centro del trigger, en metros, medidos desde el
  centro del recorrido de los tubos. `+X` a lo largo de los tubos, `+Y` arriba,
  `+Z` hacia el espectador. La tarjeta en el suelo, 55 cm delante de los tubos:
  `[0, -0.04, 0.55]` (el -0.04 es porque el eje del tubo va a 4 cm del suelo).
  La plancha centrada en la pared de fondo, a 34 cm sobre los tubos y 12 cm
  por detrás: `[0, 0.34, -0.12]`. `A2` lleva siempre lo mismo que `A`.
- `rotacionDeg`: `[0,0,0]` plano en la pared mirando al espectador;
  `[-90,0,0]` tumbado boca arriba en el suelo.

Los mismos números valen para los dos modos.

### 5. Calibrar con la pieza delante

Abre la app con `?modo=imagen&calibrar=1` al final de la URL. Se enciende la capa **guía de
encaje**: un calco en alambre de los tubos y los bloques, más un rectángulo rojo
donde la app cree que está cada trigger.

Apunta a un trigger y mueve los deslizadores hasta que el alambre se pegue al
cobre real. Repite con el otro. Cuando encajen, pulsa **copy calibration** y
pega el bloque en `js/config.js`.

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

El dominio de la obra es `ar.iridia.world`: en Vercel, Settings → Domains, y
en Cloudflare un CNAME `ar` → `cname.vercel-dns.com` con el proxy apagado. No
cambiar los nameservers del dominio, que se llevaría por delante el resto de
iridia.world.

En iPhone hay que abrirlo en **Safari**. Instagram, WhatsApp y otros navegadores
embebidos no dan acceso a la cámara.

---

## Si cambias los triggers

1. Si cambias la tarjeta: `python3 tools/generar-qr.py https://ar.iridia.world`
   y luego `targets/compilar/qr-A.png` sale de reducir `qr-cartela.png` a 768 px
   de ancho. Si cambias el grabado de la plancha: `plancha-A.png` es el grabado
   sobre blanco a 768 x 1024 (la proporción de la plancha), y
   `plancha-A-inv.png` el mismo invertido.
2. Abre `tools/compilar.html` en el navegador, elige **qr-A, plancha-A,
   plancha-A-inv, en ese orden**, compila, y guarda el resultado como
   `targets/targets.mind`. El orden tiene que coincidir con `MARCADORES`.

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
- `ANCLAJE.retencionSegundos` — cuánto aguanta la obra sin ver ningún trigger.

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
