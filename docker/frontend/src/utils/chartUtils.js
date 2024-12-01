import { CONFIG } from '../config/config';

export const ChartUtils = {
  // Configuration des thèmes graphiques
  theme: {
    colors: {
      primary: CONFIG.UI.CHARTS.COLORS.PRIMARY,
      secondary: CONFIG.UI.CHARTS.COLORS.SECONDARY,
      warning: CONFIG.UI.CHARTS.COLORS.WARNING,
      danger: CONFIG.UI.CHARTS.COLORS.DANGER,
      background: '#ffffff',
      gridLines: '#e5e7eb'
    },
    fonts: {
      base: 'Inter, sans-serif',
      monospace: 'ui-monospace, monospace'
    }
  },

  // Configuration des graphiques réseaux
  getNetworkChartConfig: (data, options = {}) => {
    return {
      width: options.width || '100%',
      height: options.height || 400,
      data: ChartUtils.formatNetworkData(data),
      tooltip: {
        trigger: 'item',
        formatter: ChartUtils.formatNetworkTooltip
      },
      legend: {
        data: ['Latence', 'Charge', 'Perte de paquets'],
        bottom: 0
      },
      grid: {
        top: 20,
        right: 20,
        bottom: 40,
        left: 50,
        containLabel: true
      },
      xAxis: {
        type: 'time',
        splitLine: {
          show: true,
          lineStyle: { color: ChartUtils.theme.colors.gridLines }
        }
      },
      yAxis: [
        {
          type: 'value',
          name: 'Latence (ms)',
          position: 'left',
          axisLine: { show: true },
          axisLabel: { formatter: '{value} ms' }
        },
        {
          type: 'value',
          name: 'Charge (%)',
          position: 'right',
          axisLine: { show: true },
          axisLabel: { formatter: '{value}%' }
        }
      ],
      series: ChartUtils.generateNetworkSeries(data)
    };
  },

  formatNetworkData: (data) => {
    return data.map(item => ({
      timestamp: new Date(item.timestamp),
      latency: Number(item.latency.toFixed(2)),
      load: Number(item.load.toFixed(1)),
      packetLoss: Number((item.packetLoss * 100).toFixed(2))
    }));
  },

  generateNetworkSeries: (data) => [
    {
      name: 'Latence',
      type: 'line',
      data: data.map(item => [item.timestamp, item.latency]),
      yAxisIndex: 0,
      itemStyle: { color: ChartUtils.theme.colors.primary }
    },
    {
      name: 'Charge',
      type: 'line',
      data: data.map(item => [item.timestamp, item.load]),
      yAxisIndex: 1,
      itemStyle: { color: ChartUtils.theme.colors.secondary }
    },
    {
      name: 'Perte de paquets',
      type: 'scatter',
      data: data.map(item => [item.timestamp, item.packetLoss * 100]),
      yAxisIndex: 1,
      itemStyle: { color: ChartUtils.theme.colors.warning }
    }
  ],

  // Formatage des tooltips
  formatNetworkTooltip: (params) => {
    const time = new Date(params.data[0]).toLocaleTimeString();
    const value = params.data[1].toFixed(2);
    return `${params.seriesName}<br/>${time}: ${value}${params.seriesName === 'Charge' || params.seriesName === 'Perte de paquets' ? '%' : ' ms'}`;
  },

  // Configuration pour les graphiques de performance
  getPerformanceChartConfig: (data, options = {}) => {
    return {
      width: options.width || '100%',
      height: options.height || 300,
      data: ChartUtils.formatPerformanceData(data),
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'cross' }
      },
      legend: {
        data: ['Score', 'Tendance'],
        bottom: 0
      },
      grid: {
        top: 20,
        right: 20,
        bottom: 40,
        left: 50
      },
      xAxis: {
        type: 'time',
        splitLine: { show: false }
      },
      yAxis: {
        type: 'value',
        min: 0,
        max: 100,
        splitLine: {
          lineStyle: { color: ChartUtils.theme.colors.gridLines }
        }
      },
      series: ChartUtils.generatePerformanceSeries(data)
    };
  },

  // Fonctions utilitaires pour la visualisation des données
  formatDataForChart: (data, type) => {
    switch (type) {
      case 'line':
        return ChartUtils.formatLineChartData(data);
      case 'bar':
        return ChartUtils.formatBarChartData(data);
      case 'scatter':
        return ChartUtils.formatScatterChartData(data);
      default:
        return data;
    }
  },

  formatLineChartData: (data) => {
    return data.map(item => ({
      x: new Date(item.timestamp),
      y: Number(item.value)
    }));
  },

  formatBarChartData: (data) => {
    return data.map(item => ({
      label: item.category,
      value: Number(item.value)
    }));
  },

  formatScatterChartData: (data) => {
    return data.map(item => ({
      x: Number(item.x),
      y: Number(item.y),
      size: item.size || 1,
      category: item.category
    }));
  },

  // Fonctions de calcul pour les graphiques
  calculateMovingAverage: (data, period = 5) => {
    return data.map((item, index, array) => {
      if (index < period - 1) return null;
      
      const sum = array
        .slice(index - period + 1, index + 1)
        .reduce((acc, curr) => acc + curr.value, 0);
      
      return {
        timestamp: item.timestamp,
        value: sum / period
      };
    }).filter(item => item !== null);
  },

  calculateTrendline: (data) => {
    const xValues = data.map((_, i) => i);
    const yValues = data.map(item => item.value);

    const n = data.length;
    const sumX = xValues.reduce((a, b) => a + b, 0);
    const sumY = yValues.reduce((a, b) => a + b, 0);
    const sumXY = xValues.reduce((acc, curr, i) => acc + curr * yValues[i], 0);
    const sumXX = xValues.reduce((acc, curr) => acc + curr * curr, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    return data.map((item, index) => ({
      timestamp: item.timestamp,
      value: slope * index + intercept
    }));
  },

  // Fonctions d'échelle et de formatage
  scaleValue: (value, oldMin, oldMax, newMin, newMax) => {
    return ((value - oldMin) * (newMax - newMin)) / (oldMax - oldMin) + newMin;
  },

  formatValue: (value, type) => {
    switch (type) {
      case 'percentage':
        return `${value.toFixed(1)}%`;
      case 'latency':
        return `${value.toFixed(2)}ms`;
      case 'bytes':
        return ChartUtils.formatBytes(value);
      default:
        return value.toString();
    }
  },

  formatBytes: (bytes) => {
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    let value = bytes;
    let unitIndex = 0;

    while (value >= 1024 && unitIndex < units.length - 1) {
      value /= 1024;
      unitIndex++;
    }

    return `${value.toFixed(2)} ${units[unitIndex]}`;
  }
};

export default ChartUtils;
