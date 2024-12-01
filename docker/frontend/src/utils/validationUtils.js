import { CONFIG, CONSTANTS } from '../config/config';

export const ValidationUtils = {
  // Validation des données réseau
  validateNetworkData: (data) => {
    if (!data || typeof data !== 'object') {
      return {
        isValid: false,
        errors: ['Données réseau invalides']
      };
    }

    const errors = [];
    
    // Validation de la structure de base
    if (!data.cities || !Array.isArray(data.cities)) {
      errors.push('Structure de données des villes invalide');
    }

    if (!data.connections || !Array.isArray(data.connections)) {
      errors.push('Structure de données des connexions invalide');
    }

    // Validation détaillée des villes
    if (data.cities) {
      data.cities.forEach((city, index) => {
        const cityErrors = ValidationUtils.validateCity(city);
        if (cityErrors.length > 0) {
          errors.push(`Ville ${index + 1}: ${cityErrors.join(', ')}`);
        }
      });
    }

    // Validation des connexions
    if (data.connections) {
      data.connections.forEach((connection, index) => {
        const connectionErrors = ValidationUtils.validateConnection(connection);
        if (connectionErrors.length > 0) {
          errors.push(`Connexion ${index + 1}: ${connectionErrors.join(', ')}`);
        }
      });
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  },

  validateCity: (city) => {
    const errors = [];

    if (!city.id) errors.push('ID manquant');
    if (!city.name) errors.push('Nom manquant');
    if (!city.region) errors.push('Région manquante');
    
    if (!city.metrics || typeof city.metrics !== 'object') {
      errors.push('Métriques invalides');
    } else {
      const metricErrors = ValidationUtils.validateMetrics(city.metrics);
      errors.push(...metricErrors);
    }

    return errors;
  },

  validateConnection: (connection) => {
    const errors = [];

    if (!connection.source) errors.push('Source manquante');
    if (!connection.target) errors.push('Destination manquante');
    if (typeof connection.latency !== 'number') errors.push('Latence invalide');
    if (typeof connection.bandwidth !== 'number') errors.push('Bande passante invalide');

    return errors;
  },

  validateMetrics: (metrics) => {
    const errors = [];
    const requiredMetrics = ['latency', 'load', 'packetLoss', 'throughput'];

    requiredMetrics.forEach(metric => {
      if (typeof metrics[metric] !== 'number' || isNaN(metrics[metric])) {
        errors.push(`Métrique ${metric} invalide`);
      }
    });

    // Validation des plages de valeurs
    if (metrics.latency < 0) errors.push('Latence négative');
    if (metrics.load < 0 || metrics.load > 100) errors.push('Charge invalide');
    if (metrics.packetLoss < 0 || metrics.packetLoss > 1) errors.push('Perte de paquets invalide');
    if (metrics.throughput < 0) errors.push('Débit invalide');

    return errors;
  },

  // Analyse des données
  analyzeDataQuality: (data) => {
    const analysis = {
      completeness: ValidationUtils.calculateCompleteness(data),
      accuracy: ValidationUtils.calculateAccuracy(data),
      consistency: ValidationUtils.checkConsistency(data),
      anomalies: ValidationUtils.detectAnomalies(data)
    };

    analysis.qualityScore = ValidationUtils.calculateQualityScore(analysis);
    return analysis;
  },

  calculateCompleteness: (data) => {
    const requiredFields = {
      cities: ['id', 'name', 'region', 'metrics'],
      metrics: ['latency', 'load', 'packetLoss', 'throughput'],
      connections: ['source', 'target', 'latency', 'bandwidth']
    };

    const completeness = {
      cities: 0,
      metrics: 0,
      connections: 0
    };

    // Vérifier les villes
    if (data.cities && Array.isArray(data.cities)) {
      const cityScores = data.cities.map(city => {
        const fieldsPresent = requiredFields.cities.filter(field => 
          city.hasOwnProperty(field)
        ).length;
        return fieldsPresent / requiredFields.cities.length;
      });
      completeness.cities = cityScores.reduce((a, b) => a + b, 0) / cityScores.length;
    }

    // Vérifier les métriques
    if (data.cities && Array.isArray(data.cities)) {
      const metricScores = data.cities.map(city => {
        if (!city.metrics) return 0;
        const fieldsPresent = requiredFields.metrics.filter(field =>
          city.metrics.hasOwnProperty(field)
        ).length;
        return fieldsPresent / requiredFields.metrics.length;
      });
      completeness.metrics = metricScores.reduce((a, b) => a + b, 0) / metricScores.length;
    }

    // Vérifier les connexions
    if (data.connections && Array.isArray(data.connections)) {
      const connectionScores = data.connections.map(conn => {
        const fieldsPresent = requiredFields.connections.filter(field =>
          conn.hasOwnProperty(field)
        ).length;
        return fieldsPresent / requiredFields.connections.length;
      });
      completeness.connections = connectionScores.reduce((a, b) => a + b, 0) / connectionScores.length;
    }

    return completeness;
  },

  calculateAccuracy: (data) => {
    const accuracy = {
      metrics: ValidationUtils.validateMetricsAccuracy(data),
      topology: ValidationUtils.validateTopologyAccuracy(data)
    };

    accuracy.overall = (accuracy.metrics + accuracy.topology) / 2;
    return accuracy;
  },

  validateMetricsAccuracy: (data) => {
    let validMetrics = 0;
    let totalMetrics = 0;

    if (data.cities && Array.isArray(data.cities)) {
      data.cities.forEach(city => {
        if (city.metrics) {
          totalMetrics += 4; // latency, load, packetLoss, throughput
          if (city.metrics.latency >= 0 && city.metrics.latency <= 1000) validMetrics++;
          if (city.metrics.load >= 0 && city.metrics.load <= 100) validMetrics++;
          if (city.metrics.packetLoss >= 0 && city.metrics.packetLoss <= 1) validMetrics++;
          if (city.metrics.throughput >= 0) validMetrics++;
        }
      });
    }

    return totalMetrics > 0 ? validMetrics / totalMetrics : 0;
  },

  validateTopologyAccuracy: (data) => {
    if (!data.cities || !data.connections) return 0;

    const cityIds = new Set(data.cities.map(city => city.id));
    let validConnections = 0;

    data.connections.forEach(conn => {
      if (cityIds.has(conn.source) && cityIds.has(conn.target)) {
        validConnections++;
      }
    });

    return data.connections.length > 0 ? validConnections / data.connections.length : 0;
  },

  checkConsistency: (data) => {
    return {
      metricsConsistency: ValidationUtils.checkMetricsConsistency(data),
      topologyConsistency: ValidationUtils.checkTopologyConsistency(data),
      temporalConsistency: ValidationUtils.checkTemporalConsistency(data)
    };
  },

  detectAnomalies: (data) => {
    const anomalies = {
      metrics: ValidationUtils.detectMetricAnomalies(data),
      topology: ValidationUtils.detectTopologyAnomalies(data),
      temporal: ValidationUtils.detectTemporalAnomalies(data)
    };

    return {
      anomalies,
      totalCount: Object.values(anomalies).reduce((sum, arr) => sum + arr.length, 0)
    };
  },

  calculateQualityScore: (analysis) => {
    const weights = {
      completeness: 0.3,
      accuracy: 0.3,
      consistency: 0.2,
      anomalies: 0.2
    };

    return (
      weights.completeness * (
        (analysis.completeness.cities + 
         analysis.completeness.metrics + 
         analysis.completeness.connections) / 3
      ) +
      weights.accuracy * analysis.accuracy.overall +
      weights.consistency * (
        (analysis.consistency.metricsConsistency + 
         analysis.consistency.topologyConsistency + 
         analysis.consistency.temporalConsistency) / 3
      ) +
      weights.anomalies * (1 - analysis.anomalies.totalCount / 100)
    );
  }
};

export default ValidationUtils;
