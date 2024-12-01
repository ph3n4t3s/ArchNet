#!/bin/bash

# Couleurs pour la sortie
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Charger les variables d'environnement
if [ ! -f ".env" ]; then
    echo -e "${RED}Fichier .env non trouvé${NC}"
    exit 1
fi

set -a
source .env
set +a

# Fonction de log
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

error() {
    echo -e "${RED}[ERROR] $1${NC}"
    exit 1
}

warn() {
    echo -e "${YELLOW}[WARNING] $1${NC}"
}

# Vérifier les prérequis
check_prerequisites() {
    log "Vérification des prérequis..."

    # Vérifier Docker
    if ! command -v docker &> /dev/null; then
        error "Docker n'est pas installé"
    fi

    # Vérifier Docker Compose
    if ! command -v docker-compose &> /dev/null; then
        error "Docker Compose n'est pas installé"
    fi

    # Vérifier Node.js
    if ! command -v node &> /dev/null; then
        error "Node.js n'est pas installé"
    fi

    # Vérifier npm
    if ! command -v npm &> /dev/null; then
        error "npm n'est pas installé"
    fi
}

# Installation des dépendances
install_dependencies() {
    log "Installation des dépendances..."

    # Installation des dépendances Node.js
    npm install || error "Erreur lors de l'installation des dépendances Node.js"

    # Installation des dépendances Python pour le monitoring
    if command -v pip3 &> /dev/null; then
        pip3 install -r requirements.txt || warn "Erreur lors de l'installation des dépendances Python"
    fi
}

# Configuration SSL
setup_ssl() {
    log "Configuration SSL..."

    # Créer le répertoire des certificats
    mkdir -p docker/nginx/certs

    # Générer les certificats auto-signés
    openssl req -x509 -nodes \
        -days ${SSL_DAYS_VALID} \
        -newkey rsa:2048 \
        -keyout docker/nginx/certs/nginx.key \
        -out docker/nginx/certs/nginx.crt \
        -subj "/C=${SSL_COUNTRY}/ST=${SSL_STATE}/L=${SSL_LOCALITY}/O=${SSL_ORGANIZATION}/CN=${SSL_COMMON_NAME}"
}

# Configuration Docker
setup_docker() {
    log "Configuration de Docker..."

    # Créer le réseau Docker si nécessaire
    if ! docker network ls | grep -q "${DOCKER_NETWORK_NAME}"; then
        docker network create ${DOCKER_NETWORK_NAME} || error "Erreur lors de la création du réseau Docker"
    fi

    # Construire les images Docker
    docker-compose build || error "Erreur lors de la construction des images Docker"
}

# Configuration des logs
setup_logging() {
    log "Configuration des logs..."

    # Créer le répertoire des logs
    mkdir -p logs

    # Configuration de la rotation des logs
    cat > /etc/logrotate.d/archnet << EOF
/var/log/archnet/*.log {
    size ${MAX_LOGS_SIZE}
    rotate ${MAX_LOGS_FILES}
    compress
    delaycompress
    notifempty
    create 644 root root
}
EOF
}

# Vérification de la configuration
verify_installation() {
    log "Vérification de l'installation..."

    # Vérifier la configuration réseau
    if ! ip addr show ${NETWORK_INTERFACE} | grep -q "${TEACHER_IP}"; then
        warn "Configuration réseau incorrecte"
    fi

    # Vérifier les services Docker
    if ! docker-compose ps &> /dev/null; then
        warn "Services Docker non démarrés"
    fi

    # Vérifier l'accès aux ports
    if ! netstat -tuln | grep -q ":${DOCKER_FRONTEND_PORT} "; then
        warn "Port frontend non accessible"
    fi

    if ! netstat -tuln | grep -q ":${DOCKER_BACKEND_PORT} "; then
        warn "Port backend non accessible"
    fi
}

# Fonction principale
main() {
    log "Début de l'installation de ${APP_NAME} v${APP_VERSION}..."

    check_prerequisites
    install_dependencies
    setup_ssl
    setup_docker
    setup_logging
    verify_installation

    log "Installation terminée avec succès!"
    log "Pour démarrer l'application, exécutez: docker-compose up -d"
    
    # Afficher les informations de connexion
    echo -e "\nInformations de connexion:"
    echo -e "Interface Web: ${FRONTEND_URL}"
    echo -e "API: ${API_URL}"
    echo -e "WebSocket: ${WS_URL}\n"
}

# Exécution
main "$@"
