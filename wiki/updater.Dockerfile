# Conteneur « updater » : suit le dépôt GitHub et régénère le site quand il change (voir updater.sh).
FROM node:20-alpine
RUN apk add --no-cache git coreutils
COPY wiki/updater.sh /usr/local/bin/updater.sh
# Droits explicites (lecture + exécution pour tous) et fins de ligne Unix : un clone sur NAS peut avoir des droits
# restreints ou des CRLF, ce qui empêchait le script de démarrer.
RUN sed -i 's/\r$//' /usr/local/bin/updater.sh && chmod 0755 /usr/local/bin/updater.sh && mkdir -p /repo /site
# Root dans ce conteneur : il n'écrit que dans ses deux volumes, quels que soient les droits que le NAS leur donne.
# Il n'expose aucun port ; seul nginx (en lecture seule) est accessible.
CMD ["sh", "/usr/local/bin/updater.sh"]
