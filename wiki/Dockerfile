# Wiki de Farmling : généré à partir des données du jeu, servi par nginx.
# Image figée (sans mise à jour automatique), depuis la racine du dépôt :
#   docker build -f wiki/Dockerfile -t farmling-wiki . && docker run -d -p 47320:80 farmling-wiki
# Pour un site qui se met à jour tout seul, utiliser wiki/docker-compose.yml.

# Étape 1 : génération du site statique (aucune dépendance npm nécessaire)
FROM node:20-alpine AS build
WORKDIR /app
COPY package.json ./
COPY src/renderer/js/data.js src/renderer/js/data.js
COPY tools/make-save-editor.js tools/save-editor.src.html tools/
COPY tools/wiki/build.js tools/wiki/
COPY wiki/assets wiki/assets
# URL publique du site (canonical, og:image, sitemap.xml) : facultative
ARG SITE_URL=
RUN node tools/make-save-editor.js && SITE_URL="$SITE_URL" node tools/wiki/build.js

# Étape 2 : serveur web léger
FROM nginx:1.27-alpine
COPY wiki/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/wiki/dist /usr/share/nginx/html/live
EXPOSE 80
HEALTHCHECK --interval=30s --timeout=3s CMD wget -q --spider http://127.0.0.1/ || exit 1
