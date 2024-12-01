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

# Configuration des logs
LOG_DIR="logs"
ARCHIVE_DIR="${LOG_DIR}/archives"
ANALYSIS_DIR="${LOG_DIR}/analysis"
MAX_LOG_AGE=30 # jours

# Fonction de log
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

error() {
    echo -e "${RED}[ERROR] $1${NC}"
    exit 1
}

# Initialisation des répertoires
init_directories() {
    mkdir -p "$LOG_DIR"
    mkdir -p "$ARCHIVE_DIR"
    mkdir -p "$ANALYSIS_DIR"
}

# Rotation des logs
rotate_logs() {
    log "Rotation des logs..."
    
    find "$LOG_DIR" -type f -name "*.log" | while read -r logfile; do
        if [ -f "$logfile" ]; then
            filename=$(basename "$logfile")
            datestamp=$(date +%Y%m%d_%H%M%S)
            gzip -c "$logfile" > "${ARCHIVE_DIR}/${filename%.log}_${datestamp}.gz"
            : > "$logfile"  # Vider le fichier de log
            log "Rotation effectuée pour $filename"
        fi
    done
}

# Nettoyage des anciens logs
cleanup_old_logs() {
    log "Nettoyage des anciens logs..."
    
    # Supprimer les archives plus anciennes que MAX_LOG_AGE jours
    find "$ARCHIVE_DIR" -type f -name "*.gz" -mtime +${MAX_LOG_AGE} -delete
    
    # Supprimer les fichiers d'analyse plus anciens que 7 jours
    find "$ANALYSIS_DIR" -type f -mtime +7 -delete
}

# Analyse des logs
analyze_logs() {
    log "Analyse des logs..."
    
    local datestamp=$(date +%Y%m%d_%H%M%S)
    local analysis_file="${ANALYSIS_DIR}/analysis_${datestamp}.txt"

    {
        echo "=== Rapport d'analyse des logs ==="
        echo "Date: $(date)"
        echo "==================================="
        echo

        # Analyse des erreurs
        echo "=== Erreurs fréquentes ==="
        find "$LOG_DIR" -type f -name "*.log" -exec grep -i "error" {} \; | \
            sort | uniq -c | sort -nr | head -10

        echo
        echo "=== Avertissements fréquents ==="
        find "$LOG_DIR" -type f -name "*.log" -exec grep -i "warning" {} \; | \
            sort | uniq -c | sort -nr | head -10

        echo
        echo "=== Statistiques par service ==="
        for service in frontend backend monitoring; do
            if [ -f "${LOG_DIR}/${service}.log" ]; then
                echo "Service: $service"
                echo "- Taille du log: $(du -h "${LOG_DIR}/${service}.log" | cut -f1)"
                echo "- Nombre de lignes: $(wc -l < "${LOG_DIR}/${service}.log")"
                echo "- Dernière erreur: $(grep -i "error" "${LOG_DIR}/${service}.log" | tail -1)"
                echo
            fi
        done

        echo "=== Activité réseau ==="
        if [ -f "${LOG_DIR}/network.log" ]; then
            echo "Top 10 des événements réseau:"
            grep "network_event" "${LOG_DIR}/network.log" | \
                sort | uniq -c | sort -nr | head -10
        fi

    } > "$analysis_file"

    log "Analyse enregistrée dans $analysis_file"
}

# Compression des logs
compress_logs() {
    local datestamp=$(date +%Y%m%d_%H%M%S)
    local archive_name="logs_${datestamp}.tar.gz"
    
    log "Compression des logs..."
    
    tar -czf "${ARCHIVE_DIR}/${archive_name}" \
        --exclude="*.gz" \
        --exclude="archives" \
        --exclude="analysis" \
        "$LOG_DIR"
        
    log "Logs compressés dans ${ARCHIVE_DIR}/${archive_name}"
}

# Extraction des erreurs critiques
extract_critical_errors() {
    log "Extraction des erreurs critiques..."
    
    local output_file="${ANALYSIS_DIR}/critical_errors_$(date +%Y%m%d).txt"
    
    {
        echo "=== Erreurs critiques ==="
        echo "Date d'extraction: $(date)"
        echo "=========================="
        echo
        
        find "$LOG_DIR" -type f -name "*.log" -exec grep -i "critical\|fatal\|emergency" {} \;
        
    } > "$output_file"
    
    log "Erreurs critiques extraites dans $output_file"
}

# Surveillance en temps réel
watch_logs() {
    local filter=$1
    
    if [ -z "$filter" ]; then
        tail -f "$LOG_DIR"/*.log
    else
        tail -f "$LOG_DIR"/*.log | grep --color=auto -i "$filter"
    fi
}

# Afficher les statistiques
show_stats() {
    echo -e "\n${BLUE}=== Statistiques des Logs ===${NC}"
    echo "Espace total utilisé: $(du -sh "$LOG_DIR" | cut -f1)"
    echo "Nombre de fichiers de log: $(find "$LOG_DIR" -type f -name "*.log" | wc -l)"
    echo "Nombre d'archives: $(find "$ARCHIVE_DIR" -type f | wc -l)"
    echo "Dernier rapport d'analyse: $(ls -t "${ANALYSIS_DIR}" | head -1)"
}

# Afficher l'aide
show_help() {
    echo -e "\n${BLUE}Usage:${NC}"
    echo "  $0 rotate                    - Effectuer une rotation des logs"
    echo "  $0 cleanup                   - Nettoyer les anciens logs"
    echo "  $0 analyze                   - Analyser les logs"
    echo "  $0 compress                  - Compresser les logs actuels"
    echo "  $0 extract-critical          - Extraire les erreurs critiques"
    echo "  $0 watch [filter]            - Surveiller les logs en temps réel"
    echo "  $0 stats                     - Afficher les statistiques"
}

# Fonction principale
main() {
    init_directories

    case "$1" in
        rotate)
            rotate_logs
            ;;
        cleanup)
            cleanup_old_logs
            ;;
        analyze)
            analyze_logs
            ;;
        compress)
            compress_logs
            ;;
        extract-critical)
            extract_critical_errors
            ;;
        watch)
            watch_logs "$2"
            ;;
        stats)
            show_stats
            ;;
        *)
            show_help
            ;;
    esac
}

# Exécution
main "$@"
