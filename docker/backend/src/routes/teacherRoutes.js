const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const scenarioManager = require('../services/scenarioManager');
const metricsProcessor = require('../services/metricsProcessor');
const realtimeEvents = require('../services/realtimeEvents');

// Configuration du JWT
const JWT_SECRET = process.env.JWT_SECRET || 'simuroute_teacher_secret_2024';
const JWT_EXPIRES_IN = '8h';

// Middleware d'authentification
const authenticateTeacher = (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ error: 'Token non fourni' });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    req.teacherId = decoded.id;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Token invalide' });
  }
};

// Login route
router.post('/login', async (req, res) => {
  try {
    const { password } = req.body;
    const TEACHER_PASSWORD = process.env.TEACHER_PASSWORD || 'SimuRoute2024#';

    if (password === TEACHER_PASSWORD) {
      const token = jwt.sign(
        { role: 'teacher' },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRES_IN }
      );

      res.json({
        token,
        expiresIn: JWT_EXPIRES_IN
      });
    } else {
      res.status(401).json({ error: 'Mot de passe incorrect' });
    }
  } catch (error) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Obtenir l'état actuel du réseau
router.get('/network/status', authenticateTeacher, async (req, res) => {
  try {
    const networkState = realtimeEvents.getNetworkState();
    const teacherMetrics = realtimeEvents.getTeacherMetrics();

    res.json({
      networkState,
      teacherMetrics,
      timestamp: Date.now()
    });
  } catch (error) {
    res.status(500).json({ error: 'Erreur lors de la récupération de l\'état du réseau' });
  }
});

// Obtenir la liste des scénarios disponibles
router.get('/scenarios', authenticateTeacher, async (req, res) => {
  try {
    const scenarios = scenarioManager.getScenarioList();
    res.json(scenarios);
  } catch (error) {
    res.status(500).json({ error: 'Erreur lors de la récupération des scénarios' });
  }
});

// Démarrer un scénario
router.post('/scenarios/start', authenticateTeacher, async (req, res) => {
  try {
    const { scenarioId, options } = req.body;
    await scenarioManager.startScenario(scenarioId, options);
    res.json({ message: 'Scénario démarré avec succès' });
  } catch (error) {
    res.status(500).json({ error: 'Erreur lors du démarrage du scénario' });
  }
});

// Arrêter le scénario en cours
router.post('/scenarios/stop', authenticateTeacher, async (req, res) => {
  try {
    await scenarioManager.endScenario();
    res.json({ message: 'Scénario arrêté avec succès' });
  } catch (error) {
    res.status(500).json({ error: 'Erreur lors de l\'arrêt du scénario' });
  }
});

// Obtenir les métriques détaillées
router.get('/metrics', authenticateTeacher, async (req, res) => {
  try {
    const { timeframe = '1h' } = req.query;
    const report = await metricsProcessor.generateReport(timeframe);
    res.json(report);
  } catch (error) {
    res.status(500).json({ error: 'Erreur lors de la récupération des métriques' });
  }
});

// Obtenir les métriques par ville
router.get('/metrics/:cityId', authenticateTeacher, async (req, res) => {
  try {
    const { cityId } = req.params;
    const { timeframe = '1h' } = req.query;
    const metrics = await metricsProcessor.getHistoricalMetrics(cityId, timeframe);
    res.json(metrics);
  } catch (error) {
    res.status(500).json({ error: 'Erreur lors de la récupération des métriques' });
  }
});

// Obtenir les alertes
router.get('/alerts', authenticateTeacher, async (req, res) => {
  try {
    const { limit = 50 } = req.query;
    const alerts = realtimeEvents.networkState.alerts.slice(-limit);
    res.json(alerts);
  } catch (error) {
    res.status(500).json({ error: 'Erreur lors de la récupération des alertes' });
  }
});

// Générer un rapport de simulation
router.get('/report', authenticateTeacher, async (req, res) => {
  try {
    const report = await scenarioManager.generateScenarioReport();
    res.json(report);
  } catch (error) {
    res.status(500).json({ error: 'Erreur lors de la génération du rapport' });
  }
});

// Exporter les données en CSV
router.get('/export/csv', authenticateTeacher, async (req, res) => {
  try {
    const { timeframe = '1h' } = req.query;
    const report = await metricsProcessor.generateReport(timeframe);
    
    // Convertir en CSV
    const csv = generateCSV(report);
    
    res.header('Content-Type', 'text/csv');
    res.attachment('network_report.csv');
    res.send(csv);
  } catch (error) {
    res.status(500).json({ error: 'Erreur lors de l\'export des données' });
  }
});

// Fonction utilitaire pour générer le CSV
function generateCSV(report) {
  const headers = ['Timestamp', 'City', 'Latency', 'Load', 'PacketLoss', 'Throughput'];
  const rows = [];

  report.citiesMetrics.forEach(cityMetric => {
    cityMetric.metrics.forEach(metric => {
      rows.push([
        new Date(metric.timestamp).toISOString(),
        cityMetric.cityId,
        metric.latency,
        metric.load,
        metric.packetLoss,
        metric.throughput
      ].join(','));
    });
  });

  return [headers.join(','), ...rows].join('\n');
}

module.exports = router;
