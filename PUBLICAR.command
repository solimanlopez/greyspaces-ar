#!/bin/bash
# ==========================================================================
# GREY SPACES · AR — publicar en Vercel
# IRIDIA / SLStudio
#
# Doble clic. Antes de subir nada te dice con que cuenta de Vercel esta a
# punto de publicar y te deja cambiarla. Al terminar deja la URL https en el
# portapapeles y en URL-PUBLICADA.txt.
# ==========================================================================

cd "$(dirname "$0")" || exit 1
V="npx --yes vercel@latest"

printf '\n  GREY SPACES · AR — publicar\n'
printf '  carpeta  %s\n\n' "$(pwd)"

if ! command -v npx >/dev/null 2>&1; then
  printf '  Necesito node instalado. En Mac:  brew install node\n'
  printf '  o descargalo de nodejs.org, y vuelve a hacer doble clic aqui.\n\n'
  read -r -p '  Pulsa Intro para cerrar. '
  exit 1
fi

# ---- cuenta -------------------------------------------------------------
CUENTA=$($V whoami 2>/dev/null | tail -1 | tr -d '[:space:]')

if [ -n "$CUENTA" ]; then
  printf '  Sesion de Vercel iniciada como:  %s\n\n' "$CUENTA"
  read -r -p '  ¿Publicar con esta cuenta? [s/N] ' RESP
  case "$RESP" in
    s|S|si|SI|Si|y|Y) ;;
    *)
      printf '\n  Cerrando sesion. Entra con la cuenta correcta.\n\n'
      $V logout
      CUENTA=""
      ;;
  esac
fi

if [ -z "$CUENTA" ]; then
  printf '\n  Se abrira el navegador para iniciar sesion en Vercel.\n'
  printf '  Elige "Continue with Email" y usa solimanlopez@gmail.com si esa\n'
  printf '  es la cuenta donde quieres centralizar los proyectos.\n\n'
  $V login || {
    printf '\n  No se completo el inicio de sesion.\n\n'
    read -r -p '  Pulsa Intro para cerrar. '
    exit 1
  }
  CUENTA=$($V whoami 2>/dev/null | tail -1 | tr -d '[:space:]')
  printf '\n  Ahora: %s\n\n' "$CUENTA"
fi

# ---- desplegar ----------------------------------------------------------
printf '  Subiendo, son unos 15 MB.\n\n'
SALIDA=$(mktemp)

if [ -f .vercel/project.json ]; then
  # Ya hay proyecto enlazado: republica directo.
  $V --prod --yes 2>&1 | tee "$SALIDA"
else
  # Primera vez: sin --yes, para que elijas equipo y nombre de proyecto.
  printf '  Primera publicacion. Te preguntara equipo y nombre de proyecto.\n'
  printf '  Elige el equipo de la cuenta correcta, proyecto nuevo, y acepta\n'
  printf '  ./ como directorio.\n\n'
  $V --prod 2>&1 | tee "$SALIDA"
fi

URL=$(grep -Eo 'https://[a-zA-Z0-9._-]+\.vercel\.app' "$SALIDA" | tail -1)
rm -f "$SALIDA"

if [ -z "$URL" ]; then
  printf '\n  No he podido leer la URL de la salida de arriba. Buscala ahi,\n'
  printf '  en la linea que pone Production.\n\n'
  read -r -p '  Pulsa Intro para cerrar. '
  exit 1
fi

printf '%s' "$URL" | pbcopy
printf '%s\n' "$URL" > URL-PUBLICADA.txt

printf '\n  ------------------------------------------------------------\n'
printf '  Publicado con %s\n' "$CUENTA"
printf '  %s\n' "$URL"
printf '  Copiada al portapapeles y guardada en URL-PUBLICADA.txt\n'
printf '  ------------------------------------------------------------\n\n'
printf '  Abrela en el movil y ya tienes la AR con camara.\n'
printf '  Para colgarla de greyspaces.iridia.world: panel de Vercel,\n'
printf '  proyecto, Settings, Domains.\n\n'

open "$URL"
read -r -p '  Pulsa Intro para cerrar. '
