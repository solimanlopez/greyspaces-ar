#!/bin/bash
# ==========================================================================
# GREY SPACES · AR — arranque local
# IRIDIA / SLStudio
#
# Doble clic y listo. Levanta un servidor en esta carpeta y abre el navegador.
# Hace falta servidor porque el navegador no da acceso a la cámara ni carga
# módulos desde un archivo suelto. localhost cuenta como sitio seguro, así que
# en este ordenador la webcam funciona sin certificado.
#
# También queda visible para el móvil en la misma wifi, pero ojo: por red local
# la dirección es http, y sin https ningún navegador da la cámara. Desde el
# móvil se puede ver la vista previa y la guía, no la AR. Para la AR en el móvil
# hay que publicar la carpeta con https.
# ==========================================================================

cd "$(dirname "$0")" || exit 1

PUERTO=8123
libre() { ! lsof -nP -iTCP:"$1" -sTCP:LISTEN >/dev/null 2>&1; }
while ! libre "$PUERTO"; do PUERTO=$((PUERTO + 1)); done

IP=""
for IFAZ in en0 en1 en2 en3 en4 en5; do
  IP=$(ipconfig getifaddr "$IFAZ" 2>/dev/null) && [ -n "$IP" ] && break
done

printf '\n  GREY SPACES · AR\n'
printf '  carpeta        %s\n' "$(pwd)"
printf '  en este Mac    http://localhost:%s/inicio.html\n' "$PUERTO"
if [ -n "$IP" ]; then
  printf '  desde el movil http://%s:%s/inicio.html   (misma wifi, sin camara)\n' "$IP" "$PUERTO"
fi
printf '\n'

if command -v python3 >/dev/null 2>&1; then
  python3 -m http.server "$PUERTO" --bind 0.0.0.0 >/dev/null 2>&1 &
  SRV=$!
elif command -v node >/dev/null 2>&1; then
  node tools/servidor.js "$PUERTO" >/dev/null 2>&1 &
  SRV=$!
else
  printf '  No encuentro ni python3 ni node en este ordenador.\n'
  printf '  Instala las herramientas de linea de comandos con:\n\n'
  printf '      xcode-select --install\n\n'
  printf '  y vuelve a hacer doble clic aqui.\n\n'
  read -r -p '  Pulsa Intro para cerrar. '
  exit 1
fi

limpiar() { kill "$SRV" >/dev/null 2>&1; }
trap limpiar EXIT INT TERM

sleep 1
if ! kill -0 "$SRV" >/dev/null 2>&1; then
  printf '  El servidor no arranco. Prueba a ejecutar en esta carpeta:\n'
  printf '      python3 -m http.server %s\n\n' "$PUERTO"
  read -r -p '  Pulsa Intro para cerrar. '
  exit 1
fi

open "http://localhost:$PUERTO/inicio.html"

printf '  Listo. Deja esta ventana abierta mientras trabajas.\n'
printf '  Para parar: Ctrl+C, o cierra esta ventana.\n\n'
wait "$SRV"
