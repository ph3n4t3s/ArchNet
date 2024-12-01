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

# Configuration du monitoring
REFRESH_RATE=2  # secondes
SCREEN_WIDTH=$(tput cols)
SCREEN_HEIGHT=$(tput lines)

# Fonction de log
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

error() {
    echo -e "${RED}[ERROR] $1${NC}"
    exit 1
}

# Fonction pour effacer l'écran
clear_screen() {
    clear
}

# Vérifier les services Docker
check_docker_services() {
    echo -e "${BLUE}=== Services Docker ===${NC}"
    docker-compose ps --format "table {{.Name}}\t{{.Status}}\t{{.Ports}}"
}

# Vérifier l'utilisation des ressources
check_resources() {
    echo -e "\n${BLUE}=== Utilisation des Ressources ===${NC}"
    docker stats --no-stream --format "table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.NetIO}}\t{{.BlockIO}}"
}

# Vérifier les logs récents
check_logs() {
    echo -e "\n${BLUE}=== Derniers Logs ===${NC}"
    docker-compose logs --tail=5
}

# Vérifier la connectivité réseau
check_network() {
    echo -e "\n${BLUE}=== État du Réseau ===${NC}"
    echo "Interface: ${NETWORK_INTERFACE}"
    ip -br addr show ${NETWORK_INTERFACE}
    echo -e "\nConnectivité routeur:"
    ping -c 1 ${ROUTER_IP} > /dev/null && \
        echo -e "${GREEN}Routeur accessible${NC}" || \
        echo -e "${RED}Routeur inaccessible${NC}"
}

# Vérifier les métriques applicatives
check_app_metrics() {
    echo -e "\n${BLUE}=== Métriques Application ===${NC}"
    if curl -s "${API_URL}/health" > /dev/null; then
        echo -e "${GREEN}API accessible${NC}"
        METRICS=$(curl -s "${API_URL}/metrics")
        echo "Étudiants connectés: $(echo $METRICS | jq '.connectedStudents')"
        echo "Latence moyenne: $(echo $METRICS | jq '.averageLatency')ms"
        echo "Charge réseau: $(echo $METRICS | jq '.networkLoad')%"
    else
        echo -e "${RED}API inaccessible${NC}"
    fi
}

# Vérifier l'état de la base de données
check_database() {
    echo -e "\n${BLUE}=== État InfluxDB ===${NC}"
    if curl -s "${INFLUXDB_URL}/health" > /dev/null; then
        echo -e "${GREEN}InfluxDB accessible${NC}"
        # Ajouter d'autres métriques InfluxDB si nécessaire
    else
        echo -e "${RED}InfluxDB inaccessible${NC}"
    fi
}

# Afficher l'aide
show_help() {
    echo -e "\n${BLUE}=== Commandes Disponibles ===${NC}"
    echo "q: Quitter"
    echo "r: Rafraîchir"
    echo "l: Afficher les logs"
    echo "n: État réseau"
    echo "m: Métriques app"
    echo "d: État base de données"
    echo "h: Cette aide"
}

# Fonction principale de monitoring
monitor() {
    while true; do
        clear_screen
        
        echo -e "${GREEN}=== Monitoring ${APP_NAME} v${APP_VERSION} ===${NC}"
        echo -e "Timestamp: $(date +'%Y-%m-%d %H:%M:%S')\n"

        check_docker_services
        check_resources
        check_network
        check_app_metrics
        check_database

        echo -e "\nAppuyez sur 'h' pour l'aide ou 'q' pour quitter"

        # Lecture non bloquante pour les commandes
        read -t $REFRESH_RATE -n 1 key
        case $key in
            q|Q) break ;;
            h|H) show_help ;;
            l|L) check_logs ;;
            n|N) check_network ;;
            m|M) check_app_metrics ;;
            d|D) check_database ;;
            r|R) continue ;;
        esac
    done
}

# Vérification des dépendances
check_dependencies() {
    command -v curl >/dev/null 2>&1 || error "curl est requis"
    command -v jq >/dev/null 2>&1 || error "jq est requis"
    command -v docker >/dev/null 2>&1 || error "docker est requis"
    command -v docker-compose >/dev/null 2>&1 || error "docker-compose est requis"
}

# Fonction principale
main() {
    check_dependencies
    
    # Vérifier si les services sont démarrés
    if ! docker-compose ps | grep -q "Up"; then
        error "Les services Docker doivent être démarrés"
    }

    monitor
}

# Exécution
main "$@"
