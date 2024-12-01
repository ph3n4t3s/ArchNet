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

# Fichier de stockage des utilisateurs (chiffré)
USERS_FILE="data/users.enc"
KEY_FILE="data/key.bin"

# Fonction de log
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

error() {
    echo -e "${RED}[ERROR] $1${NC}"
    exit 1
}

# Initialisation du système de stockage
init_storage() {
    if [ ! -f "$KEY_FILE" ]; then
        # Générer une clé de chiffrement
        openssl rand -base64 32 > "$KEY_FILE"
        chmod 600 "$KEY_FILE"
    fi

    if [ ! -f "$USERS_FILE" ]; then
        echo "{}" | openssl enc -aes-256-cbc -salt -pbkdf2 -in - -out "$USERS_FILE" -pass file:"$KEY_FILE"
    fi
}

# Fonctions de chiffrement/déchiffrement
encrypt_data() {
    openssl enc -aes-256-cbc -salt -pbkdf2 -in - -out "$USERS_FILE" -pass file:"$KEY_FILE"
}

decrypt_data() {
    openssl enc -aes-256-cbc -salt -pbkdf2 -d -in "$USERS_FILE" -pass file:"$KEY_FILE"
}

# Ajouter un utilisateur
add_user() {
    local username=$1
    local role=$2
    local password

    # Vérifier le nom d'utilisateur
    if [[ ! "$username" =~ ^[a-zA-Z0-9_-]{3,}$ ]]; then
        error "Nom d'utilisateur invalide (minimum 3 caractères, alphanumérique avec - et _)"
    fi

    # Générer ou demander le mot de passe
    if [ -z "$3" ]; then
        read -s -p "Entrez le mot de passe: " password
        echo
        read -s -p "Confirmez le mot de passe: " password2
        echo
        
        if [ "$password" != "$password2" ]; then
            error "Les mots de passe ne correspondent pas"
        fi
    else
        password=$3
    fi

    # Hasher le mot de passe
    local hashed_password=$(echo -n "$password" | sha256sum | cut -d' ' -f1)

    # Ajouter l'utilisateur
    local users=$(decrypt_data)
    echo "$users" | jq --arg user "$username" \
                      --arg hash "$hashed_password" \
                      --arg role "$role" \
                      '.[$user] = {"hash": $hash, "role": $role, "created": now | tostring}' | encrypt_data

    log "Utilisateur $username ajouté avec succès"
}

# Supprimer un utilisateur
delete_user() {
    local username=$1

    # Vérifier que l'utilisateur existe
    local users=$(decrypt_data)
    if ! echo "$users" | jq -e --arg user "$username" '.[$user]' > /dev/null; then
        error "Utilisateur $username non trouvé"
    fi

    # Supprimer l'utilisateur
    echo "$users" | jq --arg user "$username" 'del(.[$user])' | encrypt_data

    log "Utilisateur $username supprimé avec succès"
}

# Lister les utilisateurs
list_users() {
    echo -e "\n${BLUE}=== Utilisateurs ===${NC}"
    decrypt_data | jq 'to_entries | .[] | {username: .key, role: .value.role, created: .value.created}'
}

# Modifier un utilisateur
modify_user() {
    local username=$1
    local field=$2
    local value=$3

    # Vérifier que l'utilisateur existe
    local users=$(decrypt_data)
    if ! echo "$users" | jq -e --arg user "$username" '.[$user]' > /dev/null; then
        error "Utilisateur $username non trouvé"
    fi

    case "$field" in
        password)
            local hashed_password=$(echo -n "$value" | sha256sum | cut -d' ' -f1)
            echo "$users" | jq --arg user "$username" \
                              --arg hash "$hashed_password" \
                              '.[$user].hash = $hash' | encrypt_data
            ;;
        role)
            echo "$users" | jq --arg user "$username" \
                              --arg role "$value" \
                              '.[$user].role = $role' | encrypt_data
            ;;
        *)
            error "Champ invalide: $field"
            ;;
    esac

    log "Utilisateur $username modifié avec succès"
}

# Vérifier un utilisateur
verify_user() {
    local username=$1
    local password=$2

    local hashed_password=$(echo -n "$password" | sha256sum | cut -d' ' -f1)
    local users=$(decrypt_data)
    
    if echo "$users" | jq -e --arg user "$username" --arg hash "$hashed_password" \
        'select(.[$user].hash == $hash)' > /dev/null; then
        return 0
    else
        return 1
    fi
}

# Afficher l'aide
show_help() {
    echo -e "\n${BLUE}Usage:${NC}"
    echo "  $0 add <username> <role> [password]  - Ajouter un utilisateur"
    echo "  $0 delete <username>                 - Supprimer un utilisateur"
    echo "  $0 list                             - Lister les utilisateurs"
    echo "  $0 modify <username> <field> <value> - Modifier un utilisateur"
    echo "  $0 verify <username> <password>      - Vérifier un utilisateur"
    echo -e "\n${BLUE}Rôles disponibles:${NC}"
    echo "  teacher - Enseignant"
    echo "  admin   - Administrateur"
}

# Vérification des dépendances
check_dependencies() {
    command -v openssl >/dev/null 2>&1 || error "openssl est requis"
    command -v jq >/dev/null 2>&1 || error "jq est requis"
}

# Fonction principale
main() {
    check_dependencies
    init_storage

    case "$1" in
        add)
            [ $# -lt 3 ] && error "Usage: $0 add <username> <role> [password]"
            add_user "$2" "$3" "$4"
            ;;
        delete)
            [ $# -ne 2 ] && error "Usage: $0 delete <username>"
            delete_user "$2"
            ;;
        list)
            list_users
            ;;
        modify)
            [ $# -ne 4 ] && error "Usage: $0 modify <username> <field> <value>"
            modify_user "$2" "$3" "$4"
            ;;
        verify)
            [ $# -ne 3 ] && error "Usage: $0 verify <username> <password>"
            if verify_user "$2" "$3"; then
                echo -e "${GREEN}Authentification réussie${NC}"
                exit 0
            else
                echo -e "${RED}Authentification échouée${NC}"
                exit 1
            fi
            ;;
        *)
            show_help
            ;;
    esac
}

# Exécution
main "$@"
