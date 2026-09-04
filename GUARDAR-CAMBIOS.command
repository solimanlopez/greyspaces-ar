#!/bin/bash
# ==========================================================================
# GREY SPACES · AR — guardar y subir los cambios
# IRIDIA / SLStudio
#
# Doble clic despues de tocar la calibracion o cualquier otra cosa. Guarda
# una version y la sube. Si Vercel esta conectado al repositorio, publica
# sola en cuanto termine.
# ==========================================================================

cd "$(dirname "$0")" || exit 1

printf '\n  GREY SPACES · AR — guardar cambios\n\n'

if [ ! -d .git ]; then
  printf '  Aqui todavia no hay repositorio. Usa SUBIR-A-GITHUB.command.\n\n'
  read -r -p '  Pulsa Intro para cerrar. '; exit 1
fi

git status --short
printf '\n'

if [ -z "$(git status --porcelain)" ]; then
  printf '  No hay nada nuevo que guardar.\n\n'
  read -r -p '  Pulsa Intro para cerrar. '; exit 0
fi

read -r -p '  Describe el cambio en una linea: ' MENSAJE
[ -z "$MENSAJE" ] && MENSAJE="ajustes"

git add -A
git commit -m "$MENSAJE" || { read -r -p '  Pulsa Intro para cerrar. '; exit 1; }
git push && printf '\n  Subido. Si Vercel esta conectado, ya esta publicando.\n\n'

read -r -p '  Pulsa Intro para cerrar. '
