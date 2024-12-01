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

# Configuration SSL
SSL_DIR="docker/nginx/ssl"
CERT_DIR="${SSL_DIR}/certs"
KEY_DIR="${SSL_DIR}/private"
CSR_DIR="${SSL_DIR}/csr"
DHPARAM_FILE="${SSL_DIR}/dhparam.pem"

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

# Initialisation des répertoires
init_ssl_directories() {
    log "Initialisation des répertoires SSL..."
    
    mkdir -p "${CERT_DIR}"
    mkdir -p "${KEY_DIR}"
    mkdir -p "${CSR_DIR}"
    
    # Sécurisation des répertoires
    chmod 700 "${KEY_DIR}"
    chmod 755 "${CERT_DIR}"
    chmod 755 "${CSR_DIR}"
}

# Génération des paramètres Diffie-Hellman
generate_dhparam() {
    if [ ! -f "${DHPARAM_FILE}" ]; then
        log "Génération des paramètres Diffie-Hellman (peut prendre du temps)..."
        openssl dhparam -out "${DHPARAM_FILE}" 2048 || error "Échec de la génération DH"
    fi
}

# Création d'un certificat auto-signé
create_self_signed_cert() {
    local domain=$1
    local cert_file="${CERT_DIR}/${domain}.crt"
    local key_file="${KEY_DIR}/${domain}.key"
    
    log "Création d'un certificat auto-signé pour ${domain}..."
    
    # Génération de la clé privée
    openssl genrsa -out "${key_file}" 2048 || error "Échec de la génération de la clé"
    chmod 600 "${key_file}"
    
    # Génération du certificat
    openssl req -new -x509 -key "${key_file}" -out "${cert_file}" -days ${SSL_DAYS_VALID} \
        -subj "/C=${SSL_COUNTRY}/ST=${SSL_STATE}/L=${SSL_LOCALITY}/O=${SSL_ORGANIZATION}/CN=${domain}" || \
        error "Échec de la génération du certificat"
        
    log "Certificat auto-signé créé: ${cert_file}"
}

# Création d'une demande de certificat (CSR)
create_csr() {
    local domain=$1
    local key_file="${KEY_DIR}/${domain}.key"
    local csr_file="${CSR_DIR}/${domain}.csr"
    
    log "Création d'une demande de certificat pour ${domain}..."
    
    # Génération de la clé privée si elle n'existe pas
    if [ ! -f "${key_file}" ]; then
        openssl genrsa -out "${key_file}" 2048 || error "Échec de la génération de la clé"
        chmod 600 "${key_file}"
    fi
    
    # Génération de la demande de certificat
    openssl req -new -key "${key_file}" -out "${csr_file}" \
        -subj "/C=${SSL_COUNTRY}/ST=${SSL_STATE}/L=${SSL_LOCALITY}/O=${SSL_ORGANIZATION}/CN=${domain}" || \
        error "Échec de la génération du CSR"
        
    log "CSR créé: ${csr_file}"
}

# Installation d'un certificat
install_certificate() {
    local domain=$1
    local cert_path=$2
    local key_path=$3
    
    # Vérification des fichiers
    [ ! -f "${cert_path}" ] && error "Certificat non trouvé: ${cert_path}"
    [ ! -f "${key_path}" ] && error "Clé privée non trouvée: ${key_path}"
    
    # Vérification de la correspondance certificat/clé
    if ! openssl x509 -noout -modulus -in "${cert_path}" | \
         openssl md5 | \
         grep -q "$(openssl rsa -noout -modulus -in "${key_path}" | openssl md5)"; then
        error "Le certificat et la clé privée ne correspondent pas"
    fi
    
    # Installation des fichiers
    cp "${cert_path}" "${CERT_DIR}/${domain}.crt" || error "Échec de la copie du certificat"
    cp "${key_path}" "${KEY_DIR}/${domain}.key" || error "Échec de la copie de la clé"
    
    # Sécurisation
    chmod 644 "${CERT_DIR}/${domain}.crt"
    chmod 600 "${KEY_DIR}/${domain}.key"
    
    log "Certificat installé pour ${domain}"
}

# Vérification d'un certificat
verify_certificate() {
    local domain=$1
    local cert_file="${CERT_DIR}/${domain}.crt"
    
    [ ! -f "${cert_file}" ] && error "Certificat non trouvé: ${cert_file}"
    
    log "Informations sur le certificat pour ${domain}:"
    echo
    openssl x509 -in "${cert_file}" -text -noout | \
        grep -A 2 "Validity" | \
        sed 's/^[[:space:]]*//'
    
    # Vérification de la date d'expiration
    local expiry=$(openssl x509 -enddate -noout -in "${cert_file}" | cut -d= -f2)
    local expiry_epoch=$(date -d "${expiry}" +%s)
    local now_epoch=$(date +%s)
    local days_left=$(( (expiry_epoch - now_epoch) / 86400 ))
    
    echo
    if [ ${days_left} -lt 30 ]; then
        warn "Le certificat expire dans ${days_left} jours"
    else
        log "Le certificat expire dans ${days_left} jours"
    fi
}

# Renouvellement des certificats auto-signés
renew_self_signed_certs() {
    log "Renouvellement des certificats auto-signés..."
    
    find "${CERT_DIR}" -name "*.crt" | while read cert_file; do
        domain=$(basename "${cert_file}" .crt)
        expiry=$(openssl x509 -enddate -noout -in "${cert_file}" | cut -d= -f2)
        expiry_epoch=$(date -d "${expiry}" +%s)
        now_epoch=$(date +%s)
        days_left=$(( (expiry_epoch - now_epoch) / 86400 ))
        
        if [ ${days_left} -lt 30 ]; then
            log "Renouvellement du certificat pour ${domain}..."
            create_self_signed_cert "${domain}"
        fi
    done
}

# Configuration Nginx
update_nginx_config() {
    local domain=$1
    local config_file="docker/nginx/conf.d/${domain}.conf"
    
    log "Mise à jour de la configuration Nginx pour ${domain}..."
    
    cat > "${config_file}" << EOF
server {
    listen 443 ssl http2;
    server_name ${domain};

    ssl_certificate ${CERT_DIR}/${domain}.crt;
    ssl_certificate_key ${KEY_DIR}/${domain}.key;
    ssl_dhparam ${DHPARAM_FILE};

    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-ECDSA-CHACHA20-POLY1305:ECDHE-RSA-CHACHA20-POLY1305:DHE-RSA-AES128-GCM-SHA256:DHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;

    ssl_session_timeout 1d;
    ssl_session_cache shared:SSL:50m;
    ssl_session_tickets off;

    ssl_stapling on;
    ssl_stapling_verify on;
    resolver 8.8.8.8 8.8.4.4 valid=300s;
    resolver_timeout 5s;

    add_header Strict-Transport-Security "max-age=63072000" always;

    location / {
        proxy_pass http://frontend:3000;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
    }

    location /api {
        proxy_pass http://backend:3001;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
    }

    location /ws {
        proxy_pass http://backend:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}

server {
    listen 80;
    server_name ${domain};
    return 301 https://\$server_name\$request_uri;
}
EOF

    log "Configuration Nginx mise à jour"
}

# Afficher l'aide
show_help() {
    echo -e "\n${BLUE}Usage:${NC}"
    echo "  $0 init                            - Initialiser l'environnement SSL"
    echo "  $0 create-self-signed <domain>     - Créer un certificat auto-signé"
    echo "  $0 create-csr <domain>            - Créer une demande de certificat"
    echo "  $0 install <domain> <cert> <key>   - Installer un certificat"
    echo "  $0 verify <domain>                - Vérifier un certificat"
    echo "  $0 renew                          - Renouveler les certificats auto-signés"
    echo "  $0 update-nginx <domain>          - Mettre à jour la configuration Nginx"
}

# Fonction principale
main() {
    case "$1" in
        init)
            init_ssl_directories
            generate_dhparam
            ;;
        create-self-signed)
            [ -z "$2" ] && error "Domaine requis"
            create_self_signed_cert "$2"
            update_nginx_config "$2"
            ;;
        create-csr)
            [ -z "$2" ] && error "Domaine requis"
            create_csr "$2"
            ;;
        install)
            [ -z "$4" ] && error "Usage: $0 install <domain> <cert> <key>"
            install_certificate "$2" "$3" "$4"
            update_nginx_config "$2"
            ;;
        verify)
            [ -z "$2" ] && error "Domaine requis"
            verify_certificate "$2"
            ;;
        renew)
            renew_self_signed_certs
            ;;
        update-nginx)
            [ -z "$2" ] && error "Domaine requis"
            update_nginx_config "$2"
            ;;
        *)
            show_help
            ;;
    esac
}

# Exécution
main "$@"
