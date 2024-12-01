import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Activity, Network, Server, ArrowRight, AlertTriangle } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';

const StudentDashboard = ({ cityId }) => {
  const [cityData, setCityData] = useState({
    name: '',
    region: '',
    metrics: {
      latency: 0,
      load: 0,
      packetsProcessed: 0,
      packetLoss: 0
    },
    connections: [],
    alerts: []
  });

  const [performanceHistory, setPerformanceHistory] = useState([]);
  const [neighbors, setNeighbors] = useState([]);

  useEffect(() => {
    // Établir la connexion WebSocket
    const ws = new WebSocket('ws://localhost:3001');
    
    ws.onopen = () => {
      ws.send(JSON.stringify({
        type: 'student:join',
        cityId: cityId
      }));
    };
    
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      handleWebSocketMessage(data);
    };

    // Nettoyer à la déconnexion
    return () => ws.close();
  }, [cityId]);

  useEffect(() => {
    // Charger les données initiales de la ville
    fetchCityData();
    fetchNeighbors();
  }, [cityId]);

  const handleWebSocketMessage = (data) => {
    switch (data.type) {
      case 'metrics_update':
        setCityData(prev => ({
          ...prev,
          metrics: data.metrics
        }));
        setPerformanceHistory(prev => [...prev, data.metrics].slice(-20));
        break;
      case 'alert':
        handleNewAlert(data.alert);
        break;
    }
  };

  const fetchCityData = async () => {
    try {
      const response = await fetch(`http://localhost:3001/api/student/city/${cityId}`);
      if (response.ok) {
        const data = await response.json();
        setCityData(data);
      }
    } catch (error) {
      console.error('Error fetching city data:', error);
    }
  };

  const fetchNeighbors = async () => {
    try {
      const response = await fetch(`http://localhost:3001/api/student/city/${cityId}/neighbors`);
      if (response.ok) {
        const data = await response.json();
        setNeighbors(data.neighbors);
      }
    } catch (error) {
      console.error('Error fetching neighbors:', error);
    }
  };

  const CityMetrics = () => (
    <Card>
      <CardHeader>
        <CardTitle>Métriques en temps réel</CardTitle>
        <CardDescription>Performance de votre data center</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <MetricCard 
            title="Latence"
            value={`${cityData.metrics.latency.toFixed(2)} ms`}
            icon={<Activity />}
            status={getLatencyStatus(cityData.metrics.latency)}
          />
          <MetricCard 
            title="Charge"
            value={`${cityData.metrics.load.toFixed(1)}%`}
            icon={<Server />}
            status={getLoadStatus(cityData.metrics.load)}
          />
          <MetricCard 
            title="Paquets traités"
            value={cityData.metrics.packetsProcessed}
            icon={<Network />}
            status="normal"
          />
          <MetricCard 
            title="Perte de paquets"
            value={`${(cityData.metrics.packetLoss * 100).toFixed(2)}%`}
            icon={<AlertTriangle />}
            status={getPacketLossStatus(cityData.metrics.packetLoss)}
          />
        </div>
      </CardContent>
    </Card>
  );

  const MetricCard = ({ title, value, icon, status }) => (
    <div className="p-4 border rounded-lg">
      <div className={`flex items-center justify-between mb-2 ${
        status === 'critical' ? 'text-red-600' :
        status === 'warning' ? 'text-yellow-600' :
        'text-green-600'
      }`}>
        {icon}
        <span className="text-sm font-medium">{title}</span>
      </div>
      <div className="text-2xl font-bold">{value}</div>
    </div>
  );

  const PerformanceGraph = () => (
    <Card>
      <CardHeader>
        <CardTitle>Historique des performances</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          <LineChart data={performanceHistory} width={700} height={300}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="timestamp" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey="latency" stroke="#8884d8" name="Latence" />
            <Line type="monotone" dataKey="load" stroke="#82ca9d" name="Charge" />
          </LineChart>
        </div>
      </CardContent>
    </Card>
  );

  const NeighborsList = () => (
    <Card>
      <CardHeader>
        <CardTitle>Villes voisines</CardTitle>
        <CardDescription>Connexions directes disponibles</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {neighbors.map((neighbor) => (
            <div key={neighbor.cityId} className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <h3 className="font-medium">{neighbor.name}</h3>
                <p className="text-sm text-gray-500">{neighbor.region}</p>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-sm">
                  <div>Latence: {neighbor.metrics.latency.toFixed(2)}ms</div>
                  <div>État: {neighbor.status}</div>
                </div>
                <Button variant="outline" size="sm">
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );

  // Fonctions utilitaires
  const getLatencyStatus = (latency) => {
    if (latency > 150) return 'critical';
    if (latency > 100) return 'warning';
    return 'normal';
  };

  const getLoadStatus = (load) => {
    if (load > 90) return 'critical';
    if (load > 70) return 'warning';
    return 'normal';
  };

  const getPacketLossStatus = (loss) => {
    if (loss > 0.05) return 'critical';
    if (loss > 0.01) return 'warning';
    return 'normal';
  };

  return (
    <div className="p-8 space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">{cityData.name}</h1>
          <p className="text-gray-500">Région: {cityData.region}</p>
        </div>
        <Button variant="outline">
          Exporter les données
        </Button>
      </div>

      <CityMetrics />
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <PerformanceGraph />
        <NeighborsList />
      </div>

      {cityData.alerts.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-xl font-bold">Alertes</h2>
          {cityData.alerts.map((alert, index) => (
            <Alert 
              key={index}
              variant={alert.severity === 'critical' ? 'destructive' : 'warning'}
            >
              <AlertDescription>
                {alert.message}
              </AlertDescription>
            </Alert>
          ))}
        </div>
      )}
    </div>
  );
};

export default StudentDashboard;
