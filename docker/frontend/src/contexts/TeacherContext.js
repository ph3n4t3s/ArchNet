import React, { createContext, useContext, useState, useEffect } from 'react';
import { useWebSocket } from '../hooks/useWebSocket';

const TeacherContext = createContext(null);

export const TeacherProvider = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [networkState, setNetworkState] = useState({
    cities: [],
    alerts: [],
    metrics: {
      totalStudents: 0,
      averageLatency: 0,
      activeCities: 0,
      packetsProcessed: 0
    }
  });
  const [selectedCity, setSelectedCity] = useState(null);
  const [activeScenario, setActiveScenario] = useState(null);
  const [isSimulationRunning, setIsSimulationRunning] = useState(false);

  // WebSocket connection
  const { sendMessage, lastMessage } = useWebSocket('ws://localhost:3001', {
    onOpen: () => {
      sendMessage({ type: 'teacher:join' });
    }
  });

  useEffect(() => {
    if (lastMessage) {
      handleWebSocketMessage(JSON.parse(lastMessage));
    }
  }, [lastMessage]);

  const handleWebSocketMessage = (data) => {
    switch (data.type) {
      case 'network:update':
        setNetworkState(prev => ({
          ...prev,
          cities: data.cities,
          metrics: data.metrics
        }));
        break;

      case 'alert:new':
        setNetworkState(prev => ({
          ...prev,
          alerts: [...prev.alerts, data.alert].slice(-10)
        }));
        break;

      case 'scenario:status':
        handleScenarioUpdate(data);
        break;

      default:
        console.log('Unhandled message type:', data.type);
    }
  };

  const handleScenarioUpdate = (data) => {
    setActiveScenario(data.scenario);
    setIsSimulationRunning(data.status === 'running');

    if (data.status === 'completed') {
      generateReport(data.scenarioId);
    }
  };

  const login = async (password) => {
    try {
      const response = await fetch('http://localhost:3001/api/teacher/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ password })
      });

      if (response.ok) {
        const data = await response.json();
        localStorage.setItem('teacher_token', data.token);
        setIsAuthenticated(true);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Login error:', error);
      return false;
    }
  };

  const logout = () => {
    localStorage.removeItem('teacher_token');
    setIsAuthenticated(false);
  };

  const startScenario = async (scenarioId) => {
    try {
      const response = await fetch('http://localhost:3001/api/teacher/scenarios/start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('teacher_token')}`
        },
        body: JSON.stringify({ scenarioId })
      });

      if (response.ok) {
        setActiveScenario(scenarioId);
        setIsSimulationRunning(true);
        sendMessage({
          type: 'scenario:start',
          scenarioId
        });
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error starting scenario:', error);
      return false;
    }
  };

  const stopScenario = async () => {
    try {
      const response = await fetch('http://localhost:3001/api/teacher/scenarios/stop', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('teacher_token')}`
        }
      });

      if (response.ok) {
        setActiveScenario(null);
        setIsSimulationRunning(false);
        sendMessage({ type: 'scenario:stop' });
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error stopping scenario:', error);
      return false;
    }
  };

  const generateReport = async (scenarioId) => {
    try {
      const response = await fetch(`http://localhost:3001/api/teacher/report?scenarioId=${scenarioId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('teacher_token')}`
        }
      });

      if (response.ok) {
        const report = await response.json();
        return report;
      }
      return null;
    } catch (error) {
      console.error('Error generating report:', error);
      return null;
    }
  };

  const clearAlerts = () => {
    setNetworkState(prev => ({
      ...prev,
      alerts: []
    }));
  };

  const value = {
    isAuthenticated,
    networkState,
    selectedCity,
    activeScenario,
    isSimulationRunning,
    login,
    logout,
    startScenario,
    stopScenario,
    setSelectedCity,
    generateReport,
    clearAlerts
  };

  return (
    <TeacherContext.Provider value={value}>
      {children}
    </TeacherContext.Provider>
  );
};

export const useTeacher = () => {
  const context = useContext(TeacherContext);
  if (!context) {
    throw new Error('useTeacher must be used within a TeacherProvider');
  }
  return context;
};
