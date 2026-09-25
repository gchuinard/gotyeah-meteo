#!/bin/bash
# Déploiement de Météo sur le Pi. Ce script ne se lance pas à la main : il est
# exécuté par /usr/local/sbin/gotyeah-deploy (commande forcée de la clé
# DEPLOY_SSH_KEY dans authorized_keys), depuis /home/pi/sites/gotyeah-meteo, après un git fetch.
# Variables reçues : CIBLE (commit à déployer), AVANT (commit en place).
# Le script est lu dans le commit CIBLE : le modifier sur main suffit.
set -euo pipefail

git merge --ff-only "$CIBLE"
# --wait : la commande échoue (et le job de CI avec) si un conteneur ne devient pas sain.
docker compose -f docker-compose.yml --env-file .env up -d --build --force-recreate --wait
