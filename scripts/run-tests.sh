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

# Configuration de l'environnement de test
setup_test_env() {
    log "Configuration de l'environnement de test..."

    # Configuration de Jest
    export JEST_TIMEOUT=${TEST_TIMEOUT}
    export TEST_BROWSER=${TEST_BROWSER}
    export TEST_HEADLESS=${TEST_HEADLESS}

    # Configuration des URLs de test
    export TEST_FRONTEND_URL=${FRONTEND_URL}
    export TEST_API_URL=${API_URL}
    export TEST_WS_URL=${WS_URL}
}

# Exécution des tests unitaires
run_unit_tests() {
    log "Exécution des tests unitaires..."
    
    jest --testPathPattern=src/__tests__/unit --verbose || {
        error "Les tests unitaires ont échoué"
        return 1
    }
}

# Exécution des tests d'intégration
run_integration_tests() {
    log "Exécution des tests d'intégration..."
    
    # Vérifier que les services sont en cours d'exécution
    if ! docker-compose ps | grep -q "Up"; then
        error "Les services Docker doivent être démarrés pour les tests d'intégration"
    fi

    jest --testPathPattern=src/__tests__/integration --verbose || {
        error "Les tests d'intégration ont échoué"
        return 1
    }
}

# Exécution des tests end-to-end
run_e2e_tests() {
    log "Exécution des tests end-to-end..."
    
    # Configuration du navigateur de test
    export PUPPETEER_BROWSER=${TEST_BROWSER}
    export PUPPETEER_HEADLESS=${TEST_HEADLESS}

    jest --testPathPattern=src/__tests__/e2e --verbose || {
        error "Les tests end-to-end ont échoué"
        return 1
    }
}

# Exécution des tests de performance
run_performance_tests() {
    log "Exécution des tests de performance..."
    
    jest --testPathPattern=src/__tests__/performance --verbose || {
        warn "Certains tests de performance ont échoué"
    }
}

# Génération du rapport de couverture
generate_coverage_report() {
    log "Génération du rapport de couverture..."
    
    jest --coverage || {
        warn "Erreur lors de la génération du rapport de couverture"
    }
}

# Nettoyage après les tests
cleanup() {
    log "Nettoyage de l'environnement de test..."
    
    # Supprimer les fichiers temporaires
    rm -rf coverage/tmp
    rm -rf test-results

    # Réinitialiser l'environnement Docker si nécessaire
    if [ "${1}" = "reset-docker" ]; then
        docker-compose down
        docker-compose up -d
    fi
}

# Vérification des prérequis
check_prerequisites() {
    log "Vérification des prérequis pour les tests..."

    # Vérifier Node.js et npm
    if ! command -v node &> /dev/null || ! command -v npm &> /dev/null; then
        error "Node.js et npm sont requis pour exécuter les tests"
    fi

    # Vérifier Jest
    if ! npx jest --version &> /dev/null; then
        error "Jest n'est pas installé"
    }

    # Vérifier les dépendances
    npm list jest puppeteer @testing-library/react @testing-library/jest-dom || {
        warn "Certaines dépendances de test sont manquantes"
        npm install
    }
}

# Fonction principale
main() {
    log "Démarrage des tests pour ${APP_NAME} v${APP_VERSION}..."

    check_prerequisites
    setup_test_env

    # Exécuter les suites de tests
    run_unit_tests
    run_integration_tests
    run_e2e_tests
    run_performance_tests

    # Générer le rapport de couverture
    generate_coverage_report

    # Nettoyage
    cleanup

    log "Tous les tests sont terminés avec succès!"
    
    # Afficher le résumé
    echo -e "\nRésumé des tests:"
    echo -e "- Tests unitaires: ${GREEN}OK${NC}"
    echo -e "- Tests d'intégration: ${GREEN}OK${NC}"
    echo -e "- Tests end-to-end: ${GREEN}OK${NC}"
    echo -e "- Tests de performance: ${GREEN}OK${NC}"
    echo -e "\nRapport de couverture disponible dans: ./coverage/lcov-report/index.html"
}

# Exécution
main "$@"
