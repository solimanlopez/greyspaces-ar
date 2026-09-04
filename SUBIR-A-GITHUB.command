#!/bin/bash
# ==========================================================================
# GREY SPACES · AR — crear el repositorio y subirlo
# IRIDIA / SLStudio
#
# Doble clic. Inicializa git en esta carpeta, hace el primer commit y crea
# el repositorio en GitHub. A partir de ahi, cada cambio se sube con
# GUARDAR-CAMBIOS.command.
# ==========================================================================

cd "$(dirname "$0")" || exit 1
NOMBRE="greyspaces-ar"
DESC="GREY SPACES AR — the radio-frequency field and 16 Psyche in augmented reality over the installation. IRIDIA / SLStudio."

printf '\n  GREY SPACES · AR — repositorio\n'
printf '  carpeta  %s\n\n' "$(pwd)"

if ! command -v git >/dev/null 2>&1; then
  printf '  Falta git. Instalalo con:  xcode-select --install\n\n'
  read -r -p '  Pulsa Intro para cerrar. '; exit 1
fi

if [ -d .git ]; then
  printf '  Ya hay un repositorio aqui. Usa GUARDAR-CAMBIOS.command.\n\n'
  read -r -p '  Pulsa Intro para cerrar. '; exit 0
fi

git init -b main >/dev/null 2>&1
git add -A
git -c user.useConfigOnly=false commit -m "GREY SPACES AR: capa de realidad aumentada de la instalacion" >/dev/null 2>&1 || {
  printf '  Git necesita saber quien eres. Ejecuta una vez:\n\n'
  printf '      git config --global user.name "Soliman Lopez"\n'
  printf '      git config --global user.email "solimanlopez@gmail.com"\n\n'
  printf '  y vuelve a hacer doble clic aqui.\n\n'
  read -r -p '  Pulsa Intro para cerrar. '; exit 1
}
printf '  Primer commit hecho.\n\n'

if command -v gh >/dev/null 2>&1; then
  if ! gh auth status >/dev/null 2>&1; then
    printf '  Entrando en GitHub.\n\n'
    gh auth login || { read -r -p '  Pulsa Intro para cerrar. '; exit 1; }
  fi
  printf '  Creando el repositorio publico %s\n\n' "$NOMBRE"
  gh repo create "$NOMBRE" --public --source=. --remote=origin --push --description "$DESC" && {
    printf '\n  Listo. Repositorio creado y subido.\n'
    printf '  Ahora conectalo en Vercel: Add New, Project, Import Git Repository.\n\n'
    gh repo view --web
  }
else
  printf '  No tienes la herramienta de GitHub instalada. Dos opciones:\n\n'
  printf '  A) Instalarla y volver aqui:   brew install gh\n\n'
  printf '  B) A mano: crea el repositorio %s en github.com/new,\n' "$NOMBRE"
  printf '     publico y vacio, y luego ejecuta en esta carpeta:\n\n'
  printf '       git remote add origin https://github.com/TU-USUARIO/%s.git\n' "$NOMBRE"
  printf '       git push -u origin main\n\n'
fi

read -r -p '  Pulsa Intro para cerrar. '
