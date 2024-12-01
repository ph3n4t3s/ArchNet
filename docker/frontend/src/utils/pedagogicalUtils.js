import { CONFIG } from '../config/config';
import NetworkUtils from './networkUtils';
import EventUtils from './eventUtils';

export const PedagogicalUtils = {
  // Évaluation des performances de l'étudiant
  evaluateStudentPerformance: (studentData, timeframe = '1h') => {
    const {
      networkMetrics,
      events,
      actions,
      problemSolving
    } = studentData;

    const scores = {
      networkManagement: PedagogicalUtils.evaluateNetworkManagement(networkMetrics),
      problemResolution: PedagogicalUtils.evaluateProblemResolution(events, actions),
      efficiency: PedagogicalUtils.evaluateEfficiency(problemSolving),
      adaptability: PedagogicalUtils.evaluateAdaptability(events, actions)
    };

    // Calculer le score global
    const totalScore = PedagogicalUtils.calculateTotalScore(scores);

    return {
      scores,
      totalScore,
      feedback: PedagogicalUtils.generateFeedback(scores),
      recommendations: PedagogicalUtils.generateRecommendations(scores)
    };
  },

  evaluateNetworkManagement: (metrics) => {
    const weights = CONFIG.PEDAGOGY.EVALUATION.METRICS_WEIGHT;
    let score = 0;

    // Évaluer la latence
    score += NetworkUtils.calculateLatencyScore(metrics.averageLatency) * weights.LATENCY;

    // Évaluer la perte de paquets
    score += NetworkUtils.calculatePacketLossScore(metrics.packetLoss) * weights.PACKET_LOSS;

    // Évaluer l'équilibrage de charge
    score += NetworkUtils.calculateLoadScore(metrics.averageLoad) * weights.LOAD_BALANCING;

    return Math.min(100, Math.max(0, score));
  },

  evaluateProblemResolution: (events, actions) => {
    let score = 100;
    const problems = events.filter(e => e.severity === 'critical' || e.severity === 'error');
    
    problems.forEach(problem => {
      const resolution = PedagogicalUtils.analyzeResolution(problem, actions);
      score *= resolution.efficiency;
    });

    return Math.min(100, Math.max(0, score));
  },

  analyzeResolution: (problem, actions) => {
    const problemTime = new Date(problem.timestamp).getTime();
    const relevantActions = actions.filter(a => 
      new Date(a.timestamp).getTime() > problemTime
    );

    // Analyser le temps de réaction
    const reactionTime = PedagogicalUtils.calculateReactionTime(problem, relevantActions);
    
    // Analyser l'efficacité des actions
    const actionEfficiency = PedagogicalUtils.evaluateActionEfficiency(relevantActions);

    return {
      reactionTime,
      efficiency: actionEfficiency,
      appropriateActions: PedagogicalUtils.checkActionsAppropriateness(problem, relevantActions)
    };
  },

  evaluateEfficiency: (problemSolving) => {
    return {
      timeEfficiency: PedagogicalUtils.calculateTimeEfficiency(problemSolving),
      resourceEfficiency: PedagogicalUtils.calculateResourceEfficiency(problemSolving),
      solutionQuality: PedagogicalUtils.evaluateSolutionQuality(problemSolving)
    };
  },

  evaluateAdaptability: (events, actions) => {
    const scenarios = PedagogicalUtils.identifyScenarios(events);
    return scenarios.map(scenario => ({
      type: scenario.type,
      adaptabilityScore: PedagogicalUtils.calculateAdaptabilityScore(scenario, actions),
      learningCurve: PedagogicalUtils.analyzeLearningCurve(scenario, actions)
    }));
  },

  calculateTotalScore: (scores) => {
    const weights = CONFIG.PEDAGOGY.EVALUATION.METRICS_WEIGHT;
    
    return Object.entries(scores).reduce((total, [metric, score]) => {
      return total + (score * (weights[metric] || 0.25));
    }, 0);
  },

  generateFeedback: (scores) => {
    const feedback = [];

    // Feedback sur la gestion du réseau
    if (scores.networkManagement < 60) {
      feedback.push({
        category: 'network_management',
        level: 'improvement_needed',
        message: 'La gestion du réseau nécessite une attention particulière.',
        details: PedagogicalUtils.getNetworkManagementRecommendations(scores.networkManagement)
      });
    }

    // Feedback sur la résolution de problèmes
    if (scores.problemResolution < 70) {
      feedback.push({
        category: 'problem_resolution',
        level: 'attention_required',
        message: 'La résolution de problèmes peut être améliorée.',
        details: PedagogicalUtils.getProblemResolutionTips(scores.problemResolution)
      });
    }

    return feedback;
  },

  generateRecommendations: (scores) => {
    const recommendations = [];

    // Recommandations basées sur les scores
    Object.entries(scores).forEach(([category, score]) => {
      if (score < 60) {
        recommendations.push(...PedagogicalUtils.getRecommendationsForCategory(category, score));
      }
    });

    // Prioriser les recommandations
    return PedagogicalUtils.prioritizeRecommendations(recommendations);
  },

  getRecommendationsForCategory: (category, score) => {
    const recommendations = {
      networkManagement: [
        {
          priority: 'high',
          action: 'Surveiller activement les métriques réseau',
          description: 'Mettre en place une surveillance systématique des indicateurs clés.'
        },
        {
          priority: 'medium',
          action: 'Optimiser les routes',
          description: 'Revoir et optimiser les chemins de routage existants.'
        }
      ],
      problemResolution: [
        {
          priority: 'high',
          action: 'Améliorer le temps de réaction',
          description: 'Réduire le temps de détection et de résolution des problèmes.'
        },
        {
          priority: 'medium',
          action: 'Documenter les solutions',
          description: 'Maintenir un journal des solutions appliquées.'
        }
      ]
    };

    return recommendations[category] || [];
  },

  prioritizeRecommendations: (recommendations) => {
    return recommendations.sort((a, b) => {
      const priorityValues = { high: 3, medium: 2, low: 1 };
      return priorityValues[b.priority] - priorityValues[a.priority];
    });
  },

  // Utilitaires d'analyse
  calculateReactionTime: (problem, actions) => {
    if (actions.length === 0) return Infinity;
    
    const problemTime = new Date(problem.timestamp).getTime();
    const firstActionTime = new Date(actions[0].timestamp).getTime();
    
    return (firstActionTime - problemTime) / 1000; // en secondes
  },

  evaluateActionEfficiency: (actions) => {
    if (actions.length === 0) return 0;

    const efficiencyScores = actions.map(action => {
      // Évaluer chaque action sur une échelle de 0 à 1
      return action.success ? (action.impact || 0.5) : 0;
    });

    return efficiencyScores.reduce((a, b) => a + b) / efficiencyScores.length;
  },

  calculateTimeEfficiency: (problemSolving) => {
    const { timeSpent, expectedTime } = problemSolving;
    if (!timeSpent || !expectedTime) return 1;

    return Math.min(1, expectedTime / timeSpent);
  },

  identifyScenarios: (events) => {
    // Grouper les événements en scénarios cohérents
    const scenarios = [];
    let currentScenario = null;

    events.forEach(event => {
      if (PedagogicalUtils.isScenarioStart(event)) {
        if (currentScenario) {
          scenarios.push(currentScenario);
        }
        currentScenario = {
          type: event.type,
          startTime: event.timestamp,
          events: [event]
        };
      } else if (currentScenario) {
        currentScenario.events.push(event);
      }
    });

    if (currentScenario) {
      scenarios.push(currentScenario);
    }

    return scenarios;
  },

  isScenarioStart: (event) => {
    return event.type === 'scenario_start' || 
           event.type === 'major_incident' || 
           event.type === 'planned_maintenance';
  },

  analyzeLearningCurve: (scenario, actions) => {
    const timeSegments = PedagogicalUtils.divideScenarioIntoSegments(scenario);
    
    return timeSegments.map(segment => ({
      timeframe: segment.timeframe,
      performanceScore: PedagogicalUtils.calculateSegmentPerformance(segment, actions),
      improvement: PedagogicalUtils.calculateImprovement(segment, actions)
    }));
  }
};

export default PedagogicalUtils;
