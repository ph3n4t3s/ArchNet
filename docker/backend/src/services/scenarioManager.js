const EventEmitter = require('events');
const { cities, calculateDistance } = require('../config/networkCities');
const metricsProcessor = require('./metricsProcessor');
const realtimeEvents = require('./realtimeEvents');

class ScenarioManager extends EventEmitter {
  constructor() {
    super();
    this.activeScenario = null;
    this.scenarios = new Map();
    this.cityStatus = new Map();
    this.initializeCityStatus();
    this.initializeScenarios();
    this.lastUpdate = Date.now();
  }

  initializeCityStatus() {
    cities.forEach(city => {
      this.cityStatus.set(city.id, {
        status: 'online',
        latency: this.calculateBaseLatency(city),
        load: this.calculateBaseLoad(),
        connections: new Map(
          city.connections.map(connId => [
            connId,
            {
              status: 'active',
              latency: this.calculateLinkLatency(city.id, connId),
              bandwidth: this.calculateLinkBandwidth(city.id, connId),
              packetLoss: 0.01
            }
          ])
        ),
        metrics: {
          packetsProcessed: 0,
          packetsDropped: 0,
          totalLatency: 0
        }
      });
    });
  }

  calculateBaseLatency(city) {
    // Base latency depends on city's region and infrastructure
    const regionFactors = {
      'Europe': 10,
      'North America': 12,
      'Asia': 15,
      'South America': 18,
      'Africa': 20,
      'Oceania': 22
    };
    return regionFactors[city.region] + Math.random() * 5;
  }

  calculateBaseLoad() {
    // Initial random load between 20% and 40%
    return 20 + Math.random() * 20;
  }

  calculateLinkLatency(cityId1, cityId2) {
    const distance = calculateDistance(cityId1, cityId2);
    // Approximation: 0.5ms per 100km + base latency
    return Math.round((distance / 100) * 0.5 + 5);
  }

  calculateLinkBandwidth(cityId1, cityId2) {
    const city1 = cities.find(c => c.id === cityId1);
    const city2 = cities.find(c => c.id === cityId2);
    // Bandwidth based on regions and connection type
    return city1.region === city2.region ? 10000 : 5000; // En Gbps
  }

  // Initialisation des scénarios pédagogiques
  initializeScenarios() {
    this.scenarios.set('normal', {
      name: 'Opération Normale',
      description: 'Simulation d\'un réseau en fonctionnement normal',
      duration: 300,
      difficulty: 'beginner',
      events: []
    });

    this.scenarios.set('regional_failure', {
      name: 'Panne Régionale',
      description: 'Gestion d\'une panne majeure dans une région',
      duration: 600,
      difficulty: 'intermediate',
      events: this.generateRegionalFailureEvents()
    });

    this.scenarios.set('ddos_attack', {
      name: 'Attaque DDoS',
      description: 'Simulation d\'une attaque DDoS distribuée',
      duration: 900,
      difficulty: 'advanced',
      events: this.generateDDoSEvents()
    });

    // Plus de scénarios...
  }

  generateRegionalFailureEvents() {
    const events = [];
    const region = cities[Math.floor(Math.random() * cities.length)].region;
    const regionalCities = cities.filter(city => city.region === region);
    
    regionalCities.forEach(city => {
      events.push({
        time: 120 + Math.random() * 60,
        type: 'city_failure',
        data: {
          cityId: city.id,
          reason: 'power_outage'
        }
      });

      events.push({
        time: 480 + Math.random() * 120,
        type: 'city_recovery',
        data: {
          cityId: city.id
        }
      });
    });

    return events;
  }

  generateDDoSEvents() {
    const events = [];
    const targetCities = cities
      .sort(() => 0.5 - Math.random())
      .slice(0, 3);

    targetCities.forEach((city, index) => {
      events.push({
        time: 120 + index * 180,
        type: 'ddos_start',
        data: {
          cityId: city.id,
          intensity: 0.7 + Math.random() * 0.3
        }
      });

      events.push({
        time: 420 + index * 180,
        type: 'ddos_mitigation',
        data: {
          cityId: city.id
        }
      });
    });

    return events;
  }

  // Méthodes de gestion des scénarios
  async startScenario(scenarioId) {
    const scenario = this.scenarios.get(scenarioId);
    if (!scenario) {
      throw new Error(`Scénario inconnu: ${scenarioId}`);
    }

    this.activeScenario = {
      ...scenario,
      startTime: Date.now(),
      eventQueue: [...scenario.events],
      status: 'running'
    };

    await realtimeEvents.broadcastMessage({
      type: 'scenario_started',
      data: {
        scenarioId,
        name: scenario.name,
        description: scenario.description,
        duration: scenario.duration
      }
    });

    this.processEvents();
  }

  async processEvents() {
    if (!this.activeScenario || this.activeScenario.status !== 'running') {
      return;
    }

    const currentTime = (Date.now() - this.activeScenario.startTime) / 1000;
    
    // Traiter les événements en attente
    while (
      this.activeScenario.eventQueue.length > 0 && 
      this.activeScenario.eventQueue[0].time <= currentTime
    ) {
      const event = this.activeScenario.eventQueue.shift();
      await this.handleEvent(event);
    }

    // Mettre à jour les métriques
    if (Date.now() - this.lastUpdate >= 1000) {
      this.updateNetworkState();
      this.lastUpdate = Date.now();
    }

    // Vérifier la fin du scénario
    if (currentTime >= this.activeScenario.duration) {
      await this.endScenario();
    } else {
      setTimeout(() => this.processEvents(), 100);
    }
  }

  async handleEvent(event) {
    switch (event.type) {
      case 'city_failure':
        await this.handleCityFailure(event.data);
        break;
      case 'ddos_start':
        await this.handleDDoSAttack(event.data);
        break;
      case 'link_congestion':
        await this.handleLinkCongestion(event.data);
        break;
      // Plus de types d'événements...
    }

    await realtimeEvents.broadcastMessage({
      type: 'event_occurred',
      data: event
    });
  }

  updateNetworkState() {
    // Mise à jour des métriques pour chaque ville
    for (const [cityId, status] of this.cityStatus) {
      if (status.status === 'online') {
        // Mettre à jour la charge
        status.load = this.calculateNewLoad(status.load);
        
        // Mettre à jour les latences des connexions
        for (const [connId, connStatus] of status.connections) {
          if (connStatus.status === 'active') {
            connStatus.latency = this.calculateNewLatency(connStatus.latency);
          }
        }
      }
    }

    // Broadcast des mises à jour
    realtimeEvents.broadcastMessage({
      type: 'network_state_update',
      data: {
        timestamp: Date.now(),
        cities: Array.from(this.cityStatus.entries())
      }
    });
  }

  calculateNewLoad(currentLoad) {
    // Variation aléatoire de ±5%
    return Math.max(0, Math.min(100, currentLoad + (Math.random() - 0.5) * 10));
  }

  calculateNewLatency(currentLatency) {
    // Variation aléatoire de ±10%
    return Math.max(1, currentLatency + (Math.random() - 0.5) * 2);
  }

  async endScenario() {
    if (!this.activeScenario) return;

    const report = await this.generateScenarioReport();
    
    await realtimeEvents.broadcastMessage({
      type: 'scenario_ended',
      data: {
        scenarioId: this.activeScenario.name,
        report,
        timestamp: Date.now()
      }
    });

    this.activeScenario = null;
    this.initializeCityStatus();
  }

  async generateScenarioReport() {
    return {
      name: this.activeScenario.name,
      duration: (Date.now() - this.activeScenario.startTime) / 1000,
      metrics: await metricsProcessor.getScenarioMetrics(this.activeScenario.startTime),
      cityPerformance: Array.from(this.cityStatus.entries()).map(([cityId, status]) => ({
        cityId,
        metrics: status.metrics,
        finalState: {
          status: status.status,
          load: status.load,
          connections: Array.from(status.connections.entries())
        }
      }))
    };
  }
}

module.exports = new ScenarioManager();
