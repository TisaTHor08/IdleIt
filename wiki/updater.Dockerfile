# Conteneur « updater » : suit le dépôt GitHub et régénère le site quand il change (voir updater.sh).
FROM node:20-alpine
RUN apk add --no-cache git coreutils
COPY wiki/updater.sh /usr/local/bin/updater.sh
RUN chmod +x /usr/local/bin/updater.sh && mkdir -p /repo /site && chown node:node /repo /site
USER node
CMD ["/usr/local/bin/updater.sh"]
