import { SimulationUtils } from '../../utils/simulationUtils';
import { CONFIG, CONSTANTS } from '../../config/config';

describe('SimulationUtils', () => {
  // Test de génération d'événements réseau
  describe('generateNetworkEvent', () => {
    it('should generate valid network failure event', () => {
      const event = SimulationUtils.generateNetworkEvent('network_failure', 1);
      
      expect(event).toMatchObject({
        type: CONSTANTS.EVENT_TYPES.NETWORK_ISSUE,
        timestamp: expect.any(Number),
        affectedCities: expect.any(Array),
        metrics: expect.objectContaining({
          latencyIncrease: expect.any(Number),
          packetLossIncrease: expect.any(Number)
        }),
        duration: expect.any(Number)
      });

      expect(event.metrics.latencyIncrease).toBeGreaterThan(0);
      expect(event.metrics.packetLossIncrease).toBeGreaterThan(0);
    });

    it('should generate valid traffic surge event', () => {
      const event = SimulationUtils.generateNetworkEvent('traffic_surge', 0.8);
      
      expect(event).toMatchObject({
        type: CONSTANTS.EVENT_TYPES.TRAFFIC_SPIKE,
        affectedCities: expect.any(Array),
        metrics: expect.objectContaining({
          loadIncrease: expect.any(Number),
          bandwidthUtilization: expect.any(Number)
        })
      });

      expect(event.metrics.loadIncrease).toBeLessThanOrEqual(70);
      expect(event.metrics.bandwidthUtilization).toBeLessThanOrEqual(1);
    });

    it('should generate valid DDoS attack event', () => {
      const event = SimulationUtils.generateNetworkEvent('ddos_attack', 0.5);
      
      expect(event).toMatchObject({
        type: CONSTANTS.EVENT_TYPES.ATTACK,
        metrics: expect.objectContaining({
          requestsPerSecond: expect.any(Number),
          bandwidthUtilization: expect.any(Number),
          packetLossIncrease: expect.any(Number)
        })
      });
    });

    it('should scale event intensity correctly', () => {
      const lowIntensity = SimulationUtils.generateNetworkEvent('network_failure', 0.2);
      const highIntensity = SimulationUtils.generateNetworkEvent('network_failure', 1.0);

      expect(highIntensity.metrics.latencyIncrease)
        .toBeGreaterThan(lowIntensity.metrics.latencyIncrease);
      expect(highIntensity.metrics.packetLossIncrease)
        .toBeGreaterThan(lowIntensity.metrics.packetLossIncrease);
    });
  });

  // Test de génération de métriques réseau
  describe('generateNetworkMetrics', () => {
    const baseMetrics = {
      latency: 50,
      load: 40,
      packetLoss: 0.01,
      bandwidth: 1000
    };

    it('should generate valid metrics without events', () => {
      const metrics = SimulationUtils.generateNetworkMetrics(baseMetrics);

      expect(metrics.latency).toBeGreaterThan(0);
      expect(metrics.load).toBeLessThanOrEqual(100);
      expect(metrics.packetLoss).toBeLessThanOrEqual(1);
      expect(metrics.bandwidth).toBeGreaterThan(0);
    });

    it('should apply event impacts correctly', () => {
      const events = [
        SimulationUtils.generateNetworkEvent('network_failure', 0.5),
        SimulationUtils.generateNetworkEvent('traffic_surge', 0.3)
      ];

      const metrics = SimulationUtils.generateNetworkMetrics(baseMetrics, events);

      expect(metrics.latency).toBeGreaterThan(baseMetrics.latency);
      expect(metrics.load).toBeGreaterThan(baseMetrics.load);
    });

    it('should respect metric bounds', () => {
      const extremeMetrics = {
        latency: 1000,
        load: 95,
        packetLoss: 0.9,
        bandwidth: 100
      };

      const events = [
        SimulationUtils.generateNetworkEvent('network_failure', 1),
        SimulationUtils.generateNetworkEvent('ddos_attack', 1)
      ];

      const metrics = SimulationUtils.generateNetworkMetrics(extremeMetrics, events);

      expect(metrics.load).toBeLessThanOrEqual(100);
      expect(metrics.packetLoss).toBeLessThanOrEqual(1);
      expect(metrics.bandwidth).toBeGreaterThanOrEqual(0);
    });
  });

  // Test de génération de scénarios
  describe('generateScenario', () => {
    it('should generate valid beginner scenario', () => {
      const scenario = SimulationUtils.generateScenario('beginner');

      expect(scenario).toMatchObject({
        difficulty: 'beginner',
        duration: expect.any(Number),
        events: expect.any(Array),
        objectives: expect.any(Array)
      });

      expect(scenario.events.length).toBeGreaterThan(0);
      expect(scenario.objectives.length).toBeGreaterThan(0);
    });

    it('should generate valid intermediate scenario', () => {
      const scenario = SimulationUtils.generateScenario('intermediate');
      
      expect(scenario.duration).toBeGreaterThan(
        CONFIG.SCENARIOS.DURATIONS.SHORT
      );
      expect(scenario.events.length).toBeGreaterThan(0);
    });

    it('should generate valid advanced scenario', () => {
      const scenario = SimulationUtils.generateScenario('advanced');
      
      expect(scenario.events.length).toBeGreaterThanOrEqual(
        scenario.events.filter(e => 
          e.type === CONSTANTS.EVENT_TYPES.NETWORK_ISSUE
        ).length
      );
    });

    it('should respect event timing constraints', () => {
      const scenario = SimulationUtils.generateScenario('intermediate');
      const sortedEvents = [...scenario.events].sort((a, b) => a.timestamp - b.timestamp);

      expect(sortedEvents).toEqual(scenario.events);
      
      for (let i = 1; i < sortedEvents.length; i++) {
        expect(sortedEvents[i].timestamp).toBeGreaterThan(sortedEvents[i-1].timestamp);
      }
    });
  });

  // Test des objectifs de scénario
  describe('generateScenarioObjectives', () => {
    it('should generate valid objectives for each difficulty', () => {
      const difficulties = ['beginner', 'intermediate', 'advanced'];
      
      difficulties.forEach(difficulty => {
        const objectives = SimulationUtils.generateScenarioObjectives(difficulty);
        
        expect(objectives.length).toBeGreaterThan(0);
        expect(
          objectives.reduce((sum, obj) => sum + obj.weight, 0)
        ).toBeCloseTo(1);

        objectives.forEach(objective => {
          expect(objective).toMatchObject({
            type: expect.any(String),
            metric: expect.any(String),
            target: expect.any(Number),
            weight: expect.any(Number),
            description: expect.any(String)
          });
        });
      });
    });

    it('should set appropriate difficulty-based targets', () => {
      const beginnerObjectives = SimulationUtils.generateScenarioObjectives('beginner');
      const advancedObjectives = SimulationUtils.generateScenarioObjectives('advanced');

      beginnerObjectives.forEach((obj, index) => {
        expect(obj.target).toBeLessThan(advancedObjectives[index].target);
      });
    });
  });

  // Test des utilitaires de calcul
  describe('calculateEventImpact', () => {
    it('should calculate correct impact for network failure', () => {
      const event = SimulationUtils.generateNetworkEvent('network_failure', 1);
      const impact = SimulationUtils.calculateEventImpact(event);

      expect(impact.latency).toBeGreaterThan(0);
      expect(impact.packetLoss).toBeGreaterThan(0);
    });

    it('should calculate correct impact for traffic surge', () => {
      const event = SimulationUtils.generateNetworkEvent('traffic_surge', 1);
      const impact = SimulationUtils.calculateEventImpact(event);

      expect(impact.load).toBeGreaterThan(0);
      expect(impact.bandwidthReduction).toBeGreaterThan(0);
    });
  });
});
