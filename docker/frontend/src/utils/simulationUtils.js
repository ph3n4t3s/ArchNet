import { CONFIG, CONSTANTS } from '../config/config';
import { cities } from '../config/networkCities';

export const SimulationUtils = {
  // Générateur d'événements réseau
  generateNetworkEvent: (type, intensity = 1) => {
    const now = Date.now();
    const affectedCities = SimulationUtils.selectRandomCities(
      Math.ceil(cities.length * intensity * 0.3)
    );

    switch (type) {
      case 'network_failure':
        return {
          type: CONSTANTS.EVENT_TYPES.NETWORK_ISSUE,
          timestamp: now,
          affectedCities,
          metrics: {
            latencyIncrease: 100 + Math.random() * 200 * intensity,
            packetLossIncrease: 0.1 + Math.random() * 0.2 * intensity
          },
          duration: 300000 * intensity // 5 minutes * intensité
        };

      case 'traffic_surge':
        return {
          type: CONSTANTS.EVENT_TYPES.TRAFFIC_SPIKE,
          timestamp: now,
          affectedCities,
          metrics: {
            loadIncrease: 30 + Math.random() * 40 * intensity,
            bandwidthUtilization: 0.7 + Math.random() * 0.3 * intensity
          },
          duration: 180000 * intensity // 3 minutes * intensité
        };

      case 'ddos_attack':
        return {
          type: CONSTANTS.EVENT_TYPES.ATTACK,
          timestamp: now,
          affectedCities,
          metrics: {
            requestsPerSecond: 1000 * intensity,
            bandwidthUtilization: 0.9 * intensity,
            packetLossIncrease: 0.15 * intensity
          },
          duration: 600000 * intensity // 10 minutes * intensité
        };

      default:
        return null;
    }
  },

  // Générateur de métriques réseau
  generateNetworkMetrics: (baseMetrics, events = []) => {
    const metrics = { ...baseMetrics };
    
    // Appliquer l'impact des événements actifs
    events.forEach(event => {
      const eventImpact = SimulationUtils.calculateEventImpact(event);
      metrics.latency += eventImpact.latency;
      metrics.load += eventImpact.load;
      metrics.packetLoss += eventImpact.packetLoss;
      metrics.bandwidth = Math.max(0, metrics.bandwidth - eventImpact.bandwidthReduction);
    });

    // Ajouter une variation aléatoire
    return {
      latency: Math.max(0, metrics.latency * (1 + (Math.random() - 0.5) * 0.1)),
      load: Math.min(100, Math.max(0, metrics.load * (1 + (Math.random() - 0.5) * 0.1))),
      packetLoss: Math.min(1, Math.max(0, metrics.packetLoss * (1 + (Math.random() - 0.5) * 0.1))),
      bandwidth: Math.max(0, metrics.bandwidth * (1 + (Math.random() - 0.5) * 0.1))
    };
  },

  // Générateur de scénarios pédagogiques
  generateScenario: (difficulty = 'intermediate') => {
    const duration = CONFIG.SCENARIOS.DURATIONS[difficulty.toUpperCase()] || 600;
    const events = [];
    let currentTime = 0;

    // Configuration de la complexité du scénario
    const config = CONFIG.PEDAGOGY.DIFFICULTY_PROGRESSION[difficulty];
    const eventInterval = config.ISSUE_INTERVAL;
    const maxConcurrentIssues = config.MAX_CONCURRENT_ISSUES;

    while (currentTime < duration * 1000) {
      // Ajouter des événements en fonction de la difficulté
      const numberOfEvents = Math.floor(Math.random() * maxConcurrentIssues) + 1;
      
      for (let i = 0; i < numberOfEvents; i++) {
        const eventType = SimulationUtils.selectRandomEventType(difficulty);
        const intensity = SimulationUtils.calculateEventIntensity(difficulty);
        
        events.push({
          ...SimulationUtils.generateNetworkEvent(eventType, intensity),
          timestamp: currentTime
        });
      }

      currentTime += eventInterval + Math.random() * eventInterval;
    }

    return {
      difficulty,
      duration,
      events: events.sort((a, b) => a.timestamp - b.timestamp),
      objectives: SimulationUtils.generateScenarioObjectives(difficulty)
    };
  },

  // Fonctions utilitaires
  selectRandomCities: (count) => {
    const shuffled = [...cities].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, count);
  },

  calculateEventImpact: (event) => {
    const baseImpact = {
      latency: 0,
      load: 0,
      packetLoss: 0,
      bandwidthReduction: 0
    };

    switch (event.type) {
      case CONSTANTS.EVENT_TYPES.NETWORK_ISSUE:
        return {
          ...baseImpact,
          latency: event.metrics.latencyIncrease,
          packetLoss: event.metrics.packetLossIncrease
        };

      case CONSTANTS.EVENT_TYPES.TRAFFIC_SPIKE:
        return {
          ...baseImpact,
          load: event.metrics.loadIncrease,
          bandwidthReduction: event.metrics.bandwidthUtilization * 100
        };

      case CONSTANTS.EVENT_TYPES.ATTACK:
        return {
          ...baseImpact,
          latency: event.metrics.requestsPerSecond * 0.1,
          load: 90,
          packetLoss: event.metrics.packetLossIncrease,
          bandwidthReduction: event.metrics.bandwidthUtilization * 100
        };

      default:
        return baseImpact;
    }
  },

  selectRandomEventType: (difficulty) => {
    const eventTypes = {
      beginner: ['network_failure', 'traffic_surge'],
      intermediate: ['network_failure', 'traffic_surge', 'ddos_attack'],
      advanced: ['network_failure', 'traffic_surge', 'ddos_attack', 'cascading_failure']
    };

    const availableTypes = eventTypes[difficulty] || eventTypes.intermediate;
    return availableTypes[Math.floor(Math.random() * availableTypes.length)];
  },

  calculateEventIntensity: (difficulty) => {
    const intensityRanges = {
      beginner: { min: 0.3, max: 0.6 },
      intermediate: { min: 0.5, max: 0.8 },
      advanced: { min: 0.7, max: 1.0 }
    };

    const range = intensityRanges[difficulty] || intensityRanges.intermediate;
    return range.min + Math.random() * (range.max - range.min);
  },

  generateScenarioObjectives: (difficulty) => {
    const objectives = [];
    const baseScore = {
      beginner: 60,
      intermediate: 75,
      advanced: 85
    }[difficulty] || 70;

    objectives.push({
      type: 'performance',
      metric: 'latency',
      target: baseScore,
      weight: 0.3,
      description: 'Maintenir une latence moyenne acceptable'
    });

    objectives.push({
      type: 'reliability',
      metric: 'packetLoss',
      target: baseScore,
      weight: 0.3,
      description: 'Minimiser la perte de paquets'
    });

    objectives.push({
      type: 'efficiency',
      metric: 'load',
      target: baseScore,
      weight: 0.2,
      description: 'Optimiser la charge réseau'
    });

    objectives.push({
      type: 'response',
      metric: 'responseTime',
      target: baseScore,
      weight: 0.2,
      description: 'Réagir rapidement aux incidents'
    });

    return objectives;
  }
};

export default SimulationUtils;

