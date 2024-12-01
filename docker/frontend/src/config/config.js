// Configuration générale de l'application
export const CONFIG = {
  // Configuration du réseau
  NETWORK: {
    BASE_URL: process.env.REACT_APP_API_URL || 'http://localhost:3001',
    WS_URL: process.env.REACT_APP_WS_URL || 'ws://localhost:3001',
    REFRESH_RATE: 1000, // Taux de rafraîchissement des données en ms
    HISTORY_LENGTH: 100, // Nombre de points de données historiques à conserver
    PING_INTERVAL: 30000, // Intervalle de ping pour maintenir la connexion WebSocket
  },

  // Configuration des scénarios
  SCENARIOS: {
    DURATIONS: {
      SHORT: 300,    // 5 minutes
      MEDIUM: 600,   // 10 minutes
      LONG: 1200     // 20 minutes
    },
    DIFFICULTY_LEVELS: {
      BEGINNER: 'beginner',
      INTERMEDIATE: 'intermediate',
      ADVANCED: 'advanced'
    }
  },

  // Configuration des métriques
  METRICS: {
    THRESHOLDS: {
      LATENCY: {
        WARNING: 100,  // ms
        CRITICAL: 200  // ms
      },
      LOAD: {
        WARNING: 70,   // %
        CRITICAL: 90   // %
      },
      PACKET_LOSS: {
        WARNING: 0.01, // 1%
        CRITICAL: 0.05 // 5%
      }
    },
    UPDATE_INTERVAL: 5000 // Intervalle de mise à jour des métriques
  },

  // Configuration de l'interface utilisateur
  UI: {
    THEMES: {
      LIGHT: 'light',
      DARK: 'dark'
    },
    ANIMATIONS: {
      DURATION: 300, // Durée des animations en ms
    },
    MAP: {
      MIN_ZOOM: 0.5,
      MAX_ZOOM: 2,
      DEFAULT_ZOOM: 1
    },
    CHARTS: {
      COLORS: {
        PRIMARY: '#3b82f6',
        SECONDARY: '#10b981',
        WARNING: '#f59e0b',
        DANGER: '#ef4444'
      },
      DEFAULT_HEIGHT: 300
    }
  },

  // Configuration des alertes
  ALERTS: {
    MAX_ALERTS: 50,        // Nombre maximum d'alertes à conserver
    DISPLAY_DURATION: 5000 // Durée d'affichage des alertes en ms
  },

  // Configuration des timeouts
  TIMEOUTS: {
    API_CALLS: 10000,     // Timeout pour les appels API
    WEBSOCKET_CONNECT: 5000, // Timeout pour la connexion WebSocket
    SESSION: 28800000     // Durée de session (8 heures)
  },

  // Configuration de l'authentification
  AUTH: {
    TOKEN_KEY: 'archnet_token',
    ROLES: {
      TEACHER: 'teacher',
      STUDENT: 'student'
    }
  },

  // Messages d'erreur
  ERRORS: {
    NETWORK: {
      CONNECTION_LOST: 'Connexion au serveur perdue',
      WEBSOCKET_ERROR: 'Erreur de connexion WebSocket',
      API_ERROR: 'Erreur lors de l\'appel API'
    },
    AUTH: {
      INVALID_CREDENTIALS: 'Identifiants invalides',
      SESSION_EXPIRED: 'Session expirée'
    },
    SIMULATION: {
      START_FAILED: 'Échec du démarrage de la simulation',
      STOP_FAILED: 'Échec de l\'arrêt de la simulation'
    }
  },

  // Configuration pédagogique
  PEDAGOGY: {
    MAX_STUDENTS: 30,
    DIFFICULTY_PROGRESSION: {
      BEGINNER: {
        MAX_CONCURRENT_ISSUES: 1,
        ISSUE_INTERVAL: 300000 // 5 minutes
      },
      INTERMEDIATE: {
        MAX_CONCURRENT_ISSUES: 2,
        ISSUE_INTERVAL: 180000 // 3 minutes
      },
      ADVANCED: {
        MAX_CONCURRENT_ISSUES: 3,
        ISSUE_INTERVAL: 60000  // 1 minute
      }
    },
    EVALUATION: {
      MIN_SCORE: 0,
      MAX_SCORE: 100,
      METRICS_WEIGHT: {
        LATENCY: 0.3,
        PACKET_LOSS: 0.3,
        LOAD_BALANCING: 0.2,
        PROBLEM_SOLVING: 0.2
      }
    }
  }
};

// Constantes utilitaires
export const CONSTANTS = {
  REGIONS: {
    EUROPE: 'Europe',
    NORTH_AMERICA: 'North America',
    SOUTH_AMERICA: 'South America',
    ASIA: 'Asia',
    AFRICA: 'Africa',
    OCEANIA: 'Oceania'
  },

  STATUS: {
    ONLINE: 'online',
    OFFLINE: 'offline',
    WARNING: 'warning',
    MAINTENANCE: 'maintenance'
  },

  EVENT_TYPES: {
    NETWORK_ISSUE: 'network_issue',
    HARDWARE_FAILURE: 'hardware_failure',
    TRAFFIC_SPIKE: 'traffic_spike',
    MAINTENANCE: 'maintenance',
    ATTACK: 'attack'
  },

  ALERT_SEVERITY: {
    INFO: 'info',
    WARNING: 'warning',
    ERROR: 'error',
    CRITICAL: 'critical'
  }
};

export default { CONFIG, CONSTANTS };
