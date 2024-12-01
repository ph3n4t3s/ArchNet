#!/bin/bash

# Charger les variables d'environnement
if [ ! -f ".env" ]; then
    echo -e "${RED}Fichier .env non trouvé${NC}"
    exit 1
fi

set -a
source .env
set +a

# Configuration des couleurs et du timestamp
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_DIR="backups/${TIMESTAMP}"

# Fonction de log
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

error() {
    echo -e "${RED}[ERROR] $1${NC}"
    exit 1
}

# Création du répertoire de backup
mkdir -p "${BACKUP_DIR}"

# Backup de la base de données InfluxDB
backup_influxdb() {
    log "Backup de la base de données InfluxDB..."
    docker exec archnet_influxdb influx backup \
        --org ${INFLUXDB_ORG} \
        --token ${INFLUXDB_TOKEN} \
        --bucket ${INFLUXDB_BUCKET} \
        /backup

    docker cp archnet_influxdb:/backup "${BACKUP_DIR}/influxdb"
}

# Backup des configurations
backup_configs() {
    log "Backup des fichiers de configuration..."
    cp .env "${BACKUP_DIR}/"
    cp -r docker/nginx/conf.d "${BACKUP_DIR}/nginx_conf"
    cp -r docker/nginx/certs "${BACKUP_DIR}/nginx_certs"
}

# Backup des logs
backup_logs() {
    log "Backup des logs..."
    cp -r logs "${BACKUP_DIR}/logs"
}

# Compression du backup
compress_backup() {
    log "Compression du backup..."
    cd backups
    tar -czf "${TIMESTAMP}.tar.gz" "${TIMESTAMP}"
    rm -rf "${TIMESTAMP}"
    cd ..
}

# Nettoyage des anciens backups
cleanup_old_backups() {
    log "Nettoyage des anciens backups..."
    find backups -name "*.tar.gz" -mtime +7 -delete
}

# Fonction principale
main() {
    log "Démarrage du backup de ${APP_NAME}..."

    backup_influxdb
    backup_configs
    backup_logs
    compress_backup
    cleanup_old_backups

    log "Backup terminé avec succès!"
    log "Fichier de backup: backups/${TIMESTAMP}.tar.gz"
}

# Exécution
main "$@"
