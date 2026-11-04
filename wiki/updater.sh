#!/bin/sh
# Mise à jour automatique du site Farmling (conteneur « updater », voir docker-compose.yml).
# Toutes les INTERVAL secondes : récupère la branche du dépôt ; si ce dont dépend le site a changé
# (dossier wiki/, générateur, données du jeu, éditeur, version), régénère le site puis le met en ligne
# d'un coup (bascule atomique du lien « live ») : nginx ne sert jamais un site à moitié construit.
set -eu

REPO_URL="${REPO_URL:-https://github.com/TisaTHor08/IdleIt.git}"
BRANCH="${BRANCH:-main}"
INTERVAL="${INTERVAL:-120}"
SRC="${SRC:-/repo}"   # copie du dépôt (volume, gardée entre deux redémarrages)
SITE="${SITE:-/site}"  # volume partagé avec nginx (lecture seule côté nginx)
WATCH="wiki tools/wiki tools/make-save-editor.js tools/save-editor.src.html src/renderer/js/data.js package.json"

log() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*"; }

# Empreinte de ce qui compose le site : les objets Git des chemins surveillés.
fingerprint() { (cd "$SRC" && for p in $WATCH; do git rev-parse "HEAD:$p" 2>/dev/null || echo "-"; done) | sha1sum | cut -d' ' -f1; }

build() {
  stamp=$(date +%s)
  out="$SITE/build-$stamp"
  log "construction du site ($(cd "$SRC" && git log -1 --format='%h %s'))"
  (cd "$SRC" && node tools/make-save-editor.js >/dev/null && rm -rf wiki/dist && SITE_URL="${SITE_URL:-}" node tools/wiki/build.js)
  cp -r "$SRC/wiki/dist" "$out"
  # Bascule atomique : le lien « live » pointe d'un coup sur le nouveau site.
  ln -sfn "build-$stamp" "$SITE/live.tmp" && mv -Tf "$SITE/live.tmp" "$SITE/live"
  # On garde seulement la version en ligne et la précédente.
  for old in $(ls -1d "$SITE"/build-* 2>/dev/null | sort | head -n -2); do rm -rf "$old"; done
  echo "$1" > "$SITE/.fingerprint"
  log "site en ligne : build-$stamp"
}

while :; do
  if [ ! -d "$SRC/.git" ]; then
    log "clonage de $REPO_URL ($BRANCH)"
    rm -rf "$SRC"/* "$SRC"/.[!.]* 2>/dev/null || true
    git clone --quiet --depth 1 --branch "$BRANCH" "$REPO_URL" "$SRC"
  elif git -C "$SRC" fetch --quiet --depth 1 origin "$BRANCH"; then
    git -C "$SRC" reset --quiet --hard FETCH_HEAD
  else
    log "dépôt injoignable, nouvel essai dans ${INTERVAL} s"
  fi
  fp=$(fingerprint)
  if [ ! -e "$SITE/live" ] || [ "$fp" != "$(cat "$SITE/.fingerprint" 2>/dev/null || true)" ]; then
    build "$fp" || log "ÉCHEC de la construction : le site en ligne reste inchangé"
  fi
  [ "${ONCE:-}" = 1 ] && break
  sleep "$INTERVAL"
done
