import NetworkUtils from '../../utils/networkUtils';
import SimulationUtils from '../../utils/simulationUtils';
import EventUtils from '../../utils/eventUtils';
import PedagogicalUtils from '../../utils/pedagogicalUtils';
import ValidationUtils from '../../utils/validationUtils';
import { CONFIG, CONSTANTS } from '../../config/config';

describe('Network Simulation Integration Tests', () => {
  // Test du flux complet d'une simulation
  describe('Complete Simulation Flow', () => {
    let simulationState;
    let events = [];
    let studentActions = [];

    beforeEach(() => {
      simulationState = {
        cities: new Map(),
        connections: new Map(),
        metrics: {
          global: {
            latency: 0,
            load: 0,
            packetLoss: 0
          }
        }
      };
    });

    it('should run a complete simulation scenario', async () => {
      // 1. Génération du scénario
      const scenario = SimulationUtils.generateScenario('intermediate');
      expect(scenario).toBeDefined();
      expect(scenario.events.length).toBeGreaterThan(0);

      // 2. Initialisation des métriques
      scenario.events.forEach(event => {
        const metrics = SimulationUtils.generateNetworkMetrics(
          simulationState.metrics.global,
          [event]
        );
        expect(metrics).toBeDefined();
        simulationState.metrics.global = metrics;
      });

      // 3. Validation des données
      const validation = ValidationUtils.validateNetworkData({
        cities: Array.from(simulationState.cities.values()),
        connections: Array.from(simulationState.connections.values())
      });
      expect(validation.isValid).toBe(true);

      // 4. Traitement des événements
      for (const event of scenario.events) {
        // Créer l'événement
        const networkEvent = EventUtils.createEvent(
          event.type,
          event.data,
          event.severity
        );
        events.push(networkEvent);

        // Simuler une action étudiante
        const studentAction = {
          type: 'route_update',
          timestamp: Date.now(),
          response: {
            eventId: networkEvent.id,
            action: 'modify_route',
            success: true
          }
        };
        studentActions.push(studentAction);

        // Mettre à jour les métriques
        simulationState.metrics.global = SimulationUtils.generateNetworkMetrics(
          simulationState.metrics.global,
          [event]
        );
      }

      // 5. Évaluation pédagogique
      const evaluation = PedagogicalUtils.evaluateStudentPerformance({
        networkMetrics: simulationState.metrics.global,
        events,
        actions: studentActions
      });

      expect(evaluation.totalScore).toBeGreaterThanOrEqual(0);
      expect(evaluation.totalScore).toBeLessThanOrEqual(100);
      expect(evaluation.feedback).toBeDefined();
      expect(evaluation.recommendations).toBeDefined();
    });
  });

  // Test des interactions entre composants
  describe('Component Interactions', () => {
    it('should handle network events and update metrics correctly', () => {
      // Créer un événement réseau
      const networkEvent = EventUtils.createEvent(
        CONSTANTS.EVENT_TYPES.NETWORK_ISSUE,
        { severity: 'high' }
      );

      // Générer les métriques basées sur l'événement
      const metrics = SimulationUtils.generateNetworkMetrics(
        { latency: 50, load: 60, packetLoss: 0.01 },
        [networkEvent]
      );

      // Valider les métriques
      const validation = ValidationUtils.validateMetrics(metrics);
      expect(validation.length).toBe(0);

      // Analyser les événements
      const analysis = EventUtils.analyzeEvents([networkEvent]);
      expect(analysis.total).toBe(1);
    });

    it('should evaluate student performance based on network state', () => {
      const events = [
        EventUtils.createEvent(CONSTANTS.EVENT_TYPES.NETWORK_ISSUE),
        EventUtils.createEvent(CONSTANTS.EVENT_TYPES.TRAFFIC_SPIKE)
      ];

      const actions = [
        {
          type: 'diagnostic',
          timestamp: Date.now(),
          success: true
        },
        {
          type: 'route_update',
          timestamp: Date.now() + 1000,
          success: true
        }
      ];

      const metrics = SimulationUtils.generateNetworkMetrics(
        { latency: 50, load: 60, packetLoss: 0.01 },
        events
      );

      const evaluation = PedagogicalUtils.evaluateStudentPerformance({
        networkMetrics: metrics,
        events,
        actions
      });

      expect(evaluation.scores.problemResolution).toBeGreaterThan(0);
    });
  });

  // Test de gestion des erreurs
  describe('Error Handling', () => {
    it('should handle invalid network data gracefully', () => {
      const invalidData = {
        cities: [
          {
            id: 'PAR',
            metrics: { latency: -50 } // Métrique invalide
          }
        ]
      };

      // Validation
      const validation = ValidationUtils.validateNetworkData(invalidData);
      expect(validation.isValid).toBe(false);

      // Tentative de génération de métriques
      const metrics = SimulationUtils.generateNetworkMetrics(
        { latency: -50, load: 60, packetLoss: 0.01 },
        []
      );
      expect(metrics.latency).toBeGreaterThanOrEqual(0);
    });

    it('should handle concurrent events correctly', async () => {
      const events = [
        EventUtils.createEvent(CONSTANTS.EVENT_TYPES.NETWORK_ISSUE),
        EventUtils.createEvent(CONSTANTS.EVENT_TYPES.TRAFFIC_SPIKE)
      ];

      // Traiter les événements simultanément
      const metricsPromises = events.map(event =>
        Promise.resolve(SimulationUtils.generateNetworkMetrics(
          { latency: 50, load: 60, packetLoss: 0.01 },
          [event]
        ))
      );

      const results = await Promise.all(metricsPromises);
      expect(results.length).toBe(events.length);
      results.forEach(metrics => {
        expect(ValidationUtils.validateMetrics(metrics).length).toBe(0);
      });
    });
  });

  // Test de performance
  describe('Performance Tests', () => {
    it('should handle large number of events efficiently', () => {
      const startTime = Date.now();
      const numberOfEvents = 1000;

      const events = Array.from({ length: numberOfEvents }, () =>
        EventUtils.createEvent(
          CONSTANTS.EVENT_TYPES.NETWORK_ISSUE,
          { severity: 'low' }
        )
      );

      const analysis = EventUtils.analyzeEvents(events);
      const endTime = Date.now();

      expect(endTime - startTime).toBeLessThan(1000); // Moins d'une seconde
      expect(analysis.total).toBe(numberOfEvents);
    });
  });
});
