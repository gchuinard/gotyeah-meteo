#!/bin/bash
# Déploiement de Météo sur le Pi. Ce script ne se lance pas à la main : il est
# exécuté par /usr/local/sbin/gotyeah-deploy (commande forcée de la clé
# DEPLOY_SSH_KEY dans authorized_keys), juste après le git pull de main, depuis
# /home/pi/sites/gotyeah-meteo. Argument : le commit déployé avant celui-ci.
# Modifier ce fichier suffit : le prochain déploiement lance la version de main.
set -euo pipefail

# --wait : la commande échoue (et le job de CI avec) si un conteneur ne devient pas sain.
docker compose -f docker-compose.yml --env-file .env up -d --build --force-recreate --wait
