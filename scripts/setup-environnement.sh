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

# Charger les variables d'environnement
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

# Configuration du réseau
setup_network() {
    log "Configuration du réseau..."

    # Sauvegarde de la configuration réseau actuelle
    if [ -f "/etc/network/interfaces" ]; then
        cp /etc/network/interfaces /etc/network/interfaces.backup
    fi

    # Configuration de l'interface réseau
    cat > /etc/network/interfaces.d/archnet << EOF
auto ${NETWORK_INTERFACE}
iface ${NETWORK_INTERFACE} inet static
    address ${TEACHER_IP}
    netmask ${NETMASK}
    network ${NETWORK_SUBNET%/*}
EOF

    # Redémarrer le service réseau
    systemctl restart networking || error "Erreur lors du redémarrage du service réseau"
}

# Configuration des permissions
setup_permissions() {
    log "Configuration des permissions..."

    # Création des répertoires nécessaires
    mkdir -p logs
    mkdir -p data
    
    # Attribution des permissions
    chmod -R 755 scripts/
    chmod -R 777 logs/
    chmod -R 777 data/
}

# Vérification de l'environnement
check_environment() {
    log "Vérification de l'environnement..."

    # Vérifier la connexion réseau
    if ! ping -c 1 ${ROUTER_IP} &> /dev/null; then
        warn "Impossible de joindre le routeur (${ROUTER_IP})"
    fi

    # Vérifier les ports requis
    if netstat -tuln | grep -q ":${DOCKER_FRONTEND_PORT} "; then
        error "Le port ${DOCKER_FRONTEND_PORT} est déjà utilisé"
    fi
    
    if netstat -tuln | grep -q ":${DOCKER_BACKEND_PORT} "; then
        error "Le port ${DOCKER_BACKEND_PORT} est déjà utilisé"
    fi
}

# Vérification des variables d'environnement
check_env_variables() {
    log "Vérification des variables d'environnement..."
    
    required_vars=(
        "NETWORK_INTERFACE"
        "TEACHER_IP"
        "NETWORK_SUBNET"
        "ROUTER_IP"
        "NETMASK"
        "DOCKER_FRONTEND_PORT"
        "DOCKER_BACKEND_PORT"
    )

    for var in "${required_vars[@]}"; do
        if [ -z "${!var}" ]; then
            error "Variable d'environnement manquante : $var"
        fi
    done
}

# Fonction principale
main() {
    log "Configuration de l'environnement ${APP_NAME}..."

    # Vérifier les privilèges root
    if [ "$EUID" -ne 0 ]; then
        error "Ce script doit être exécuté en tant que root"
    fi

    check_env_variables
    setup_network
    setup_permissions
    check_environment

    log "Configuration de l'environnement terminée"
    log "Vous pouvez maintenant lancer l'installation avec: ./install.sh"
}

# Exécution
main "$@"
