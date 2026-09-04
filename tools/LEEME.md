# tools/

- `generar-marcadores.py` — genera las cuatro cartelas en `targets/imprimir`
  (300 ppp, listas para imprenta) y `targets/compilar` (1024 px, para el
  compilador). Necesita `pillow` y `numpy`, y `Lato-300.ttf` en la carpeta que
  le pases con `--lato`; si no lo encuentra usa una tipografía del sistema.

- `compilar.html` — compila `targets/targets.mind` a partir de las imágenes,
  entero en el navegador y sin subir nada a ningún sitio. Ábrelo desde el mismo
  servidor local que la aplicación.

- `previa-embebida.js` — punto de entrada para empaquetar solo la escena, sin
  cámara ni marcadores, y empotrarla en otra página (una nota de prensa, un
  dossier). Se compila con esbuild desde la raíz del proyecto:

      npx esbuild tools/previa-embebida.js --bundle --format=iife \
        --global-name=GS --minify \
        --alias:three=./vendor/three/three.module.js \
        "--alias:three/addons/controls/OrbitControls.js=./vendor/three/addons/controls/OrbitControls.js" \
        --outfile=previa.js

  Luego `GS.montar(document.querySelector('#contenedor'))`.
