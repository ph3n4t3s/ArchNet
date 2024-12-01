## Table des matières

1. Ressources pédagogiques
   - Guides par niveau
   - Scénarios progressifs
   - Matériel d'évaluation

2. Documentation technique
   - Installation
   - Configuration
   - Maintenance

3. Tests
   - Tests unitaires
   - Tests d'intégration
   - Tests de charge

## Composants de l'application

1. Infrastructure réseau
   - Configuration WiFi
   - Configuration Docker
   - Configuration des 30 villes/noeuds

2. Backend
   - Services de simulation
   - Gestion des événements
   - Traitement des métriques
   - API

3. Frontend
   - Interface enseignant
   - Interface étudiants
   - Visualisations
   - Dashboard

4. Documentation 
   - Installation
   - Utilisation
   - Pédagogique

## Installation de l'application
Ces scripts doivent être exécutés dans l'ordre suivant :

./scripts/setup-environment.sh (en tant que root)
./scripts/install.sh
./scripts/run-tests.sh

Le dossier scripts contient donc tous les scripts nécessaires pour :

Configurer l'environnement
Installer l'application
Exécuter les tests

## Arborescence des fichiers V1.0
├── README.md
├── LICENSE
├── docker-compose.yml
├── package.json
│
├── docs/
│   ├── technical/
│   │   ├── installation.md
│   │   ├── configuration.md
│   │   ├── api-reference.md
│   │   └── maintenance.md
│   │
│   ├── pedagogical/
│   │   ├── teacher/
│   │   │   ├── course-planning.md
│   │   │   ├── evaluation-guide.md
│   │   │   ├── scenarios-guide.md
│   │   │   └── dashboard-guide.md
│   │   │
│   │   └── student/
│   │       ├── getting-started.md
│   │       ├── routing-basics.md
│   │       ├── network-analysis.md
│   │       └── troubleshooting-guide.md
│   │
│   └── resources/
│       ├── exercises/
│       │   ├── level1/
│       │   ├── level2/
│       │   └── level3/
│       │
│       ├── scenarios/
│       │   ├── basic/
│       │   ├── intermediate/
│       │   └── advanced/
│       │
│       └── evaluation/
│           ├── quizzes/
│           ├── practical-tests/
│           └── rubrics/
│
├── src/
│   ├── backend/
│   │   ├── config/
│   │   │   ├── networkCities.js
│   │   │   ├── database.js
│   │   │   └── constants.js
│   │   │
│   │   ├── services/
│   │   │   ├── scenarioManager.js
│   │   │   ├── metricsProcessor.js
│   │   │   └── realtimeEvents.js
│   │   │
│   │   ├── routes/
│   │   │   ├── teacherRoutes.js
│   │   │   ├── studentRoutes.js
│   │   │   └── adminRoutes.js
│   │   │
│   │   └── models/
│   │       ├── Simulation.js
│   │       ├── Metric.js
│   │       └── Event.js
│   │
│   ├── frontend/
│   │   ├── components/
│   │   │   ├── teacher/
│   │   │   │   ├── Dashboard.jsx
│   │   │   │   ├── ScenarioControl.jsx
│   │   │   │   └── Analytics.jsx
│   │   │   │
│   │   │   ├── student/
│   │   │   │   ├── Dashboard.jsx
│   │   │   │   ├── NetworkView.jsx
│   │   │   │   └── Metrics.jsx
│   │   │   │
│   │   │   └── shared/
│   │   │       ├── NetworkMap.jsx
│   │   │       ├── MetricsPanel.jsx
│   │   │       └── Alerts.jsx
│   │   │
│   │   ├── contexts/
│   │   │   ├── TeacherContext.js
│   │   │   └── SimulationContext.js
│   │   │
│   │   └── utils/
│   │       ├── networkUtils.js
│   │       └── chartUtils.js
│   │
│   └── monitoring/
│       ├── collectors/
│       │   ├── networkMetrics.js
│       │   └── systemMetrics.js
│       │
│       └── alerts/
│           ├── thresholds.js
│           └── notifications.js
│
├── docker/
│   ├── backend/
│   │   └── Dockerfile
│   │
│   ├── frontend/
│   │   └── Dockerfile
│   │
│   ├── monitoring/
│   │   └── Dockerfile
│   │
│   └── nginx/
│       ├── nginx.conf
│       └── conf.d/
│
├── scripts/
│   ├── setup/
│   │   ├── install.sh
│   │   └── configure.sh
│   │
│   └── utils/
│       ├── backup.sh
│       └── monitor.sh
│
└── tests/
    ├── unit/
    │   ├── backend/
    │   └── frontend/
    │
    ├── integration/
    │   ├── api/
    │   └── network/
    │
    └── e2e/
        ├── teacher-flows/
        └── student-flows/

## Arborescence des fichiers V0.1 - Actuelle
├── README.md
├── docker
│   ├── backend
│   │   ├── Dockerfile
│   │   ├── package.json
│   │   └── src
│   │       ├── config
│   │       ├── routes
│   │       │   ├── studentRoutes.js
│   │       │   └── teacherRoutes.js
│   │       ├── server.js
│   │       └── services
│   │           ├── metricsProcessor.js
│   │           ├── realtimeEvents.js
│   │           └── scenarioManager.js
│   ├── frontend
│   │   ├── Dockerfile
│   │   ├── package.json
│   │   └── src
│   │       ├── components
│   │       │   ├── NetworkMap.jsx
│   │       │   ├── StudentDashboard.jsx
│   │       │   └── TeacherDashboard.jsx
│   │       ├── config
│   │       │   └── config.js
│   │       ├── contexts
│   │       │   ├── SimulationContext.js
│   │       │   └── TeacherContext.js
│   │       ├── hooks
│   │       │   └── useWebSocket.js
│   │       └── utils
│   │           ├── chartUtils.js
│   │           ├── eventUtils.js
│   │           ├── networkUtils.js
│   │           ├── pedagogicalUtils.js
│   │           ├── simulationUtils.js
│   │           ├── testUtils.js
│   │           ├── tests
│   │           │   ├── chartUtils.test.js
│   │           │   ├── eventUtils.test.js
│   │           │   ├── integration
│   │           │   │   └── network-simulation.test.js
│   │           │   ├── networkUtils.test.js
│   │           │   ├── pedagogicalUtils.test.js
│   │           │   ├── performance
│   │           │   │   └── load.test.js
│   │           │   ├── simulationUtils.test.js
│   │           │   └── validationUtils.test.js
│   │           └── validationUtils.js
│   ├── monitoring
│   │   └── Dockerfile
│   └── nginx
│       ├── conf.d
│       │   └── default.conf
│       └── nginx.conf
├── docker-compose.yml
├── docs
│   ├── student
│   ├── teacher
│   └── technical
├── monitoring
├── resources
│   ├── evaluation
│   ├── exercises
│   │   ├── level1
│   │   ├── level2
│   │   └── level3
│   └── scenarios
├── scripts
│   ├── backup.sh
│   ├── install.sh
│   ├── manage-logs.sh
│   ├── manage-users.sh
│   ├── monitor.sh
│   ├── run-tests.sh
│   ├── setup-environnement.sh
│   └── update.sh
├── src
│   ├── backend
│   │   ├── config
│   │   ├── models
│   │   ├── routes
│   │   └── services
│   └── frontend
│       ├── components
│       │   ├── student
│       │   └── teacher
│       ├── contexts
│       └── hooks
└── tests
    ├── e2e
    ├── integration
    └── unit

49 directories, 45 files

