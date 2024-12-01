const { InfluxDB, Point } = require('@influxdata/influxdb-client');
const { cities } = require('../config/networkCities');

class MetricsProcessor {
  constructor() {
    this.influxDB = new InfluxDB({
      url: process.env.INFLUXDB_URL || 'http://influxdb:8086',
      token: process.env.INFLUXDB_TOKEN || 'simuroute2024'
    });
    
    this.writeApi = this.influxDB.getWriteApi('simuroute', 'network_metrics');
    this.queryApi = this.influxDB.getQueryApi('simuroute');
    this.metricsCache = new Map();
    this.lastUpdate = Date.now();
  }

  async processMetrics(cityId, metrics) {
    const timestamp = Date.now();
    
    // Traitement des métriques brutes
    const processedMetrics = this.calculateDerivedMetrics(metrics);
    
    // Stockage dans le cache
    this.metricsCache.set(cityId, {
      timestamp,
      raw: metrics,
      processed: processedMetrics
    });

    // Écriture dans InfluxDB
    const point = new Point('city_metrics')
      .tag('city_id', cityId)
      .tag('region', cities.find(c => c.id === cityId).region)
      .floatField('latency', processedMetrics.latency)
      .floatField('load', processedMetrics.load)
      .floatField('packet_loss', processedMetrics.packetLoss)
      .intField('packets_processed', processedMetrics.packetsProcessed)
      .floatField('bandwidth_usage', processedMetrics.bandwidthUsage)
      .timestamp(timestamp);

    await this.writeApi.writePoint(point);

    // Détecter les anomalies
    const anomalies = await this.detectAnomalies(cityId, processedMetrics);
    if (anomalies.length > 0) {
      await this.processAnomalies(cityId, anomalies);
    }

    return {
      metrics: processedMetrics,
      anomalies
    };
  }

  calculateDerivedMetrics(rawMetrics) {
    return {
      latency: this.calculateAverageLatency(rawMetrics.latencies),
      load: rawMetrics.load,
      packetLoss: this.calculatePacketLoss(rawMetrics.sent, rawMetrics.received),
      packetsProcessed: rawMetrics.processed,
      bandwidthUsage: rawMetrics.bandwidthUsage,
      performanceScore: this.calculatePerformanceScore(rawMetrics)
    };
  }

  calculateAverageLatency(latencies) {
    if (!Array.isArray(latencies) || latencies.length === 0) return 0;
    return latencies.reduce((sum, val) => sum + val, 0) / latencies.length;
  }

  calculatePacketLoss(sent, received) {
    if (sent === 0) return 0;
    return (sent - received) / sent;
  }

  calculatePerformanceScore(metrics) {
    const latencyScore = Math.max(0, 100 - (metrics.averageLatency / 2));
    const reliabilityScore = (1 - this.calculatePacketLoss(metrics.sent, metrics.received)) * 100;
    const loadScore = Math.max(0, 100 - metrics.load);

    return (latencyScore * 0.4 + reliabilityScore * 0.4 + loadScore * 0.2);
  }

  async detectAnomalies(cityId, metrics) {
    const anomalies = [];
    const thresholds = {
      latency: { warning: 100, critical: 200 },
      packetLoss: { warning: 0.05, critical: 0.10 },
      load: { warning: 80, critical: 90 }
    };

    // Vérification de la latence
    if (metrics.latency > thresholds.latency.critical) {
      anomalies.push({
        type: 'latency',
        severity: 'critical',
        value: metrics.latency,
        threshold: thresholds.latency.critical
      });
    } else if (metrics.latency > thresholds.latency.warning) {
      anomalies.push({
        type: 'latency',
        severity: 'warning',
        value: metrics.latency,
        threshold: thresholds.latency.warning
      });
    }

    // Vérification de la perte de paquets
    if (metrics.packetLoss > thresholds.packetLoss.critical) {
      anomalies.push({
        type: 'packet_loss',
        severity: 'critical',
        value: metrics.packetLoss,
        threshold: thresholds.packetLoss.critical
      });
    } else if (metrics.packetLoss > thresholds.packetLoss.warning) {
      anomalies.push({
        type: 'packet_loss',
        severity: 'warning',
        value: metrics.packetLoss,
        threshold: thresholds.packetLoss.warning
      });
    }

    // Vérification de la charge
    if (metrics.load > thresholds.load.critical) {
      anomalies.push({
        type: 'load',
        severity: 'critical',
        value: metrics.load,
        threshold: thresholds.load.critical
      });
    } else if (metrics.load > thresholds.load.warning) {
      anomalies.push({
        type: 'load',
        severity: 'warning',
        value: metrics.load,
        threshold: thresholds.load.warning
      });
    }

    return anomalies;
  }

  async processAnomalies(cityId, anomalies) {
    anomalies.forEach(async (anomaly) => {
      const point = new Point('anomalies')
        .tag('city_id', cityId)
        .tag('type', anomaly.type)
        .tag('severity', anomaly.severity)
        .floatField('value', anomaly.value)
        .floatField('threshold', anomaly.threshold)
        .timestamp(Date.now());

      await this.writeApi.writePoint(point);
    });
  }

  async getHistoricalMetrics(cityId, timeRange = '1h') {
    const query = `
      from(bucket: "network_metrics")
        |> range(start: -${timeRange})
        |> filter(fn: (r) => r["city_id"] == "${cityId}")
        |> aggregateWindow(every: 1m, fn: mean)
    `;

    return await this.queryApi.collectRows(query);
  }

  async getNetworkSummary() {
    const summary = {
      totalPacketsProcessed: 0,
      averageLatency: 0,
      averageLoad: 0,
      activeNodes: 0,
      anomalies: {
        critical: 0,
        warning: 0
      }
    };

    for (const [cityId, data] of this.metricsCache) {
      if (Date.now() - data.timestamp < 60000) { // Données de moins d'une minute
        summary.totalPacketsProcessed += data.processed.packetsProcessed;
        summary.averageLatency += data.processed.latency;
        summary.averageLoad += data.processed.load;
        summary.activeNodes++;
      }
    }

    if (summary.activeNodes > 0) {
      summary.averageLatency /= summary.activeNodes;
      summary.averageLoad /= summary.activeNodes;
    }

    return summary;
  }

  async generateReport(timeRange = '1h') {
    const networkSummary = await this.getNetworkSummary();
    const citiesMetrics = await Promise.all(
      cities.map(async city => ({
        cityId: city.id,
        region: city.region,
        metrics: await this.getHistoricalMetrics(city.id, timeRange)
      }))
    );

    return {
      timestamp: Date.now(),
      summary: networkSummary,
      citiesMetrics,
      recommendations: this.generateRecommendations(networkSummary, citiesMetrics)
    };
  }

  generateRecommendations(summary, citiesMetrics) {
    const recommendations = [];

    // Recommandations basées sur la charge globale
    if (summary.averageLoad > 70) {
      recommendations.push({
        type: 'load_balancing',
        priority: 'high',
        message: 'Consider implementing load balancing across regions'
      });
    }

    // Recommandations basées sur la latence
    if (summary.averageLatency > 100) {
      recommendations.push({
        type: 'latency_optimization',
        priority: 'medium',
        message: 'Review and optimize routing paths for high-latency connections'
      });
    }

    return recommendations;
  }
}

module.exports = new MetricsProcessor();
