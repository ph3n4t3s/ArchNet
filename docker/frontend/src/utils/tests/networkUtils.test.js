import { NetworkUtils } from '../../utils/networkUtils';
import { CONFIG } from '../../config/config';

describe('NetworkUtils', () => {
  // Test des calculs de métriques réseau
  describe('calculateNetworkMetrics', () => {
    const sampleData = [
      {
        status: 'online',
        metrics: {
          latency: 50,
          load: 60,
          packetLoss: 0.02,
          throughput: 1000
        },
        connections: [
          { status: 'active' },
          { status: 'active' }
        ]
      },
      {
        status: 'online',
        metrics: {
          latency: 75,
          load: 80,
          packetLoss: 0.03,
          throughput: 800
        },
        connections: [
          { status: 'active' }
        ]
      }
    ];

    it('should calculate correct average metrics', () => {
      const result = NetworkUtils.calculateNetworkMetrics(sampleData);

      expect(result.averageLatency).toBeCloseTo(62.5);
      expect(result.totalLoad).toBeCloseTo(70);
      expect(result.packetLoss).toBeCloseTo(0.025);
      expect(result.throughput).toBeCloseTo(1800);
      expect(result.activeConnections).toBe(3);
    });

    it('should handle empty data', () => {
      const result = NetworkUtils.calculateNetworkMetrics([]);

      expect(result.averageLatency).toBe(0);
      expect(result.totalLoad).toBe(0);
      expect(result.packetLoss).toBe(0);
      expect(result.throughput).toBe(0);
      expect(result.activeConnections).toBe(0);
    });

    it('should ignore offline nodes', () => {
      const dataWithOffline = [
        ...sampleData,
        {
          status: 'offline',
          metrics: {
            latency: 1000,
            load: 100,
            packetLoss: 0.5,
            throughput: 0
          }
        }
      ];

      const result = NetworkUtils.calculateNetworkMetrics(dataWithOffline);

      expect(result.averageLatency).toBeCloseTo(62.5);
      expect(result.totalLoad).toBeCloseTo(70);
    });
  });

  // Test des calculs de scores de santé
  describe('calculateHealthScore', () => {
    it('should calculate correct health score for good metrics', () => {
      const metrics = {
        averageLatency: 30,
        totalLoad: 50,
        packetLoss: 0.01
      };

      const score = NetworkUtils.calculateHealthScore(metrics);
      expect(Number(score)).toBeGreaterThanOrEqual(80);
    });

    it('should calculate correct health score for poor metrics', () => {
      const metrics = {
        averageLatency: 200,
        totalLoad: 95,
        packetLoss: 0.1
      };

      const score = NetworkUtils.calculateHealthScore(metrics);
      expect(Number(score)).toBeLessThanOrEqual(50);
    });

    it('should handle edge cases', () => {
      const perfectMetrics = {
        averageLatency: 0,
        totalLoad: 0,
        packetLoss: 0
      };

      const worstMetrics = {
        averageLatency: 1000,
        totalLoad: 100,
        packetLoss: 1
      };

      expect(Number(NetworkUtils.calculateHealthScore(perfectMetrics))).toBeCloseTo(100);
      expect(Number(NetworkUtils.calculateHealthScore(worstMetrics))).toBeCloseTo(0);
    });
  });

  // Test de l'analyse des routes
  describe('analyzeRoutes', () => {
    const sampleCities = [
      {
        id: 'city1',
        connections: ['city2', 'city3']
      },
      {
        id: 'city2',
        connections: ['city1', 'city3']
      },
      {
        id: 'city3',
        connections: ['city1', 'city2']
      }
    ];

    it('should find all possible paths', () => {
      const analysis = NetworkUtils.analyzeRoutes(sampleCities);
      
      expect(analysis.optimalPaths.size).toBe(sampleCities.length);
      expect(analysis.bottlenecks).toBeDefined();
      expect(analysis.redundancy.size).toBe(sampleCities.length);
    });

    it('should identify bottlenecks', () => {
      const citiesWithBottleneck = [
        ...sampleCities,
        {
          id: 'city4',
          connections: ['city3']
        }
      ];

      const analysis = NetworkUtils.analyzeRoutes(citiesWithBottleneck);
      expect(analysis.bottlenecks.length).toBeGreaterThan(0);
    });

    it('should calculate correct redundancy', () => {
      const analysis = NetworkUtils.analyzeRoutes(sampleCities);
      
      sampleCities.forEach(city => {
        const redundancy = analysis.redundancy.get(city.id);
        expect(redundancy).toBeGreaterThan(0);
      });
    });
  });

  // Test des fonctions de formatage
  describe('formatMetrics', () => {
    it('should correctly format valid metrics', () => {
      const rawMetrics = {
        latency: 123.456,
        load: 78.912,
        packetLoss: 0.0345,
        throughput: 1234.5678
      };

      const formattedMetrics = NetworkUtils.formatMetrics(rawMetrics);

      expect(formattedMetrics.latency).toBeCloseTo(123.46);
      expect(formattedMetrics.load).toBeCloseTo(78.91);
      expect(formattedMetrics.packetLoss).toBeCloseTo(0.0345);
      expect(formattedMetrics.throughput).toBeCloseTo(1234.57);
    });

    it('should handle missing or invalid metrics', () => {
      const invalidMetrics = {
        latency: 'invalid',
        load: undefined,
        packetLoss: null
      };

      const formattedMetrics = NetworkUtils.formatMetrics(invalidMetrics);

      expect(formattedMetrics.latency).toBe(0);
      expect(formattedMetrics.load).toBe(0);
      expect(formattedMetrics.packetLoss).toBe(0);
      expect(formattedMetrics.throughput).toBe(0);
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

      expect(NetworkUtils.validateMetrics(validMetrics)).toBe(true);
    });

    it('should invalidate metrics with missing fields', () => {
      const invalidMetrics = {
        latency: 50,
        load: 75
      };

      expect(NetworkUtils.validateMetrics(invalidMetrics)).toBe(false);
    });

    it('should invalidate metrics with wrong types', () => {
      const invalidMetrics = {
        latency: '50',
        load: 75,
        packetLoss: 0.02,
        throughput: '1000'
      };

      expect(NetworkUtils.validateMetrics(invalidMetrics)).toBe(false);
    });
  });
});
