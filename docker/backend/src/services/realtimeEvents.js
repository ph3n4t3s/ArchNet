const EventEmitter = require('events');
const { cities } = require('../config/networkCities');
const metricsProcessor = require('./metricsProcessor');

class RealtimeEventsManager extends EventEmitter {
  constructor() {
    super();
    this.connections = new Map();
    this.networkState = {
      cities: new Map(),
      activeConnections: new Set(),
      alerts: []
    };
    this.initializeNetworkState();
  }

  initializeNetworkState() {
    cities.forEach(city => {
      this.networkState.cities.set(city.id, {
        id: city.id,
        name: city.name,
        region: city.region,
        status: 'online',
        connections: new Map(),
        metrics: {
          latency: 0,
          load: 0,
          packetLoss: 0,
          throughput: 0
        },
        lastUpdate: Date.now()
      });

      // Initialiser les connexions pour chaque ville
      city.connections.forEach(connectedCityId => {
        const connectionId = this.getConnectionId(city.id, connectedCityId);
        this.networkState.cities.get(city.id).connections.set(connectedCityId, {
          status: 'active',
          metrics: {
            latency: 0,
            bandwidth: 0,
            packetLoss: 0
          }
        });
        this.networkState.activeConnections.add(connectionId);
      });
    });
  }

  getConnectionId(cityId1, cityId2) {
    return [cityId1, cityId2].sort().join('-');
  }

  handleConnection(socket, clientType, clientData) {
    const connectionInfo = {
      socket,
      type: clientType,
      data: clientData,
      connectedAt: Date.now()
    };

    this.connections.set(socket.id, connectionInfo);

    // Envoyer l'état initial au client
    socket.emit('network:state', this.getNetworkState());

    // Si c'est un professeur, envoyer des informations supplémentaires
    if (clientType === 'teacher') {
      socket.emit('teacher:metrics', this.getTeacherMetrics());
    }

    this.emit('client:connected', { socketId: socket.id, clientType, clientData });
  }

  handleDisconnection(socketId) {
    const connection = this.connections.get(socketId);
    if (connection) {
      this.connections.delete(socketId);
      this.emit('client:disconnected', { socketId, clientType: connection.type });
    }
  }

  async updateCityMetrics(cityId, metrics) {
    const city = this.networkState.cities.get(cityId);
    if (!city) return;

    // Traiter les métriques
    const processedMetrics = await metricsProcessor.processMetrics(cityId, metrics);
    
    // Mettre à jour l'état de la ville
    city.metrics = processedMetrics.metrics;
    city.lastUpdate = Date.now();

    // Traiter les anomalies si présentes
    if (processedMetrics.anomalies.length > 0) {
      this.handleAnomalies(cityId, processedMetrics.anomalies);
    }

    // Broadcast des mises à jour
    this.broadcastUpdate('city:metrics', {
      cityId,
      metrics: processedMetrics.metrics,
      timestamp: Date.now()
    });
  }

  async updateConnectionMetrics(cityId1, cityId2, metrics) {
    const connectionId = this.getConnectionId(cityId1, cityId2);
    const city1 = this.networkState.cities.get(cityId1);
    const city2 = this.networkState.cities.get(cityId2);

    if (!city1 || !city2) return;

    // Mettre à jour les métriques de connexion pour les deux villes
    city1.connections.get(cityId2).metrics = metrics;
    city2.connections.get(cityId1).metrics = metrics;

    this.broadcastUpdate('connection:metrics', {
      connectionId,
      metrics,
      timestamp: Date.now()
    });
  }

  handleAnomalies(cityId, anomalies) {
    anomalies.forEach(anomaly => {
      const alert = {
        id: Date.now().toString(),
        cityId,
        type: anomaly.type,
        severity: anomaly.severity,
        message: this.generateAlertMessage(anomaly),
        timestamp: Date.now()
      };

      this.networkState.alerts.push(alert);
      this.broadcastUpdate('alert:new', alert);
    });

    // Limiter le nombre d'alertes stockées
    if (this.networkState.alerts.length > 100) {
      this.networkState.alerts = this.networkState.alerts.slice(-100);
    }
  }

  generateAlertMessage(anomaly) {
    const messages = {
      latency: {
        warning: 'Latence élevée détectée',
        critical: 'Latence critique détectée'
      },
      packetLoss: {
        warning: 'Perte de paquets significative',
        critical: 'Perte de paquets critique'
      },
      load: {
        warning: 'Charge élevée détectée',
        critical: 'Surcharge critique détectée'
      }
    };

    return messages[anomaly.type][anomaly.severity] || 'Anomalie détectée';
  }

  broadcastUpdate(event, data) {
    // Envoyer à tous les clients connectés
    this.connections.forEach((connection, socketId) => {
      connection.socket.emit(event, {
        ...data,
        clientType: connection.type
      });
    });
  }

  broadcastToTeachers(event, data) {
    // Envoyer uniquement aux enseignants
    this.connections.forEach((connection, socketId) => {
      if (connection.type === 'teacher') {
        connection.socket.emit(event, data);
      }
    });
  }

  getNetworkState() {
    return {
      cities: Array.from(this.networkState.cities.entries()).map(([id, city]) => ({
        id,
        name: city.name,
        region: city.region,
        status: city.status,
        metrics: city.metrics,
        connections: Array.from(city.connections.entries())
      })),
      activeConnections: Array.from(this.networkState.activeConnections),
      alerts: this.networkState.alerts.slice(-10) // Dernières 10 alertes
    };
  }

  getTeacherMetrics() {
    return {
      activeStudents: Array.from(this.connections.values())
        .filter(conn => conn.type === 'student').length,
      globalMetrics: {
        averageLatency: this.calculateAverageLatency(),
        totalTraffic: this.calculateTotalTraffic(),
        activeConnections: this.networkState.activeConnections.size
      },
      alerts: this.networkState.alerts
    };
  }

  calculateAverageLatency() {
    let totalLatency = 0;
    let count = 0;

    this.networkState.cities.forEach(city => {
      if (city.metrics.latency > 0) {
        totalLatency += city.metrics.latency;
        count++;
      }
    });

    return count > 0 ? totalLatency / count : 0;
  }

  calculateTotalTraffic() {
    let totalTraffic = 0;

    this.networkState.cities.forEach(city => {
      if (city.metrics.throughput) {
        totalTraffic += city.metrics.throughput;
      }
    });

    return totalTraffic;
  }
}

module.exports = new RealtimeEventsManager();
