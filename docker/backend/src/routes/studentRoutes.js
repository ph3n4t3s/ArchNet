const express = require('express');
const router = express.Router();
const { cities } = require('../config/networkCities');
const metricsProcessor = require('../services/metricsProcessor');
const realtimeEvents = require('../services/realtimeEvents');
const scenarioManager = require('../services/scenarioManager');

// Middleware pour vérifier l'assignation d'une ville
const checkCityAssignment = (req, res, next) => {
  const { cityId } = req.params;
  if (!cities.find(city => city.id === cityId)) {
    return res.status(404).json({ error: 'Ville non trouvée' });
  }
  next();
};

// Initialisation d'une session étudiant
router.post('/init', async (req, res) => {
  try {
    const { studentId } = req.body;
    
    // Assigner une ville à l'étudiant
    const availableCities = cities.filter(city => 
      !realtimeEvents.isCityAssigned(city.id)
    );

    if (availableCities.length === 0) {
      return res.status(409).json({ error: 'Toutes les villes sont déjà assignées' });
    }

    const assignedCity = availableCities[0];
    realtimeEvents.assignCityToStudent(assignedCity.id, studentId);

    res.json({
      cityId: assignedCity.id,
      cityName: assignedCity.name,
      region: assignedCity.region,
      connections: assignedCity.connections,
      initialState: realtimeEvents.getCityState(assignedCity.id)
    });
  } catch (error) {
    res.status(500).json({ error: 'Erreur lors de l\'initialisation' });
  }
});

// Obtenir l'état actuel de la ville assignée
router.get('/city/:cityId', checkCityAssignment, async (req, res) => {
  try {
    const { cityId } = req.params;
    const cityState = realtimeEvents.getCityState(cityId);
    
    res.json({
      ...cityState,
      connections: realtimeEvents.getCityConnections(cityId),
      timestamp: Date.now()
    });
  } catch (error) {
    res.status(500).json({ error: 'Erreur lors de la récupération de l\'état de la ville' });
  }
});

// Mettre à jour les métriques de la ville
router.post('/city/:cityId/metrics', checkCityAssignment, async (req, res) => {
  try {
    const { cityId } = req.params;
    const metrics = req.body;

    // Validation des métriques
    if (!validateMetrics(metrics)) {
      return res.status(400).json({ error: 'Métriques invalides' });
    }

    // Traitement des métriques
    const processedMetrics = await metricsProcessor.processMetrics(cityId, metrics);
    
    // Mise à jour de l'état en temps réel
    realtimeEvents.updateCityMetrics(cityId, processedMetrics);

    res.json({
      processed: processedMetrics,
      feedback: generateFeedback(processedMetrics)
    });
  } catch (error) {
    res.status(500).json({ error: 'Erreur lors de la mise à jour des métriques' });
  }
});

// Obtenir les voisins directs
router.get('/city/:cityId/neighbors', checkCityAssignment, async (req, res) => {
  try {
    const { cityId } = req.params;
    const neighbors = realtimeEvents.getNeighbors(cityId);
    
    res.json({
      neighbors: neighbors.map(neighbor => ({
        cityId: neighbor.id,
        name: neighbor.name,
        status: neighbor.status,
        metrics: neighbor.metrics
      }))
    });
  } catch (error) {
    res.status(500).json({ error: 'Erreur lors de la récupération des voisins' });
  }
});

// Envoyer un message à un voisin
router.post('/city/:cityId/send', checkCityAssignment, async (req, res) => {
  try {
    const { cityId } = req.params;
    const { targetCityId, message } = req.body;

    // Vérifier que la ville cible est un voisin
    if (!realtimeEvents.areNeighbors(cityId, targetCityId)) {
      return res.status(400).json({ error: 'La ville cible n\'est pas un voisin direct' });
    }

    // Simuler la transmission du message
    const result = await realtimeEvents.transmitMessage(cityId, targetCityId, message);

    res.json({
      success: true,
      messageId: result.messageId,
      metrics: result.metrics
    });
  } catch (error) {
    res.status(500).json({ error: 'Erreur lors de l\'envoi du message' });
  }
});

// Obtenir l'historique des métriques
router.get('/city/:cityId/history', checkCityAssignment, async (req, res) => {
  try {
    const { cityId } = req.params;
    const { timeframe = '15m' } = req.query;
    
    const history = await metricsProcessor.getHistoricalMetrics(cityId, timeframe);
    
    res.json({
      history,
      summary: calculateMetricsSummary(history)
    });
  } catch (error) {
    res.status(500).json({ error: 'Erreur lors de la récupération de l\'historique' });
  }
});

// Obtenir des indices pour l'optimisation
router.get('/city/:cityId/hints', checkCityAssignment, async (req, res) => {
  try {
    const { cityId } = req.params;
    const cityState = realtimeEvents.getCityState(cityId);
    
    const hints = generateHints(cityState);
    
    res.json({
      hints,
      difficulty: calculateDifficulty(cityState)
    });
  } catch (error) {
    res.status(500).json({ error: 'Erreur lors de la génération des indices' });
  }
});

// Fonctions utilitaires
function validateMetrics(metrics) {
  const requiredFields = ['latency', 'load', 'packetsProcessed', 'packetLoss'];
  return requiredFields.every(field => metrics.hasOwnProperty(field)) &&
         Object.values(metrics).every(value => typeof value === 'number');
}

function generateFeedback(metrics) {
  const feedback = [];
  
  if (metrics.latency > 100) {
    feedback.push({
      type: 'warning',
      message: 'Latence élevée détectée',
      suggestion: 'Vérifiez les routes alternatives disponibles'
    });
  }

  if (metrics.load > 80) {
    feedback.push({
      type: 'warning',
      message: 'Charge importante',
      suggestion: 'Envisagez de redistribuer le trafic'
    });
  }

  return feedback;
}

function calculateMetricsSummary(history) {
  if (!history || history.length === 0) return {};

  const summary = {
    averageLatency: 0,
    maxLoad: 0,
    totalPackets: 0
  };

  history.forEach(metric => {
    summary.averageLatency += metric.latency;
    summary.maxLoad = Math.max(summary.maxLoad, metric.load);
    summary.totalPackets += metric.packetsProcessed;
  });

  summary.averageLatency /= history.length;
  return summary;
}

function generateHints(cityState) {
  const hints = [];

  // Analyse de la performance
  if (cityState.metrics.latency > 150) {
    hints.push({
      type: 'performance',
      message: 'Les temps de réponse sont très élevés',
      action: 'Examinez les routes alternatives disponibles'
    });
  }

  // Analyse de la charge
  if (cityState.metrics.load > 90) {
    hints.push({
      type: 'load',
      message: 'La charge du réseau est critique',
      action: 'Répartissez le trafic sur plusieurs routes'
    });
  }

  return hints;
}

function calculateDifficulty(cityState) {
  let difficulty = 0;
  
  // Facteurs augmentant la difficulté
  if (cityState.metrics.latency > 100) difficulty += 1;
  if (cityState.metrics.load > 80) difficulty += 1;
  if (cityState.metrics.packetLoss > 0.05) difficulty += 1;
  
  return {
    level: difficulty >= 2 ? 'hard' : difficulty >= 1 ? 'medium' : 'easy',
    factors: difficulty
  };
}

module.exports = router;
