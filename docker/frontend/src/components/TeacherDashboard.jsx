import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Activity, AlertTriangle, Network, Server, Users, Zap } from 'lucide-react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';

const TeacherDashboard = () => {
  const [networkStatus, setNetworkStatus] = useState({
    cities: [],
    alerts: [],
    metrics: {
      totalStudents: 0,
      averageLatency: 0,
      activeCities: 0,
      packetsProcessed: 0
    }
  });

  const [selectedScenario, setSelectedScenario] = useState(null);
  const [isSimulationRunning, setIsSimulationRunning] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [timeframe, setTimeframe] = useState('1h');

  useEffect(() => {
    // Connexion WebSocket
    const ws = new WebSocket('ws://localhost:3001');
    
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      handleWebSocketMessage(data);
    };

    // Nettoyage à la déconnexion
    return () => ws.close();
  }, []);

  const handleWebSocketMessage = (data) => {
    switch (data.type) {
      case 'network_update':
        setNetworkStatus(prev => ({
          ...prev,
          cities: data.cities,
          metrics: data.metrics
        }));
        break;
      case 'alert':
        handleNewAlert(data.alert);
        break;
      case 'scenario_update':
        handleScenarioUpdate(data);
        break;
    }
  };

  const handleNewAlert = (alert) => {
    setNetworkStatus(prev => ({
      ...prev,
      alerts: [...prev.alerts, alert].slice(-10) // Garder les 10 dernières alertes
    }));
  };

  const handleScenarioUpdate = (data) => {
    if (data.status === 'completed') {
      setIsSimulationRunning(false);
      // Afficher le rapport de fin de scénario
    }
  };

  const startScenario = async () => {
    try {
      const response = await fetch('http://localhost:3001/api/teacher/scenarios/start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ scenarioId: selectedScenario })
      });

      if (response.ok) {
        setIsSimulationRunning(true);
      }
    } catch (error) {
      console.error('Error starting scenario:', error);
    }
  };

  const NetworkOverview = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <MetricCard 
        title="Étudiants Actifs"
        value={networkStatus.metrics.totalStudents}
        icon={<Users className="w-6 h-6" />}
        trend="up"
      />
      <MetricCard 
        title="Latence Moyenne"
        value={`${networkStatus.metrics.averageLatency.toFixed(2)} ms`}
        icon={<Activity className="w-6 h-6" />}
        trend={networkStatus.metrics.averageLatency < 100 ? "up" : "down"}
      />
      <MetricCard 
        title="Villes Actives"
        value={networkStatus.metrics.activeCities}
        icon={<Server className="w-6 h-6" />}
        trend="up"
      />
      <MetricCard 
        title="Paquets Traités"
        value={numberWithCommas(networkStatus.metrics.packetsProcessed)}
        icon={<Network className="w-6 h-6" />}
        trend="up"
      />
    </div>
  );

  const MetricCard = ({ title, value, icon, trend }) => (
    <Card>
      <CardContent className="p-6">
        <div className="flex justify-between items-start">
          <div>
            <p className="text-sm font-medium text-gray-500">{title}</p>
            <h3 className="text-2xl font-bold mt-2">{value}</h3>
          </div>
          <div className={`p-3 rounded-full ${
            trend === 'up' ? 'bg-green-100' : 'bg-red-100'
          }`}>
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  );

  const NetworkMap = () => (
    <Card>
      <CardHeader>
        <CardTitle>Carte du Réseau</CardTitle>
      </CardHeader>
      <CardContent>
        {/* Ajoutez ici la visualisation du réseau */}
        <div className="h-[400px] flex items-center justify-center bg-gray-100 rounded-lg">
          Network Visualization Component
        </div>
      </CardContent>
    </Card>
  );

  const AlertsPanel = () => (
    <div className="space-y-4">
      {networkStatus.alerts.map((alert, index) => (
        <Alert 
          key={index}
          variant={alert.severity === 'high' ? 'destructive' : 'warning'}
        >
          <AlertTriangle className="w-4 h-4" />
          <AlertDescription>
            <div className="flex justify-between items-center">
              <span>{alert.message}</span>
              <span className="text-sm opacity-70">
                {new Date(alert.timestamp).toLocaleTimeString()}
              </span>
            </div>
          </AlertDescription>
        </Alert>
      ))}
    </div>
  );

  const PerformanceGraph = () => (
    <Card>
      <CardHeader>
        <CardTitle>Performance du Réseau</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[400px]">
          <LineChart width={800} height={350} data={networkStatus.metrics.history}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="timestamp" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Line 
              type="monotone" 
              dataKey="latency" 
              stroke="#8884d8" 
              name="Latence"
            />
            <Line 
              type="monotone" 
              dataKey="load" 
              stroke="#82ca9d" 
              name="Charge"
            />
          </LineChart>
        </div>
      </CardContent>
    </Card>
  );

  const numberWithCommas = (x) => {
    return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  };

  return (
    <div className="p-8 space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Dashboard Enseignant</h1>
        <div className="flex items-center gap-4">
          <Select
            value={selectedScenario}
            onValueChange={setSelectedScenario}
          >
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Sélectionner un scénario" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="normal">Fonctionnement normal</SelectItem>
              <SelectItem value="regional_failure">Panne régionale</SelectItem>
              <SelectItem value="ddos_attack">Attaque DDoS</SelectItem>
            </SelectContent>
          </Select>
          <Button
            onClick={startScenario}
            disabled={!selectedScenario || isSimulationRunning}
          >
            {isSimulationRunning ? 'Simulation en cours...' : 'Démarrer'}
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview">Vue d'ensemble</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="alerts">Alertes</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <div className="space-y-6">
            <NetworkOverview />
            <NetworkMap />
          </div>
        </TabsContent>

        <TabsContent value="performance">
          <div className="space-y-6">
            <Select
              value={timeframe}
              onValueChange={setTimeframe}
            >
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Période" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1h">Dernière heure</SelectItem>
                <SelectItem value="3h">3 dernières heures</SelectItem>
                <SelectItem value="6h">6 dernières heures</SelectItem>
              </SelectContent>
            </Select>
            <PerformanceGraph />
          </div>
        </TabsContent>

        <TabsContent value="alerts">
          <AlertsPanel />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default TeacherDashboard;
