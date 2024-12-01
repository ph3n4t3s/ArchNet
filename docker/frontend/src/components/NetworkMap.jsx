import React, { useEffect, useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity, Server } from 'lucide-react';
import { cities } from '../config/networkCities';

const NetworkMap = ({ data, selectedCity, onCitySelect, isTeacher = false }) => {
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });

  // Calcul des positions des villes sur la carte
  const cityPositions = useMemo(() => {
    const padding = 50;
    const regionGroups = groupCitiesByRegion(cities);
    const positions = new Map();
    
    // Calculer position par région
    Object.entries(regionGroups).forEach(([region, regionCities], regionIndex) => {
      const regionX = (dimensions.width / Object.keys(regionGroups).length) * regionIndex;
      
      regionCities.forEach((city, cityIndex) => {
        positions.set(city.id, {
          x: regionX + padding + Math.random() * 100,
          y: padding + (dimensions.height - padding * 2) * (cityIndex / regionCities.length)
        });
      });
    });
    
    return positions;
  }, [dimensions]);

  useEffect(() => {
    const updateDimensions = () => {
      const container = document.getElementById('network-map-container');
      if (container) {
        setDimensions({
          width: container.clientWidth,
          height: container.clientHeight
        });
      }
    };

    window.addEventListener('resize', updateDimensions);
    updateDimensions();

    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  const getCityColor = (cityId) => {
    const cityData = data?.cities?.find(c => c.id === cityId);
    if (!cityData) return '#gray';

    if (cityData.status === 'offline') return '#ef4444';
    if (cityData.metrics.load > 80) return '#f59e0b';
    if (cityData.metrics.latency > 150) return '#eab308';
    return '#22c55e';
  };

  const getLinkColor = (source, target) => {
    const sourceData = data?.cities?.find(c => c.id === source);
    const targetData = data?.cities?.find(c => c.id === target);
    
    if (!sourceData || !targetData) return '#gray';
    if (sourceData.status === 'offline' || targetData.status === 'offline') return '#ef4444';
    
    const connection = sourceData.connections.find(conn => conn.targetId === target);
    if (!connection) return '#gray';
    
    if (connection.latency > 200) return '#ef4444';
    if (connection.latency > 100) return '#f59e0b';
    return '#22c55e';
  };

  const renderLinks = () => {
    return cities.map(city => 
      city.connections.map(targetId => {
        const sourcePos = cityPositions.get(city.id);
        const targetPos = cityPositions.get(targetId);
        if (!sourcePos || !targetPos) return null;

        return (
          <line
            key={`${city.id}-${targetId}`}
            x1={sourcePos.x * zoom + pan.x}
            y1={sourcePos.y * zoom + pan.y}
            x2={targetPos.x * zoom + pan.x}
            y2={targetPos.y * zoom + pan.y}
            stroke={getLinkColor(city.id, targetId)}
            strokeWidth={2}
          />
        );
      })
    );
  };

  const renderCities = () => {
    return cities.map(city => {
      const pos = cityPositions.get(city.id);
      if (!pos) return null;

      const cityData = data?.cities?.find(c => c.id === city.id);
      const isSelected = selectedCity === city.id;

      return (
        <g
          key={city.id}
          transform={`translate(${pos.x * zoom + pan.x}, ${pos.y * zoom + pan.y})`}
          onClick={() => onCitySelect?.(city.id)}
          style={{ cursor: 'pointer' }}
        >
          <circle
            r={isSelected ? 12 : 8}
            fill={getCityColor(city.id)}
            stroke={isSelected ? '#3b82f6' : 'none'}
            strokeWidth={2}
          />
          <text
            x="0"
            y="20"
            textAnchor="middle"
            className="text-xs font-medium"
          >
            {city.name}
          </text>
          {isTeacher && cityData && (
            <text
              x="0"
              y="-15"
              textAnchor="middle"
              className="text-xs"
            >
              {`${cityData.metrics.load.toFixed(0)}%`}
            </text>
          )}
        </g>
      );
    });
  };

  const handleZoom = (event) => {
    const newZoom = zoom + (event.deltaY > 0 ? -0.1 : 0.1);
    setZoom(Math.max(0.5, Math.min(2, newZoom)));
  };

  const handlePan = (event) => {
    if (event.buttons === 1) {
      setPan(prev => ({
        x: prev.x + event.movementX,
        y: prev.y + event.movementY
      }));
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Server className="w-5 h-5" />
          Carte du Réseau
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div 
          id="network-map-container"
          className="relative w-full h-[600px] overflow-hidden"
          onWheel={handleZoom}
          onMouseMove={handlePan}
        >
          <svg
            width={dimensions.width}
            height={dimensions.height}
            className="absolute top-0 left-0"
          >
            {renderLinks()}
            {renderCities()}
          </svg>
        </div>
      </CardContent>
    </Card>
  );
};

// Fonction utilitaire pour grouper les villes par région
const groupCitiesByRegion = (cities) => {
  return cities.reduce((groups, city) => {
    if (!groups[city.region]) {
      groups[city.region] = [];
    }
    groups[city.region].push(city);
    return groups;
  }, {});
};

export default NetworkMap;
