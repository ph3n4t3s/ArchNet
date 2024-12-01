import React, { createContext, useContext, useState, useEffect } from 'react';
import { useWebSocket } from '../hooks/useWebSocket';
import { cities } from '../config/networkCities';

const SimulationContext = createContext(null);

export const SimulationProvider = ({ children }) => {
  const [simulationState, setSimulationState] = useState({
    status: 'idle', // idle, running, paused, completed
    currentScenario: null,
    startTime: null,
    elapsedTime: 0
  });

  const [networkState, setNetworkState] = useState({
    cities: new Map(cities.map(city => [
      city.id,
      {
        ...city,
        status: 'online',
        metrics: {
          latency: 0,
          load: 0,
          packetsProcessed: 0,
          packetLoss: 0,
          bandwidthUsage: 0
        },
        connections: new Map()
      }
    ])),
    events: [],
    globalMetrics: {
      totalPackets: 0,
      averageLatency: 0,
      activeConnections: 0,
      errorRate: 0
    }
  });

  const { sendMessage, lastMessage } = useWebSocket('ws://localhost:3001', {
    onOpen: () => {
      sendMessage({ type: 'simulation:connect' });
    }
  });

  useEffect(() => {
    if (lastMessage) {
      handleWebSocketMessage(JSON.parse(lastMessage));
    }
  }, [lastMessage]);

  useEffect(() => {
    let timer;
    if (simulationState.status === 'running' && simulationState.startTime) {
      timer = setInterval(() => {
        setSimulationState(prev => ({
          ...prev,
          elapsedTime: Date.now() - prev.startTime
        }));
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [simulationState.status, simulationState.startTime]);

  const handleWebSocketMessage = (data) => {
    switch (data.type) {
      case 'simulation:state':
        handleSimulationStateUpdate(data);
        break;

      case 'network:update':
        handleNetworkUpdate(data);
        break;

      case 'city:metrics':
        handleCityMetricsUpdate(data);
        break;

      case 'event:new':
        handleNewEvent(data.event);
        break;

      default:
        console.log('Unhandled message type:', data.type);
    }
  };

  const handleSimulationStateUpdate = (data) => {
    setSimulationState(prev => ({
      ...prev,
      status: data.status,
      currentScenario: data.scenario,
      startTime: data.startTime || prev.startTime
    }));
  };

  const handleNetworkUpdate = (data) => {
    setNetworkState(prev => ({
      ...prev,
      cities: new Map(data.cities.map(city => [
        city.id,
        {
          ...prev.cities.get(city.id),
          ...city
        }
      ])),
      globalMetrics: data.globalMetrics
    }));
  };

  const handleCityMetricsUpdate = (data) => {
    setNetworkState(prev => ({
      ...prev,
      cities: new Map(prev.cities).set(data.cityId, {
        ...prev.cities.get(data.cityId),
        metrics: data.metrics
      })
    }));
  };

  const handleNewEvent = (event) => {
    setNetworkState(prev => ({
      ...prev,
      events: [...prev.events, event].slice(-100) // Garder les 100 derniers événements
    }));
  };

  const startSimulation = async (scenarioId, options = {}) => {
    try {
      sendMessage({
        type: 'simulation:start',
        scenarioId,
        options
      });
      return true;
    } catch (error) {
      console.error('Error starting simulation:', error);
      return false;
    }
  };

  const pauseSimulation = () => {
    sendMessage({ type: 'simulation:pause' });
  };

  const resumeSimulation = () => {
    sendMessage({ type: 'simulation:resume' });
  };

  const stopSimulation = () => {
    sendMessage({ type: 'simulation:stop' });
  };

  const updateCityMetrics = (cityId, metrics) => {
    sendMessage({
      type: 'city:metrics',
      cityId,
      metrics
    });
  };

  const getCityState = (cityId) => {
    return networkState.cities.get(cityId);
  };

  const getConnectedCities = (cityId) => {
    const city = networkState.cities.get(cityId);
    if (!city) return [];
    
    return Array.from(city.connections.keys())
      .map(targetId => ({
        ...networkState.cities.get(targetId),
        connection: city.connections.get(targetId)
      }));
  };

  const calculateNetworkHealth = () => {
    let totalLatency = 0;
    let totalLoad = 0;
    let activeCities = 0;

    networkState.cities.forEach(city => {
      if (city.status === 'online') {
        totalLatency += city.metrics.latency;
        totalLoad += city.metrics.load;
        activeCities++;
      }
    });

    return {
      averageLatency: activeCities ? totalLatency / activeCities : 0,
      averageLoad: activeCities ? totalLoad / activeCities : 0,
      healthScore: calculateHealthScore(totalLatency / activeCities, totalLoad / activeCities)
    };
  };

  const calculateHealthScore = (avgLatency, avgLoad) => {
    const latencyScore = Math.max(0, 100 - (avgLatency / 2));
    const loadScore = Math.max(0, 100 - avgLoad);
    return (latencyScore * 0.6 + loadScore * 0.4).toFixed(2);
  };

  const value = {
    simulationState,
    networkState,
    startSimulation,
    pauseSimulation,
    resumeSimulation,
    stopSimulation,
    updateCityMetrics,
    getCityState,
    getConnectedCities,
    calculateNetworkHealth
  };

  return (
    <SimulationContext.Provider value={value}>
      {children}
    </SimulationContext.Provider>
  );
};

export const useSimulation = () => {
  const context = useContext(SimulationContext);
  if (!context) {
    throw new Error('useSimulation must be used within a SimulationProvider');
  }
  return context;
};
