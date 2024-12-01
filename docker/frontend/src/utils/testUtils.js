import { CONFIG, CONSTANTS } from '../config/config';
import NetworkUtils from './networkUtils';
import SimulationUtils from './simulationUtils';

export const TestUtils = {
  // Configuration des tests
  testConfig: {
    networkTests: {
      minSampleSize: 100,
      maxLatency: 1000,  // ms
      maxLoad: 100,      // percentage
      maxPacketLoss: 1,  // ratio
      testDuration: 300  // seconds
    },
    simulationTests: {
      scenarioDurations: {
        short: 300,   // 5 minutes
        medium: 600,  // 10 minutes
        long: 1200    // 20 minutes
      },
      eventFrequency: {
        low: 60,      // 1 event per minute
        medium: 30,   // 1 event per 30 seconds
        high: 15      // 1 event per 15 seconds
      }
    },
    performanceTests: {
      targetLatency: 50,    // ms
      targetLoad: 70,       // percentage
      targetPacketLoss: 0.01 // ratio
    }
  },

  // Tests du réseau
  testNetworkConfiguration: async () => {
    const results = {
      connectivity: [],
      latency: [],
      routing: [],
      overall: true
    };

    try {
      // Test de connectivité
      const connectivityResults = await TestUtils.testConnectivity();
      results.connectivity = connectivityResults;
      results.overall = results.overall && connectivityResults.every(r => r.success);

      // Test de latence
      const latencyResults = await TestUtils.testLatency();
      results.latency = latencyResults;
      results.overall = results.overall && latencyResults.every(r => r.success);

      // Test de routage
      const routingResults = await TestUtils.testRouting();
      results.routing = routingResults;
      results.overall = results.overall && routingResults.every(r => r.success);

    } catch (error) {
      results.overall = false;
      results.error = error.message;
    }

    return results;
  },

  testConnectivity: async () => {
    const results = [];
    const cities = CONFIG.NETWORK.CITIES;

    for (const city of cities) {
      for (const connection of city.connections) {
        const testResult = {
          source: city.id,
          target: connection,
          success: false,
          latency: null,
          timestamp: Date.now()
        };

        try {
          const connectionTest = await TestUtils.simulateConnection(city.id, connection);
          testResult.success = connectionTest.success;
          testResult.latency = connectionTest.latency;
        } catch (error) {
          testResult.error = error.message;
        }

        results.push(testResult);
      }
    }

    return results;
  },

  testLatency: async () => {
    const results = [];
    const samples = TestUtils.testConfig.networkTests.minSampleSize;

    for (let i = 0; i < samples; i++) {
      const latencyResult = {
        sampleId: i,
        timestamp: Date.now(),
        values: {}
      };

      CONFIG.NETWORK.CITIES.forEach(city => {
        latencyResult.values[city.id] = TestUtils.generateLatencySample();
      });

      results.push(latencyResult);
      await TestUtils.delay(100); // Wait 100ms between samples
    }

    return results;
  },

  testRouting: async () => {
    const results = [];
    const cities = CONFIG.NETWORK.CITIES;

    for (const source of cities) {
      for (const target of cities) {
        if (source.id !== target.id) {
          const routeTest = {
            source: source.id,
            target: target.id,
            routes: [],
            optimal: null,
            timestamp: Date.now()
          };

          try {
            const routes = TestUtils.findAllRoutes(source.id, target.id);
            routeTest.routes = routes;
            routeTest.optimal = TestUtils.findOptimalRoute(routes);
            routeTest.success = routes.length > 0;
          } catch (error) {
            routeTest.error = error.message;
            routeTest.success = false;
          }

          results.push(routeTest);
        }
      }
    }

    return results;
  },

  // Tests de simulation
  testScenarioGeneration: (difficulty = 'intermediate', duration = 600) => {
    const scenario = SimulationUtils.generateScenario(difficulty);
    const validationResults = {
      eventSpacing: TestUtils.validateEventSpacing(scenario.events),
      eventIntensity: TestUtils.validateEventIntensity(scenario.events, difficulty),
      scenarioDuration: TestUtils.validateScenarioDuration(scenario, duration),
      objectivesBalance: TestUtils.validateObjectives(scenario.objectives)
    };

    return {
      scenario,
      validation: validationResults,
      isValid: Object.values(validationResults).every(v => v.valid)
    };
  },

  validateEventSpacing: (events) => {
    if (events.length < 2) return { valid: true, reason: 'Not enough events to validate spacing' };

    const spacings = [];
    for (let i = 1; i < events.length; i++) {
      spacings.push(events[i].timestamp - events[i-1].timestamp);
    }

    const avgSpacing = spacings.reduce((a, b) => a + b, 0) / spacings.length;
    const minSpacing = Math.min(...spacings);

    return {
      valid: minSpacing >= TestUtils.testConfig.simulationTests.eventFrequency.high * 1000,
      averageSpacing: avgSpacing,
      minSpacing: minSpacing
    };
  },

  // Utilitaires de génération de données de test
  generateTestData: (duration = 300, interval = 1) => {
    const data = [];
    const samples = duration / interval;

    for (let i = 0; i < samples; i++) {
      data.push({
        timestamp: Date.now() + i * interval * 1000,
        metrics: {
          latency: TestUtils.generateLatencySample(),
          load: TestUtils.generateLoadSample(),
          packetLoss: TestUtils.generatePacketLossSample()
        }
      });
    }

    return data;
  },

  generateLatencySample: () => {
    return Math.random() * TestUtils.testConfig.networkTests.maxLatency;
  },

  generateLoadSample: () => {
    return Math.random() * TestUtils.testConfig.networkTests.maxLoad;
  },

  generatePacketLossSample: () => {
    return Math.random() * TestUtils.testConfig.networkTests.maxPacketLoss;
  },

  // Utilitaires de test
  delay: (ms) => new Promise(resolve => setTimeout(resolve, ms)),

  simulateConnection: async (source, target) => {
    const latency = TestUtils.generateLatencySample();
    await TestUtils.delay(latency);
    return {
      success: latency < TestUtils.testConfig.performanceTests.targetLatency,
      latency
    };
  },

  findAllRoutes: (source, target, maxDepth = 5) => {
    // Implementation of route finding algorithm
    const cities = CONFIG.NETWORK.CITIES;
    const routes = [];
    const visited = new Set();

    const findRoutes = (current, path = []) => {
      if (path.length > maxDepth) return;
      if (current === target) {
        routes.push([...path, current]);
        return;
      }

      visited.add(current);
      const currentCity = cities.find(c => c.id === current);
      
      if (currentCity) {
        currentCity.connections.forEach(nextCity => {
          if (!visited.has(nextCity)) {
            findRoutes(nextCity, [...path, current]);
          }
        });
      }
      visited.delete(current);
    };

    findRoutes(source);
    return routes;
  },

  findOptimalRoute: (routes) => {
    if (!routes || routes.length === 0) return null;

    return routes.reduce((best, current) => {
      const currentScore = TestUtils.calculateRouteScore(current);
      const bestScore = TestUtils.calculateRouteScore(best);
      return currentScore > bestScore ? current : best;
    });
  },

  calculateRouteScore: (route) => {
    if (!route) return -1;
    const hops = route.length - 1;
    const estimatedLatency = hops * 20; // 20ms per hop estimation
    return 1000 - (hops * 10 + estimatedLatency);
  }
};

export default TestUtils;
