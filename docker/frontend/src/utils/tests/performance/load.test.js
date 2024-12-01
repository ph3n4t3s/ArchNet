import { performance } from 'perf_hooks';
import WebSocket from 'ws';
import axios from 'axios';
import { CONFIG } from '../../config/config';

describe('Performance Tests', () => {
  const BASE_URL = 'http://localhost:3000';
  const WS_URL = 'ws://localhost:3001';
  const SIMULATION_DURATION = 300000; // 5 minutes
  
  // Test de charge des connexions WebSocket
  describe('WebSocket Connections Load Test', () => {
    const connections = [];
    const metrics = {
      connectionTimes: [],
      messageTimes: [],
      errors: 0
    };

    beforeAll(() => {
      jest.setTimeout(600000); // 10 minutes timeout
    });

    afterAll(async () => {
      // Fermer toutes les connexions
      connections.forEach(ws => ws.close());
    });

    it('should handle multiple concurrent WebSocket connections', async () => {
      const numberOfClients = 30; // Nombre maximum d'étudiants
      
      for (let i = 0; i < numberOfClients; i++) {
        const startTime = performance.now();
        
        try {
          const ws = new WebSocket(WS_URL);
          
          ws.on('open', () => {
            const connectionTime = performance.now() - startTime;
            metrics.connectionTimes.push(connectionTime);
            connections.push(ws);
          });

          ws.on('error', (error) => {
            metrics.errors++;
            console.error(`WebSocket error for client ${i}:`, error);
          });

          // Attendre que la connexion soit établie
          await new Promise((resolve) => {
            ws.on('open', resolve);
          });

          // Simuler l'activité du client
          setInterval(() => {
            const messageStartTime = performance.now();
            ws.send(JSON.stringify({
              type: 'metrics_update',
              data: {
                latency: Math.random() * 100,
                load: Math.random() * 100,
                packetLoss: Math.random() * 0.1
              }
            }));
            metrics.messageTimes.push(performance.now() - messageStartTime);
          }, 1000);

        } catch (error) {
          metrics.errors++;
          console.error(`Failed to create connection ${i}:`, error);
        }

        // Attendre un peu entre chaque connexion pour éviter la surcharge
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      // Vérifier les métriques
      expect(connections.length).toBe(numberOfClients);
      expect(metrics.errors).toBe(0);
      
      // Analyser les temps de connexion
      const avgConnectionTime = metrics.connectionTimes.reduce((a, b) => a + b, 0) / metrics.connectionTimes.length;
      expect(avgConnectionTime).toBeLessThan(1000); // Moins d'une seconde en moyenne
    });
  });

  // Test de charge des requêtes API
  describe('API Endpoint Load Test', () => {
    const metrics = {
      responseTimes: [],
      errors: 0,
      throughput: 0
    };

    it('should handle multiple concurrent API requests', async () => {
      const numberOfRequests = 1000;
      const concurrentBatches = 10;
      const requestsPerBatch = numberOfRequests / concurrentBatches;
      
      const startTime = performance.now();

      for (let batch = 0; batch < concurrentBatches; batch++) {
        const requests = Array(requestsPerBatch).fill().map(() => {
          const requestStartTime = performance.now();
          
          return axios.get(`${BASE_URL}/api/network/status`)
            .then(response => {
              metrics.responseTimes.push(performance.now() - requestStartTime);
              return response;
            })
            .catch(error => {
              metrics.errors++;
              console.error('API request failed:', error);
            });
        });

        await Promise.all(requests);
      }

      const totalTime = (performance.now() - startTime) / 1000; // en secondes
      metrics.throughput = numberOfRequests / totalTime;

      // Analyse des résultats
      const avgResponseTime = metrics.responseTimes.reduce((a, b) => a + b, 0) / metrics.responseTimes.length;
      const maxResponseTime = Math.max(...metrics.responseTimes);
      
      console.log(`
        Performance Test Results:
        - Total Requests: ${numberOfRequests}
        - Average Response Time: ${avgResponseTime.toFixed(2)}ms
        - Max Response Time: ${maxResponseTime.toFixed(2)}ms
        - Throughput: ${metrics.throughput.toFixed(2)} requests/second
        - Error Rate: ${(metrics.errors / numberOfRequests * 100).toFixed(2)}%
      `);

      // Assertions
      expect(metrics.errors).toBeLessThan(numberOfRequests * 0.01); // Moins de 1% d'erreurs
      expect(avgResponseTime).toBeLessThan(200); // Moins de 200ms en moyenne
      expect(metrics.throughput).toBeGreaterThan(50); // Au moins 50 requêtes par seconde
    });
  });

  // Test de performance de la simulation
  describe('Simulation Performance Test', () => {
    it('should maintain performance during long simulation', async () => {
      const metrics = {
        frameRates: [],
        memoryUsage: [],
        eventProcessingTimes: []
      };

      const startTime = performance.now();
      let lastFrame = startTime;

      while (performance.now() - startTime < SIMULATION_DURATION) {
        const frameTime = performance.now();
        metrics.frameRates.push(1000 / (frameTime - lastFrame));
        lastFrame = frameTime;

        // Mesurer l'utilisation mémoire
        const memUsage = process.memoryUsage();
        metrics.memoryUsage.push(memUsage.heapUsed / 1024 / 1024); // En MB

        // Simuler le traitement d'événements
        const eventStart = performance.now();
        // Traitement simulé...
        metrics.eventProcessingTimes.push(performance.now() - eventStart);

        await new Promise(resolve => setTimeout(resolve, 16)); // ~60 FPS
      }

      // Analyser les résultats
      const avgFrameRate = metrics.frameRates.reduce((a, b) => a + b, 0) / metrics.frameRates.length;
      const avgMemoryUsage = metrics.memoryUsage.reduce((a, b) => a + b, 0) / metrics.memoryUsage.length;
      const avgEventTime = metrics.eventProcessingTimes.reduce((a, b) => a + b, 0) / metrics.eventProcessingTimes.length;

      console.log(`
        Simulation Performance Results:
        - Average Frame Rate: ${avgFrameRate.toFixed(2)} FPS
        - Average Memory Usage: ${avgMemoryUsage.toFixed(2)} MB
        - Average Event Processing Time: ${avgEventTime.toFixed(2)}ms
      `);

      // Assertions
      expect(avgFrameRate).toBeGreaterThan(30); // Au moins 30 FPS
      expect(avgMemoryUsage).toBeLessThan(1024); // Moins de 1GB de mémoire
      expect(avgEventTime).toBeLessThan(16); // Moins de 16ms par événement
    });
  });
});
