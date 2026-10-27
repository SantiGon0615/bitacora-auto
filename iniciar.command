#!/bin/zsh
# Doble clic: instala dependencias (la primera vez) y levanta la Bitácora de autos.
cd "$(dirname "$0")"
export PATH="/opt/homebrew/bin:/usr/local/bin:$HOME/.nvm/versions/node/$(ls $HOME/.nvm/versions/node 2>/dev/null | tail -1)/bin:$PATH"

if ! command -v npm >/dev/null 2>&1; then
  echo ""
  echo "No encontré Node.js en esta Mac."
  echo "Instalalo desde https://nodejs.org (versión LTS) y volvé a hacer doble clic en este archivo."
  open "https://nodejs.org/es/download"
  read -k1 "?Tocá una tecla para cerrar..."
  exit 1
fi

echo "Node $(node -v) / npm $(npm -v)"

# Una sola vez: recrear los archivos del repo con el usuario de esta Mac
# (los que se copiaron desde Claude pueden quedar sin permiso de escritura)
if [ -d .git ] && [ ! -f .git/.permisos-ok ] && command -v git >/dev/null 2>&1; then
  echo "Acomodando permisos de los archivos (solo la primera vez)..."
  git rm -r --cached -q . && git reset --hard -q && touch .git/.permisos-ok
fi

# Traer la última versión del repo (sin pisar cambios locales)
if [ -d .git ] && command -v git >/dev/null 2>&1; then
  echo "Buscando actualizaciones en GitHub..."
  git pull --ff-only --quiet || echo "(No se pudo actualizar desde GitHub, sigo con la versión local)"
fi

if [ ! -d node_modules ] || [ package-lock.json -nt node_modules ]; then
  echo "Instalando dependencias (solo la primera vez)..."
  npm install --no-audit --no-fund || { read -k1 "?Falló npm install. Tocá una tecla..."; exit 1; }
fi

echo ""
echo "Abriendo http://localhost:5173 ... (para frenar la app: Ctrl+C o cerrá esta ventana)"
( sleep 3; open "http://localhost:5173" ) &
npm run dev
