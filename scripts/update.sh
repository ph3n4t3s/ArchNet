#!/bin/bash

# Charger les variables d'environnement
if [ ! -f ".env" ]; then
    echo -e "${RED}Fichier .env non trouvé${NC}"
    exit 1
fi

set -a
source .env
set +a

# Configuration des couleurs
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration des versions
VERSION_FILE="version.json"
BACKUP_DIR="backups"
TEMP_DIR="temp"
UPDATE_LOG="${LOG_DIR}/update.log"

# Fonction de log
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] $1" >> "$UPDATE_LOG"
}

error() {
    echo -e "${RED}[ERROR] $1${NC}"
    echo "[ERROR] $1" >> "$UPDATE_LOG"
    exit 1
}

# Création des répertoires nécessaires
init_directories() {
    mkdir -p "$BACKUP_DIR"
    mkdir -p "$TEMP_DIR"
    mkdir -p "$LOG_DIR"
}

# Vérification de la version actuelle
check_current_version() {
    if [ ! -f "$VERSION_FILE" ]; then
        echo '{
            "version": "'${APP_VERSION}'",
            "last_update": "'$(date -u +"%Y-%m-%dT%H:%M:%SZ")'",
            "components": {
                "frontend": "'${APP_VERSION}'",
                "backend": "'${APP_VERSION}'",
                "monitoring": "'${APP_VERSION}'"
            }
        }' > "$VERSION_FILE"
    fi
    
    current_version=$(jq -r '.version' "$VERSION_FILE")
    log "Version actuelle: $current_version"
}

# Création d'une sauvegarde avant mise à jour
create_backup() {
    log "Création d'une sauvegarde..."
    
    backup_name="backup_${APP_VERSION}_$(date +%Y%m%d_%H%M%S)"
    
    # Exécuter le script de backup
    ./scripts/backup.sh || error "Échec de la sauvegarde"
    
    log "Sauvegarde créée: $backup_name"
}

# Arrêt des services
stop_services() {
    log "Arrêt des services..."
    docker-compose down || error "Échec de l'arrêt des services"
}

# Mise à jour des containers Docker
update_containers() {
    log "Mise à jour des containers..."
    
    # Pull des nouvelles images
    docker-compose pull || error "Échec du pull des images"
    
    # Reconstruction des images locales
    docker-compose build --pull || error "Échec de la reconstruction des images"
}

# Mise à jour des dépendances
update_dependencies() {
    log "Mise à jour des dépendances..."
    
    # Mise à jour des dépendances Node.js
    npm update || error "Échec de la mise à jour des dépendances Node.js"
    
    # Mise à jour des dépendances Python
    pip3 install -r requirements.txt --upgrade || \
        warn "Échec de la mise à jour des dépendances Python"
}

# Migration des données si nécessaire
migrate_data() {
    log "Vérification des migrations..."
    
    if [ -f "migrations/current.sql" ]; then
        log "Exécution des migrations..."
        # Exécuter les migrations
        docker-compose exec -T database psql -U "$DB_USER" -d "$DB_NAME" \
            < migrations/current.sql || error "Échec des migrations"
    fi
}

# Démarrage des services mis à jour
start_services() {
    log "Démarrage des services..."
    docker-compose up -d || error "Échec du démarrage des services"
}

# Vérification post-mise à jour
verify_update() {
    log "Vérification de la mise à jour..."
    
    # Vérifier que tous les services sont up
    sleep 10 # Attendre que les services démarrent
    
    if ! docker-compose ps | grep -q "Up"; then
        error "Les services ne sont pas correctement démarrés"
    fi
    
    # Vérifier l'API
    if ! curl -s "${API_URL}/health" > /dev/null; then
        error "L'API n'est pas accessible"
    fi
    
    log "Vérification réussie"
}

# Mise à jour du fichier de version
update_version_file() {
    log "Mise à jour du fichier de version..."
    
    echo '{
        "version": "'${APP_VERSION}'",
        "last_update": "'$(date -u +"%Y-%m-%dT%H:%M:%SZ")'",
        "components": {
            "frontend": "'${APP_VERSION}'",
            "backend": "'${APP_VERSION}'",
            "monitoring": "'${APP_VERSION}'"
        }
    }' > "$VERSION_FILE"
}

# Nettoyage post-mise à jour
cleanup() {
    log "Nettoyage..."
    
    # Supprimer les anciennes images Docker
    docker image prune -f
    
    # Supprimer les fichiers temporaires
    rm -rf "$TEMP_DIR"/*
    
    # Nettoyer les anciens logs
    find "$LOG_DIR" -type f -name "*.log" -mtime +30 -delete
}

# Restauration en cas d'échec
rollback() {
    log "Échec de la mise à jour, restauration..."
    
    # Arrêter les services
    docker-compose down
    
    # Restaurer la dernière sauvegarde
    latest_backup=$(ls -t "$BACKUP_DIR" | head -1)
    if [ -n "$latest_backup" ]; then
        ./scripts/backup.sh restore "$latest_backup" || \
            error "Échec de la restauration"
    fi
    
    # Redémarrer les services
    docker-compose up -d
    
    error "Mise à jour échouée, restauration effectuée"
}

# Afficher l'aide
show_help() {
    echo -e "\n${BLUE}Usage:${NC}"
    echo "  $0 check               - Vérifier la version actuelle"
    echo "  $0 update [--force]    - Effectuer la mise à jour"
    echo "  $0 rollback           - Restaurer la version précédente"
}

# Fonction principale
main() {
    init_directories
    
    case "$1" in
        check)
            check_current_version
            ;;
        update)
            log "Début de la mise à jour..."
            
            check_current_version
            create_backup
            stop_services
            update_containers
            update_dependencies
            migrate_data
            start_services
            verify_update
            update_version_file
            cleanup
            
            log "Mise à jour terminée avec succès!"
            ;;
        rollback)
            rollback
            ;;
        *)
            show_help
            ;;
    esac
}

# Gestion des erreurs
trap 'rollback' ERR

# Exécution
main "$@"
