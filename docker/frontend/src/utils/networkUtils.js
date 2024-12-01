import { CONFIG } from '../config/config';

export const NetworkUtils = {
  // Calcul de métriques de performance
  calculateNetworkMetrics: (cityData) => {
    const metrics = {
      averageLatency: 0,
      totalLoad: 0,
      packetLoss: 0,
      throughput: 0,
      activeConnections: 0,
      healthScore: 0
    };

    if (!cityData || !Array.isArray(cityData)) return metrics;

    const activeCities = cityData.filter(city => city.status === 'online');
    if (activeCities.length === 0) return metrics;

    // Calcul des moyennes
    const totals = activeCities.reduce((acc, city) => {
      acc.latency += city.metrics.latency || 0;
      acc.load += city.metrics.load || 0;
      acc.packetLoss += city.metrics.packetLoss || 0;
      acc.throughput += city.metrics.throughput || 0;
      acc.connections += city.connections?.filter(conn => conn.status === 'active').length || 0;
      return acc;
    }, { latency: 0, load: 0, packetLoss: 0, throughput: 0, connections: 0 });

    metrics.averageLatency = totals.latency / activeCities.length;
    metrics.totalLoad = totals.load / activeCities.length;
    metrics.packetLoss = totals.packetLoss / activeCities.length;
    metrics.throughput = totals.throughput;
    metrics.activeConnections = totals.connections;
    metrics.healthScore = NetworkUtils.calculateHealthScore(metrics);

    return metrics;
  },

  calculateHealthScore: (metrics) => {
    const scores = {
      latency: NetworkUtils.calculateLatencyScore(metrics.averageLatency),
      load: NetworkUtils.calculateLoadScore(metrics.totalLoad),
      packetLoss: NetworkUtils.calculatePacketLossScore(metrics.packetLoss)
    };

    return (
      (scores.latency * 0.4) +
      (scores.load * 0.3) +
      (scores.packetLoss * 0.3)
    ).toFixed(2);
  },

  calculateLatencyScore: (latency) => {
    const { WARNING, CRITICAL } = CONFIG.METRICS.THRESHOLDS.LATENCY;
    if (latency >= CRITICAL) return 0;
    if (latency <= WARNING) return 100;
    return 100 - ((latency - WARNING) / (CRITICAL - WARNING)) * 100;
  },

  calculateLoadScore: (load) => {
    const { WARNING, CRITICAL } = CONFIG.METRICS.THRESHOLDS.LOAD;
    if (load >= CRITICAL) return 0;
    if (load <= WARNING) return 100;
    return 100 - ((load - WARNING) / (CRITICAL - WARNING)) * 100;
  },

  calculatePacketLossScore: (packetLoss) => {
    const { WARNING, CRITICAL } = CONFIG.METRICS.THRESHOLDS.PACKET_LOSS;
    if (packetLoss >= CRITICAL) return 0;
    if (packetLoss <= WARNING) return 100;
    return 100 - ((packetLoss - WARNING) / (CRITICAL - WARNING)) * 100;
  },

  // Analyse des routes et connexions
  analyzeRoutes: (cities) => {
    const routeAnalysis = {
      optimalPaths: new Map(),
      bottlenecks: [],
      redundancy: new Map()
    };

    cities.forEach(city => {
      const paths = NetworkUtils.findAllPaths(cities, city.id);
      routeAnalysis.optimalPaths.set(city.id, paths);
      
      // Identifier les goulots d'étranglement
      const cityBottlenecks = NetworkUtils.identifyBottlenecks(city, paths);
      if (cityBottlenecks.length > 0) {
        routeAnalysis.bottlenecks.push(...cityBottlenecks);
      }

      // Calculer la redondance des chemins
      routeAnalysis.redundancy.set(city.id, paths.length);
    });

    return routeAnalysis;
  },

  findAllPaths: (cities, startId, endId = null, maxDepth = 5) => {
    const paths = [];
    const visited = new Set();

    const dfs = (currentId, path = [], depth = 0) => {
      if (depth >= maxDepth) return;
      if (endId && currentId === endId) {
        paths.push([...path, currentId]);
        return;
      }

      visited.add(currentId);
      const currentCity = cities.find(c => c.id === currentId);
      
      if (currentCity && currentCity.connections) {
        currentCity.connections.forEach(conn => {
          if (!visited.has(conn.targetId)) {
            dfs(conn.targetId, [...path, currentId], depth + 1);
          }
        });
      }
      visited.delete(currentId);
    };

    dfs(startId);
    return paths;
  },

  identifyBottlenecks: (city, paths) => {
    const bottlenecks = [];
    const connectionUsage = new Map();

    // Compter l'utilisation de chaque connexion
    paths.forEach(path => {
      for (let i = 0; i < path.length - 1; i++) {
        const connectionKey = `${path[i]}-${path[i + 1]}`;
        connectionUsage.set(
          connectionKey,
          (connectionUsage.get(connectionKey) || 0) + 1
        );
      }
    });

    // Identifier les connexions surutilisées
    connectionUsage.forEach((usage, connectionKey) => {
      const [sourceId, targetId] = connectionKey.split('-');
      const connection = city.connections.find(c => 
        c.targetId === targetId || c.targetId === sourceId
      );

      if (connection && (
        connection.load > CONFIG.METRICS.THRESHOLDS.LOAD.WARNING ||
        connection.latency > CONFIG.METRICS.THRESHOLDS.LATENCY.WARNING
      )) {
        bottlenecks.push({
          connectionKey,
          usage,
          metrics: {
            load: connection.load,
            latency: connection.latency
          }
        });
      }
    });

    return bottlenecks;
  },

  // Formatage et validation des données
  formatMetrics: (rawMetrics) => {
    return {
      latency: Number(rawMetrics.latency?.toFixed(2)) || 0,
      load: Number(rawMetrics.load?.toFixed(2)) || 0,
      packetLoss: Number(rawMetrics.packetLoss?.toFixed(4)) || 0,
      throughput: Number(rawMetrics.throughput?.toFixed(2)) || 0
    };
  },

  validateMetrics: (metrics) => {
    const requiredFields = ['latency', 'load', 'packetLoss', 'throughput'];
    return requiredFields.every(field => 
      typeof metrics[field] === 'number' && !isNaN(metrics[field])
    );
  },

  // Génération de données de simulation
  generateSimulatedMetrics: (baseMetrics, variability = 0.1) => {
    return {
      latency: baseMetrics.latency * (1 + (Math.random() - 0.5) * variability),
      load: Math.min(100, Math.max(0, baseMetrics.load * (1 + (Math.random() - 0.5) * variability))),
      packetLoss: Math.max(0, baseMetrics.packetLoss * (1 + (Math.random() - 0.5) * variability)),
      throughput: baseMetrics.throughput * (1 + (Math.random() - 0.5) * variability)
    };
  },

  // Analyse des performances
  analyzePerformanceTrends: (historyData, windowSize = 10) => {
    if (!historyData || historyData.length < windowSize) return null;

    const recentData = historyData.slice(-windowSize);
    const trends = {
      latency: NetworkUtils.calculateTrend(recentData.map(d => d.latency)),
      load: NetworkUtils.calculateTrend(recentData.map(d => d.load)),
      packetLoss: NetworkUtils.calculateTrend(recentData.map(d => d.packetLoss))
    };

    return {
      trends,
      deteriorating: Object.values(trends).some(trend => trend > 0.1),
      improving: Object.values(trends).every(trend => trend < -0.1)
    };
  },

  calculateTrend: (values) => {
    if (values.length < 2) return 0;
    const lastValue = values[values.length - 1];
    const firstValue = values[0];
    return (lastValue - firstValue) / firstValue;
  }
};

export default NetworkUtils;
