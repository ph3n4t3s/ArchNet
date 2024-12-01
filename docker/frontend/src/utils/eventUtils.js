import { CONFIG, CONSTANTS } from '../config/config';

export const EventUtils = {
  // Gestion des événements
  createEvent: (type, data, severity = CONSTANTS.ALERT_SEVERITY.INFO) => {
    return {
      id: `evt-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type,
      data,
      severity,
      timestamp: new Date().toISOString(),
      acknowledged: false
    };
  },

  // Gestion des alertes
  createAlert: (message, severity, source = null) => {
    return {
      id: `alt-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      message,
      severity,
      source,
      timestamp: new Date().toISOString(),
      acknowledged: false,
      metadata: {}
    };
  },

  // Analyse des événements
  analyzeEvents: (events, timeWindow = 300000) => { // 5 minutes par défaut
    const now = Date.now();
    const recentEvents = events.filter(event => 
      now - new Date(event.timestamp).getTime() < timeWindow
    );

    return {
      total: recentEvents.length,
      bySeverity: EventUtils.groupEventsBySeverity(recentEvents),
      byType: EventUtils.groupEventsByType(recentEvents),
      trends: EventUtils.analyzeTrends(recentEvents),
      critical: recentEvents.filter(e => e.severity === CONSTANTS.ALERT_SEVERITY.CRITICAL)
    };
  },

  groupEventsBySeverity: (events) => {
    return events.reduce((acc, event) => {
      acc[event.severity] = (acc[event.severity] || 0) + 1;
      return acc;
    }, {});
  },

  groupEventsByType: (events) => {
    return events.reduce((acc, event) => {
      acc[event.type] = (acc[event.type] || 0) + 1;
      return acc;
    }, {});
  },

  analyzeTrends: (events) => {
    const timeWindows = [];
    const windowSize = 60000; // 1 minute
    const now = Date.now();
    
    // Créer des fenêtres de temps
    for (let i = 0; i < 5; i++) {
      const windowStart = now - (i + 1) * windowSize;
      const windowEnd = now - i * windowSize;
      
      const windowEvents = events.filter(event => {
        const eventTime = new Date(event.timestamp).getTime();
        return eventTime >= windowStart && eventTime < windowEnd;
      });

      timeWindows.push({
        start: windowStart,
        end: windowEnd,
        count: windowEvents.length,
        severity: EventUtils.calculateWindowSeverity(windowEvents)
      });
    }

    return {
      windows: timeWindows,
      trend: EventUtils.calculateTrendDirection(timeWindows)
    };
  },

  calculateWindowSeverity: (events) => {
    const severityScores = {
      [CONSTANTS.ALERT_SEVERITY.CRITICAL]: 4,
      [CONSTANTS.ALERT_SEVERITY.ERROR]: 3,
      [CONSTANTS.ALERT_SEVERITY.WARNING]: 2,
      [CONSTANTS.ALERT_SEVERITY.INFO]: 1
    };

    if (events.length === 0) return 0;

    const totalScore = events.reduce((acc, event) => 
      acc + (severityScores[event.severity] || 0), 0
    );

    return totalScore / events.length;
  },

  calculateTrendDirection: (windows) => {
    if (windows.length < 2) return 'stable';
    
    const recent = windows[0].count;
    const old = windows[windows.length - 1].count;
    const change = recent - old;

    if (change > windows.length) return 'increasing';
    if (change < -windows.length) return 'decreasing';
    return 'stable';
  },

  // Gestion des notifications
  shouldNotify: (event) => {
    // Vérifier si l'événement nécessite une notification
    const criticalTypes = [
      CONSTANTS.EVENT_TYPES.NETWORK_ISSUE,
      CONSTANTS.EVENT_TYPES.HARDWARE_FAILURE,
      CONSTANTS.EVENT_TYPES.ATTACK
    ];

    return (
      event.severity === CONSTANTS.ALERT_SEVERITY.CRITICAL ||
      (event.severity === CONSTANTS.ALERT_SEVERITY.ERROR && criticalTypes.includes(event.type))
    );
  },

  // Formatage des messages
  formatEventMessage: (event) => {
    const timestamp = new Date(event.timestamp).toLocaleTimeString();
    const severity = event.severity.toUpperCase();
    let message = '';

    switch (event.type) {
      case CONSTANTS.EVENT_TYPES.NETWORK_ISSUE:
        message = `Problème réseau détecté - ${event.data.details}`;
        break;
      case CONSTANTS.EVENT_TYPES.HARDWARE_FAILURE:
        message = `Défaillance matérielle - ${event.data.component}`;
        break;
      case CONSTANTS.EVENT_TYPES.TRAFFIC_SPIKE:
        message = `Pic de trafic - ${event.data.increase}% d'augmentation`;
        break;
      case CONSTANTS.EVENT_TYPES.MAINTENANCE:
        message = `Maintenance - ${event.data.description}`;
        break;
      case CONSTANTS.EVENT_TYPES.ATTACK:
        message = `Attaque détectée - Type: ${event.data.attackType}`;
        break;
      default:
        message = event.data.message || 'Événement système';
    }

    return `[${timestamp}] [${severity}] ${message}`;
  },

  // Priorisation des événements
  prioritizeEvents: (events) => {
    const priorityScores = {
      [CONSTANTS.ALERT_SEVERITY.CRITICAL]: 4,
      [CONSTANTS.ALERT_SEVERITY.ERROR]: 3,
      [CONSTANTS.ALERT_SEVERITY.WARNING]: 2,
      [CONSTANTS.ALERT_SEVERITY.INFO]: 1
    };

    return [...events].sort((a, b) => {
      // Trier d'abord par sévérité
      const severityDiff = (priorityScores[b.severity] || 0) - (priorityScores[a.severity] || 0);
      if (severityDiff !== 0) return severityDiff;

      // Puis par timestamp (plus récent en premier)
      return new Date(b.timestamp) - new Date(a.timestamp);
    });
  },

  // Filtrage des événements
  filterEvents: (events, filters) => {
    return events.filter(event => {
      if (filters.severity && event.severity !== filters.severity) return false;
      if (filters.type && event.type !== filters.type) return false;
      if (filters.source && event.source !== filters.source) return false;
      if (filters.acknowledged !== undefined && event.acknowledged !== filters.acknowledged) return false;
      
      if (filters.timeRange) {
        const eventTime = new Date(event.timestamp).getTime();
        if (eventTime < filters.timeRange.start || eventTime > filters.timeRange.end) return false;
      }

      return true;
    });
  },

  // Exportation des événements
  exportEvents: (events, format = 'csv') => {
    switch (format) {
      case 'csv':
        return EventUtils.exportToCSV(events);
      case 'json':
        return JSON.stringify(events, null, 2);
      default:
        throw new Error(`Format d'export non supporté: ${format}`);
    }
  },

  exportToCSV: (events) => {
    const headers = ['Timestamp', 'Type', 'Severity', 'Message', 'Source', 'Acknowledged'];
    const rows = events.map(event => [
      event.timestamp,
      event.type,
      event.severity,
      event.message || '',
      event.source || '',
      event.acknowledged
    ]);

    return [headers, ...rows]
      .map(row => row.join(','))
      .join('\n');
  }
};

export default EventUtils;
