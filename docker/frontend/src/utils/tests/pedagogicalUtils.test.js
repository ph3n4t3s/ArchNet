import { PedagogicalUtils } from '../../utils/pedagogicalUtils';
import { CONFIG } from '../../config/config';

describe('PedagogicalUtils', () => {
  // Test de l'évaluation des performances
  describe('evaluateStudentPerformance', () => {
    const mockStudentData = {
      networkMetrics: {
        averageLatency: 50,
        load: 60,
        packetLoss: 0.02,
        throughput: 1000
      },
      events: [
        {
          type: 'network_failure',
          timestamp: Date.now() - 5000,
          severity: 'critical'
        }
      ],
      actions: [
        {
          type: 'route_update',
          timestamp: Date.now() - 4000,
          success: true
        }
      ],
      problemSolving: {
        timeSpent: 300,
        expectedTime: 400
      }
    };

    it('should evaluate student performance correctly', () => {
      const evaluation = PedagogicalUtils.evaluateStudentPerformance(mockStudentData);

      expect(evaluation).toMatchObject({
        scores: expect.any(Object),
        totalScore: expect.any(Number),
        feedback: expect.any(Array),
        recommendations: expect.any(Array)
      });

      expect(evaluation.totalScore).toBeGreaterThanOrEqual(0);
      expect(evaluation.totalScore).toBeLessThanOrEqual(100);
    });

    it('should provide appropriate feedback for good performance', () => {
      const goodPerformanceData = {
        ...mockStudentData,
        networkMetrics: {
          averageLatency: 20,
          load: 40,
          packetLoss: 0.01
        }
      };

      const evaluation = PedagogicalUtils.evaluateStudentPerformance(goodPerformanceData);
      expect(evaluation.scores.networkManagement).toBeGreaterThanOrEqual(80);
      expect(evaluation.feedback.length).toBeLessThan(2);
    });

    it('should provide critical feedback for poor performance', () => {
      const poorPerformanceData = {
        ...mockStudentData,
        networkMetrics: {
          averageLatency: 200,
          load: 90,
          packetLoss: 0.1
        }
      };

      const evaluation = PedagogicalUtils.evaluateStudentPerformance(poorPerformanceData);
      expect(evaluation.scores.networkManagement).toBeLessThanOrEqual(50);
      expect(evaluation.feedback.length).toBeGreaterThan(0);
      expect(evaluation.recommendations.length).toBeGreaterThan(0);
    });
  });

  // Test de l'évaluation du réseau
  describe('evaluateNetworkManagement', () => {
    it('should score perfect network management correctly', () => {
      const perfectMetrics = {
        averageLatency: 10,
        packetLoss: 0,
        averageLoad: 30
      };

      const score = PedagogicalUtils.evaluateNetworkManagement(perfectMetrics);
      expect(score).toBeGreaterThanOrEqual(90);
    });

    it('should score poor network management appropriately', () => {
      const poorMetrics = {
        averageLatency: 300,
        packetLoss: 0.15,
        averageLoad: 95
      };

      const score = PedagogicalUtils.evaluateNetworkManagement(poorMetrics);
      expect(score).toBeLessThanOrEqual(40);
    });
  });

  // Test de l'évaluation de la résolution de problèmes
  describe('evaluateProblemResolution', () => {
    const mockEvents = [
      {
        type: 'network_failure',
        severity: 'critical',
        timestamp: Date.now() - 10000
      }
    ];

    const mockActions = [
      {
        type: 'diagnostic',
        timestamp: Date.now() - 9000
      },
      {
        type: 'fix',
        timestamp: Date.now() - 8000,
        success: true
      }
    ];

    it('should evaluate quick problem resolution positively', () => {
      const score = PedagogicalUtils.evaluateProblemResolution(mockEvents, mockActions);
      expect(score).toBeGreaterThanOrEqual(70);
    });

    it('should penalize slow response times', () => {
      const slowActions = mockActions.map(action => ({
        ...action,
        timestamp: action.timestamp + 30000
      }));

      const score = PedagogicalUtils.evaluateProblemResolution(mockEvents, slowActions);
      expect(score).toBeLessThan(70);
    });

    it('should handle multiple problems correctly', () => {
      const multipleEvents = [
        ...mockEvents,
        {
          type: 'traffic_spike',
          severity: 'critical',
          timestamp: Date.now() - 5000
        }
      ];

      const multipleActions = [
        ...mockActions,
        {
          type: 'load_balance',
          timestamp: Date.now() - 4000,
          success: true
        }
      ];

      const score = PedagogicalUtils.evaluateProblemResolution(multipleEvents, multipleActions);
      expect(score).toBeGreaterThan(0);
    });
  });

  // Test de l'analyse de résolution
  describe('analyzeResolution', () => {
    const mockProblem = {
      type: 'network_failure',
      timestamp: Date.now() - 10000,
      severity: 'critical'
    };

    it('should analyze successful resolution correctly', () => {
      const goodActions = [
        {
          type: 'diagnostic',
          timestamp: Date.now() - 9500
        },
        {
          type: 'fix',
          timestamp: Date.now() - 9000,
          success: true
        }
      ];

      const analysis = PedagogicalUtils.analyzeResolution(mockProblem, goodActions);
      expect(analysis.efficiency).toBeGreaterThanOrEqual(0.8);
      expect(analysis.reactionTime).toBeLessThanOrEqual(1000);
    });

    it('should penalize inappropriate actions', () => {
      const poorActions = [
        {
          type: 'wrong_action',
          timestamp: Date.now() - 9000,
          success: false
        }
      ];

      const analysis = PedagogicalUtils.analyzeResolution(mockProblem, poorActions);
      expect(analysis.efficiency).toBeLessThanOrEqual(0.5);
    });
  });

  // Test de la génération de recommandations
  describe('generateRecommendations', () => {
    it('should generate appropriate recommendations for low scores', () => {
      const lowScores = {
        networkManagement: 40,
        problemResolution: 35,
        efficiency: 45
      };

      const recommendations = PedagogicalUtils.generateRecommendations(lowScores);
      expect(recommendations.length).toBeGreaterThan(2);
      expect(recommendations[0].priority).toBe('high');
    });

    it('should prioritize recommendations correctly', () => {
      const mixedScores = {
        networkManagement: 75,
        problemResolution: 30,
        efficiency: 60
      };

      const recommendations = PedagogicalUtils.generateRecommendations(mixedScores);
      expect(recommendations[0].priority).toBe('high');
      expect(recommendations[0].category).toBe('problemResolution');
    });
  });

  // Test de la génération de feedback
  describe('generateFeedback', () => {
    it('should generate constructive feedback', () => {
      const scores = {
        networkManagement: 55,
        problemResolution: 65,
        efficiency: 45,
        adaptability: 70
      };

      const feedback = PedagogicalUtils.generateFeedback(scores);
      expect(feedback.length).toBeGreaterThan(0);
      feedback.forEach(item => {
        expect(item).toHaveProperty('category');
        expect(item).toHaveProperty('level');
        expect(item).toHaveProperty('message');
        expect(item).toHaveProperty('details');
      });
    });

    it('should provide minimal feedback for good performance', () => {
      const goodScores = {
        networkManagement: 85,
        problemResolution: 90,
        efficiency: 88,
        adaptability: 92
      };

      const feedback = PedagogicalUtils.generateFeedback(goodScores);
      expect(feedback.length).toBeLessThanOrEqual(1);
    });
  });
});
