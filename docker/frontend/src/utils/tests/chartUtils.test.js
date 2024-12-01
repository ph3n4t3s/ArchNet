import { ChartUtils } from '../../utils/chartUtils';
import { CONFIG } from '../../config/config';

describe('ChartUtils', () => {
  // Test de la configuration des graphiques réseau
  describe('getNetworkChartConfig', () => {
    const sampleData = [
      {
        timestamp: new Date('2024-01-01T10:00:00'),
        latency: 50,
        load: 60,
        packetLoss: 0.02
      },
      {
        timestamp: new Date('2024-01-01T10:01:00'),
        latency: 55,
        load: 65,
        packetLoss: 0.03
      }
    ];

    it('should generate valid network chart configuration', () => {
      const config = ChartUtils.getNetworkChartConfig(sampleData);

      expect(config).toMatchObject({
        width: expect.any(String),
        height: expect.any(Number),
        data: expect.any(Array),
        tooltip: expect.any(Object),
        legend: expect.any(Object),
        series: expect.arrayContaining([
          expect.objectContaining({
            name: 'Latence',
            type: 'line'
          })
        ])
      });
    });

    it('should respect custom dimensions', () => {
      const options = { width: 800, height: 600 };
      const config = ChartUtils.getNetworkChartConfig(sampleData, options);

      expect(config.width).toBe(options.width);
      expect(config.height).toBe(options.height);
    });

    it('should format data correctly', () => {
      const config = ChartUtils.getNetworkChartConfig(sampleData);
      const formattedData = ChartUtils.formatNetworkData(sampleData);

      expect(formattedData[0]).toHaveProperty('timestamp');
      expect(formattedData[0]).toHaveProperty('latency');
      expect(formattedData[0].latency).toBeCloseTo(50, 2);
    });
  });

  // Test du formatage des données pour différents types de graphiques
  describe('formatDataForChart', () => {
    const sampleData = [
      {
        timestamp: new Date('2024-01-01T10:00:00'),
        value: 50,
        category: 'A'
      },
      {
        timestamp: new Date('2024-01-01T10:01:00'),
        value: 55,
        category: 'B'
      }
    ];

    it('should format line chart data correctly', () => {
      const formatted = ChartUtils.formatDataForChart(sampleData, 'line');
      expect(formatted[0]).toHaveProperty('x');
      expect(formatted[0]).toHaveProperty('y');
      expect(formatted[0].y).toBe(50);
    });

    it('should format bar chart data correctly', () => {
      const formatted = ChartUtils.formatDataForChart(sampleData, 'bar');
      expect(formatted[0]).toHaveProperty('label');
      expect(formatted[0]).toHaveProperty('value');
      expect(formatted.length).toBe(sampleData.length);
    });

    it('should format scatter chart data correctly', () => {
      const scatterData = sampleData.map(d => ({
        x: d.value,
        y: d.value * 2,
        size: 1,
        category: d.category
      }));
      
      const formatted = ChartUtils.formatDataForChart(scatterData, 'scatter');
      expect(formatted[0]).toHaveProperty('x');
      expect(formatted[0]).toHaveProperty('y');
      expect(formatted[0]).toHaveProperty('size');
      expect(formatted[0]).toHaveProperty('category');
    });
  });

  // Test des calculs statistiques
  describe('calculation functions', () => {
    const sampleData = Array.from({ length: 10 }, (_, i) => ({
      timestamp: new Date(Date.now() + i * 60000),
      value: Math.sin(i) * 50 + 50
    }));

    it('should calculate moving average correctly', () => {
      const movingAvg = ChartUtils.calculateMovingAverage(sampleData, 3);
      expect(movingAvg.length).toBe(sampleData.length - 2);
      expect(movingAvg[0]).toHaveProperty('value');
      expect(movingAvg[0]).toHaveProperty('timestamp');
    });

    it('should calculate trendline correctly', () => {
      const trendline = ChartUtils.calculateTrendline(sampleData);
      expect(trendline.length).toBe(sampleData.length);
      expect(trendline[0]).toHaveProperty('value');
      expect(trendline[0]).toHaveProperty('timestamp');
    });
  });

  // Test des fonctions de mise à l'échelle et de formatage
  describe('formatting and scaling', () => {
    it('should scale values correctly', () => {
      const scaled = ChartUtils.scaleValue(50, 0, 100, 0, 1);
      expect(scaled).toBe(0.5);
    });

    it('should format values according to type', () => {
      expect(ChartUtils.formatValue(75.5, 'percentage')).toBe('75.5%');
      expect(ChartUtils.formatValue(123.45, 'latency')).toBe('123.45ms');
      expect(ChartUtils.formatValue(1500000, 'bytes')).toContain('MB');
    });

    it('should format bytes with appropriate units', () => {
      expect(ChartUtils.formatBytes(1024)).toContain('KB');
      expect(ChartUtils.formatBytes(1024 * 1024)).toContain('MB');
      expect(ChartUtils.formatBytes(1024 * 1024 * 1024)).toContain('GB');
    });
  });

  // Test des tooltips et du formatage personnalisé
  describe('tooltips and custom formatting', () => {
    it('should format network tooltip correctly', () => {
      const params = {
        seriesName: 'Latence',
        data: [new Date(), 50],
      };

      const tooltip = ChartUtils.formatNetworkTooltip(params);
      expect(tooltip).toContain('Latence');
      expect(tooltip).toContain('ms');
    });

    it('should handle different metric types in tooltips', () => {
      const loadParams = {
        seriesName: 'Charge',
        data: [new Date(), 75]
      };

      const packetLossParams = {
        seriesName: 'Perte de paquets',
        data: [new Date(), 2.5]
      };

      expect(ChartUtils.formatNetworkTooltip(loadParams)).toContain('%');
      expect(ChartUtils.formatNetworkTooltip(packetLossParams)).toContain('%');
    });
  });
});
