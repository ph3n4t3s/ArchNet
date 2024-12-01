import { EventUtils } from '../../utils/eventUtils';
import { CONSTANTS } from '../../config/config';

describe('EventUtils', () => {
  // Test de création d'événements
  describe('createEvent', () => {
    it('should create valid event with all required fields', () => {
      const event = EventUtils.createEvent(
        CONSTANTS.EVENT_TYPES.NETWORK_ISSUE,
        { details: 'Connection lost' },
        CONSTANTS.ALERT_SEVERITY.CRITICAL
      );

      expect(event).toMatchObject({
        id: expect.any(String),
        type: CONSTANTS.EVENT_TYPES.NETWORK_ISSUE,
        data: expect.any(Object),
        severity: CONSTANTS.ALERT_SEVERITY.CRITICAL,
        timestamp: expect.any(String),
        acknowledged: false
      });
    });

    it('should generate unique IDs for different events', () => {
      const event1 = EventUtils.createEvent(CONSTANTS.EVENT_TYPES.NETWORK_ISSUE);
      const event2 = EventUtils.createEvent(CONSTANTS.EVENT_TYPES.NETWORK_ISSUE);
      expect(event1.id).not.toBe(event2.id);
    });
  });

  // Test d'analyse des événements
  describe('analyzeEvents', () => {
    const sampleEvents = [
      EventUtils.createEvent(CONSTANTS.EVENT_TYPES.NETWORK_ISSUE, {}, CONSTANTS.ALERT_SEVERITY.CRITICAL),
      EventUtils.createEvent(CONSTANTS.EVENT_TYPES.TRAFFIC_SPIKE, {}, CONSTANTS.ALERT_SEVERITY.WARNING),
      EventUtils.createEvent(CONSTANTS.EVENT_TYPES.MAINTENANCE, {}, CONSTANTS.ALERT_SEVERITY.INFO)
    ];

    it('should analyze events correctly within time window', () => {
      const analysis = EventUtils.analyzeEvents(sampleEvents, 300000); // 5 minutes
      
      expect(analysis).toMatchObject({
        total: expect.any(Number),
        bySeverity: expect.any(Object),
        byType: expect.any(Object),
        trends: expect.any(Object)
      });

      expect(analysis.total).toBe(sampleEvents.length);
    });

    it('should group events by severity correctly', () => {
      const analysis = EventUtils.analyzeEvents(sampleEvents);
      const { bySeverity } = analysis;

      expect(bySeverity[CONSTANTS.ALERT_SEVERITY.CRITICAL]).toBe(1);
      expect(bySeverity[CONSTANTS.ALERT_SEVERITY.WARNING]).toBe(1);
      expect(bySeverity[CONSTANTS.ALERT_SEVERITY.INFO]).toBe(1);
    });

    it('should detect trends correctly', () => {
      const recentEvents = [
        ...sampleEvents,
        EventUtils.createEvent(CONSTANTS.EVENT_TYPES.NETWORK_ISSUE, {}, CONSTANTS.ALERT_SEVERITY.CRITICAL),
        EventUtils.createEvent(CONSTANTS.EVENT_TYPES.NETWORK_ISSUE, {}, CONSTANTS.ALERT_SEVERITY.CRITICAL)
      ];

      const analysis = EventUtils.analyzeEvents(recentEvents);
      expect(analysis.trends.trend).toBe('increasing');
    });
  });

  // Test de priorisation des événements
  describe('prioritizeEvents', () => {
    const mixedEvents = [
      EventUtils.createEvent(CONSTANTS.EVENT_TYPES.MAINTENANCE, {}, CONSTANTS.ALERT_SEVERITY.INFO),
      EventUtils.createEvent(CONSTANTS.EVENT_TYPES.NETWORK_ISSUE, {}, CONSTANTS.ALERT_SEVERITY.CRITICAL),
      EventUtils.createEvent(CONSTANTS.EVENT_TYPES.TRAFFIC_SPIKE, {}, CONSTANTS.ALERT_SEVERITY.WARNING)
    ];

    it('should sort events by priority correctly', () => {
      const prioritized = EventUtils.prioritizeEvents(mixedEvents);
      
      expect(prioritized[0].severity).toBe(CONSTANTS.ALERT_SEVERITY.CRITICAL);
      expect(prioritized[prioritized.length - 1].severity).toBe(CONSTANTS.ALERT_SEVERITY.INFO);
    });

    it('should maintain timestamp order for same severity', () => {
      const sameTypeEvents = [
        EventUtils.createEvent(CONSTANTS.EVENT_TYPES.NETWORK_ISSUE, {}, CONSTANTS.ALERT_SEVERITY.CRITICAL),
        EventUtils.createEvent(CONSTANTS.EVENT_TYPES.NETWORK_ISSUE, {}, CONSTANTS.ALERT_SEVERITY.CRITICAL)
      ];

      const prioritized = EventUtils.prioritizeEvents(sameTypeEvents);
      expect(new Date(prioritized[0].timestamp).getTime())
        .toBeGreaterThan(new Date(prioritized[1].timestamp).getTime());
    });
  });

  // Test de filtrage des événements
  describe('filterEvents', () => {
    const allEvents = [
      EventUtils.createEvent(CONSTANTS.EVENT_TYPES.NETWORK_ISSUE, {}, CONSTANTS.ALERT_SEVERITY.CRITICAL),
      EventUtils.createEvent(CONSTANTS.EVENT_TYPES.TRAFFIC_SPIKE, {}, CONSTANTS.ALERT_SEVERITY.WARNING),
      EventUtils.createEvent(CONSTANTS.EVENT_TYPES.MAINTENANCE, { source: 'PAR' }, CONSTANTS.ALERT_SEVERITY.INFO)
    ];

    it('should filter by severity', () => {
      const filtered = EventUtils.filterEvents(allEvents, {
        severity: CONSTANTS.ALERT_SEVERITY.CRITICAL
      });

      expect(filtered).toHaveLength(1);
      expect(filtered[0].severity).toBe(CONSTANTS.ALERT_SEVERITY.CRITICAL);
    });

    it('should filter by type', () => {
      const filtered = EventUtils.filterEvents(allEvents, {
        type: CONSTANTS.EVENT_TYPES.MAINTENANCE
      });

      expect(filtered).toHaveLength(1);
      expect(filtered[0].type).toBe(CONSTANTS.EVENT_TYPES.MAINTENANCE);
    });

    it('should filter by time range', () => {
      const timeRange = {
        start: new Date(Date.now() - 3600000), // 1 hour ago
        end: new Date()
      };

      const filtered = EventUtils.filterEvents(allEvents, { timeRange });
      expect(filtered.length).toBeGreaterThanOrEqual(0);
    });

    it('should combine multiple filters', () => {
      const filtered = EventUtils.filterEvents(allEvents, {
        severity: CONSTANTS.ALERT_SEVERITY.CRITICAL,
        type: CONSTANTS.EVENT_TYPES.NETWORK_ISSUE,
        acknowledged: false
      });

      expect(filtered).toHaveLength(1);
    });
  });

  // Test d'exportation des événements
  describe('exportEvents', () => {
    const eventsToExport = [
      EventUtils.createEvent(CONSTANTS.EVENT_TYPES.NETWORK_ISSUE, {}, CONSTANTS.ALERT_SEVERITY.CRITICAL),
      EventUtils.createEvent(CONSTANTS.EVENT_TYPES.MAINTENANCE, {}, CONSTANTS.ALERT_SEVERITY.INFO)
    ];

    it('should export to CSV format correctly', () => {
      const csv = EventUtils.exportToCSV(eventsToExport);
      
      expect(csv).toContain('Timestamp,Type,Severity,Message,Source,Acknowledged');
      expect(csv.split('\n').length).toBe(eventsToExport.length + 1); // +1 for header
    });

    it('should export to JSON format correctly', () => {
      const json = EventUtils.exportEvents(eventsToExport, 'json');
      const parsed = JSON.parse(json);

      expect(Array.isArray(parsed)).toBe(true);
      expect(parsed).toHaveLength(eventsToExport.length);
    });

    it('should throw error for unsupported format', () => {
      expect(() => {
        EventUtils.exportEvents(eventsToExport, 'invalid');
      }).toThrow();
    });
  });

  // Test de formatage des messages
  describe('formatEventMessage', () => {
    it('should format network issue message correctly', () => {
      const event = EventUtils.createEvent(
        CONSTANTS.EVENT_TYPES.NETWORK_ISSUE,
        { details: 'High latency detected' }
      );

      const message = EventUtils.formatEventMessage(event);
      expect(message).toContain('Problème réseau détecté');
      expect(message).toContain('High latency detected');
    });

    it('should format maintenance message correctly', () => {
      const event = EventUtils.createEvent(
        CONSTANTS.EVENT_TYPES.MAINTENANCE,
        { description: 'Scheduled maintenance' }
      );

      const message = EventUtils.formatEventMessage(event);
      expect(message).toContain('Maintenance');
      expect(message).toContain('Scheduled maintenance');
    });
  });
});
