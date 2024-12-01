import { ValidationUtils } from '../../utils/validationUtils';
import { CONFIG } from '../../config/config';

describe('ValidationUtils', () => {
  // Test de validation des données réseau
  describe('validateNetworkData', () => {
    const validNetworkData = {
      cities: [
        {
          id: 'PAR',
          name: 'Paris',
          region: 'Europe',
          metrics: {
            latency: 50,
            load: 60,
            packetLoss: 0.02,
            throughput: 1000
          }
        }
      ],
      connections: [
        {
          source: 'PAR',
          target: 'LON',
          latency: 20,
          bandwidth: 10000
        }
      ]
    };

    it('should validate correct network data', () => {
      const result = ValidationUtils.validateNetworkData(validNetworkData);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect missing required fields', () => {
      const invalidData = {
        cities: [
          {
            id: 'PAR',
            // missing name and region
            metrics: {
              latency: 50,
              load: 60
            }
          }
        ]
      };

      const result = ValidationUtils.validateNetworkData(invalidData);
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should validate metric ranges', () => {
      const dataWithInvalidMetrics = {
        ...validNetworkData,
        cities: [
          {
            ...validNetworkData.cities[0],
            metrics: {
              latency: -50,  // invalid negative latency
              load: 150,     // invalid load > 100%
              packetLoss: 2, // invalid loss > 1
              throughput: 0
            }
          }
        ]
      };

      const result = ValidationUtils.validateNetworkData(dataWithInvalidMetrics);
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.includes('Métrique'))).toBe(true);
    });
  });

  // Test de l'analyse de la qualité des données
  describe('analyzeDataQuality', () => {
    const sampleData = {
      cities: [
        {
          id: 'PAR',
          name: 'Paris',
          region: 'Europe',
          metrics: {
            latency: 50,
            load: 60,
            packetLoss: 0.02,
            throughput: 1000
          }
        }
      ],
      connections: [
        {
          source: 'PAR',
          target: 'LON',
          latency: 20,
          bandwidth: 10000
        }
      ]
    };

    it('should calculate completeness correctly', () => {
      const analysis = ValidationUtils.analyzeDataQuality(sampleData);
      expect(analysis.completeness.cities).toBeGreaterThan(0.9);
      expect(analysis.completeness.metrics).toBeGreaterThan(0.9);
    });

    it('should detect data accuracy', () => {
      const analysis = ValidationUtils.analyzeDataQuality(sampleData);
      expect(analysis.accuracy.metrics).toBeGreaterThan(0.8);
      expect(analysis.accuracy.topology).toBeGreaterThan(0.8);
    });

    it('should identify data consistency', () => {
      const analysis = ValidationUtils.analyzeDataQuality(sampleData);
      expect(analysis.consistency.metricsConsistency).toBeDefined();
      expect(analysis.consistency.topologyConsistency).toBeDefined();
    });

    it('should calculate overall quality score', () => {
      const analysis = ValidationUtils.analyzeDataQuality(sampleData);
      expect(analysis.qualityScore).toBeGreaterThanOrEqual(0);
      expect(analysis.qualityScore).toBeLessThanOrEqual(100);
    });
  });

  // Test de validation des métriques
  describe('validateMetrics', () => {
    it('should validate correct metrics', () => {
      const validMetrics = {
        latency: 50,
        load: 75,
        packetLoss: 0.02,
        throughput: 1000
      };

      const errors = ValidationUtils.validateMetrics(validMetrics);
      expect(errors).toHaveLength(0);
    });

    it('should detect invalid metric values', () => {
      const invalidMetrics = {
        latency: -10,
        load: 120,
        packetLoss: 1.5,
        throughput: -500
      };

      const errors = ValidationUtils.validateMetrics(invalidMetrics);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should handle missing metrics', () => {
      const incompleteMetrics = {
        latency: 50,
        load: 75
      };

      const errors = ValidationUtils.validateMetrics(incompleteMetrics);
      expect(errors.length).toBeGreaterThan(0);
    });
  });

  // Test de détection d'anomalies
  describe('detectAnomalies', () => {
    const sampleData = {
      cities: [
        {
          id: 'PAR',
          metrics: {
            latency: 200,  // Anomalie de latence
            load: 95,      // Anomalie de charge
            packetLoss: 0.1, // Anomalie de perte de paquets
            throughput: 100
          }
        }
      ]
    };

    it('should detect metric anomalies', () => {
      const anomalies = ValidationUtils.detectAnomalies(sampleData);
      expect(anomalies.metrics.length).toBeGreaterThan(0);
    });

    it('should detect topology anomalies', () => {
      const dataWithTopologyIssues = {
        ...sampleData,
        connections: [
          { source: 'PAR', target: 'UNKNOWN' }
        ]
      };

      const anomalies = ValidationUtils.detectAnomalies(dataWithTopologyIssues);
      expect(anomalies.topology.length).toBeGreaterThan(0);
    });

    it('should calculate anomaly severity correctly', () => {
      const anomalies = ValidationUtils.detectAnomalies(sampleData);
      anomalies.metrics.forEach(anomaly => {
        expect(anomaly).toHaveProperty('severity');
        expect(['low', 'medium', 'high']).toContain(anomaly.severity);
      });
    });
  });

  // Test de calcul de qualité des données
  describe('calculateQualityScore', () => {
    const mockAnalysis = {
      completeness: {
        cities: 1,
        metrics: 0.9,
        connections: 0.95
      },
      accuracy: {
        overall: 0.85
      },
      consistency: {
        metricsConsistency: 0.9,
        topologyConsistency: 0.95,
        temporalConsistency: 0.85
      },
      anomalies: {
        totalCount: 2
      }
    };

    it('should calculate weighted quality score', () => {
      const score = ValidationUtils.calculateQualityScore(mockAnalysis);
      expect(score).toBeGreaterThan(0);
      expect(score).toBeLessThan(1);
    });

    it('should handle perfect data', () => {
      const perfectAnalysis = {
        completeness: {
          cities: 1,
          metrics: 1,
          connections: 1
        },
        accuracy: {
          overall: 1
        },
        consistency: {
          metricsConsistency: 1,
          topologyConsistency: 1,
          temporalConsistency: 1
        },
        anomalies: {
          totalCount: 0
        }
      };

      const score = ValidationUtils.calculateQualityScore(perfectAnalysis);
      expect(score).toBeCloseTo(1);
    });

    it('should handle poor quality data', () => {
      const poorAnalysis = {
        completeness: {
          cities: 0.5,
          metrics: 0.4,
          connections: 0.3
        },
        accuracy: {
          overall: 0.3
        },
        consistency: {
          metricsConsistency: 0.4,
          topologyConsistency: 0.3,
          temporalConsistency: 0.2
        },
        anomalies: {
          totalCount: 10
        }
      };

      const score = ValidationUtils.calculateQualityScore(poorAnalysis);
      expect(score).toBeLessThan(0.5);
    });
  });
});
