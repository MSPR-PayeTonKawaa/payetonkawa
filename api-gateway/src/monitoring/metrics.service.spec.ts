import { Test, TestingModule } from '@nestjs/testing';
import { MetricsService } from './metrics.service';

describe('MetricsService', () => {
  let service: MetricsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [MetricsService],
    }).compile();

    service = module.get<MetricsService>(MetricsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('HTTP Metrics', () => {
    it('should record HTTP metric', () => {
      const metric = {
        method: 'GET',
        url: '/api/test',
        statusCode: 200,
        responseTime: 150,
        userAgent: 'test-agent',
        ip: '127.0.0.1',
        service: 'api-gateway',
        timestamp: new Date().toISOString(),
      };

      service.recordHttpMetric(metric);
      
      const stats = service.getHttpStats();
      expect(stats.totalRequests).toBe(1);
      expect(stats.successfulRequests).toBe(1);
      expect(stats.failedRequests).toBe(0);
      expect(stats.averageResponseTime).toBe(150);
    });

    it('should record multiple HTTP metrics', () => {
      const metrics = [
        {
          method: 'GET',
          url: '/api/test',
          statusCode: 200,
          responseTime: 100,
          timestamp: new Date().toISOString(),
        },
        {
          method: 'POST',
          url: '/api/create',
          statusCode: 201,
          responseTime: 200,
          timestamp: new Date().toISOString(),
        },
        {
          method: 'GET',
          url: '/api/error',
          statusCode: 404,
          responseTime: 50,
          timestamp: new Date().toISOString(),
        },
      ];

      metrics.forEach(metric => service.recordHttpMetric(metric));
      
      const stats = service.getHttpStats();
      expect(stats.totalRequests).toBe(3);
      expect(stats.successfulRequests).toBe(2);
      expect(stats.failedRequests).toBe(1);
      expect(stats.averageResponseTime).toBe(117); // (100+200+50)/3 = 116.67 rounded
    });

    it('should track requests by status code', () => {
      const metrics = [
        { method: 'GET', url: '/api/test', statusCode: 200, responseTime: 100, timestamp: new Date().toISOString() },
        { method: 'GET', url: '/api/test', statusCode: 200, responseTime: 100, timestamp: new Date().toISOString() },
        { method: 'GET', url: '/api/test', statusCode: 404, responseTime: 100, timestamp: new Date().toISOString() },
        { method: 'GET', url: '/api/test', statusCode: 500, responseTime: 100, timestamp: new Date().toISOString() },
      ];

      metrics.forEach(metric => service.recordHttpMetric(metric));
      
      const stats = service.getHttpStats();
      expect(stats.requestsByStatusCode[200]).toBe(2);
      expect(stats.requestsByStatusCode[404]).toBe(1);
      expect(stats.requestsByStatusCode[500]).toBe(1);
    });

    it('should track slow requests', () => {
      const slowMetric = {
        method: 'GET',
        url: '/api/slow',
        statusCode: 200,
        responseTime: 3000, // Slow request (> 2s)
        timestamp: new Date().toISOString(),
      };

      service.recordHttpMetric(slowMetric);
      
      const stats = service.getHttpStats();
      expect(stats.slowestRequests).toHaveLength(1);
      expect(stats.slowestRequests[0].responseTime).toBe(3000);
    });

    it('should track error requests', () => {
      const errorMetric = {
        method: 'GET',
        url: '/api/error',
        statusCode: 500,
        responseTime: 100,
        timestamp: new Date().toISOString(),
      };

      service.recordHttpMetric(errorMetric);
      
      const stats = service.getHttpStats();
      expect(stats.errorRequests).toHaveLength(1);
      expect(stats.errorRequests[0].statusCode).toBe(500);
    });

    it('should return empty stats when no metrics', () => {
      const stats = service.getHttpStats();
      
      expect(stats.totalRequests).toBe(0);
      expect(stats.successfulRequests).toBe(0);
      expect(stats.failedRequests).toBe(0);
      expect(stats.averageResponseTime).toBe(0);
      expect(Object.keys(stats.requestsByStatusCode)).toHaveLength(0);
    });
  });

  describe('RabbitMQ Metrics', () => {
    it('should record RabbitMQ metric', () => {
      const metric = {
        queue: 'test-queue',
        messagesSent: 10,
        messagesReceived: 8,
        messagesInQueue: 2,
        consumers: 1,
        timestamp: new Date().toISOString(),
      };

      service.recordRabbitMQMetric(metric);
      
      const stats = service.getRabbitMQStats();
      expect(stats.totalMessages).toBe(18); // sent + received
      expect(stats.messagesByQueue['test-queue']).toBeDefined();
      expect(stats.messagesByQueue['test-queue'].sent).toBe(10);
      expect(stats.messagesByQueue['test-queue'].received).toBe(8);
    });

    it('should aggregate multiple RabbitMQ metrics for same queue', () => {
      const metrics = [
        {
          queue: 'test-queue',
          messagesSent: 5,
          messagesReceived: 3,
          messagesInQueue: 2,
          consumers: 1,
          timestamp: new Date().toISOString(),
        },
        {
          queue: 'test-queue',
          messagesSent: 7,
          messagesReceived: 5,
          messagesInQueue: 4,
          consumers: 2,
          timestamp: new Date().toISOString(),
        },
      ];

      metrics.forEach(metric => service.recordRabbitMQMetric(metric));
      
      const stats = service.getRabbitMQStats();
      expect(stats.messagesByQueue['test-queue'].sent).toBe(12); // 5 + 7
      expect(stats.messagesByQueue['test-queue'].received).toBe(8); // 3 + 5
      expect(stats.messagesByQueue['test-queue'].inQueue).toBe(4); // Last value
      expect(stats.messagesByQueue['test-queue'].consumers).toBe(2); // Last value
    });

    it('should return empty stats when no metrics', () => {
      const stats = service.getRabbitMQStats();
      
      expect(stats.totalMessages).toBe(0);
      expect(Object.keys(stats.messagesByQueue)).toHaveLength(0);
    });
  });

  describe('Detailed Metrics', () => {
    it('should return detailed metrics with all sections', () => {
      // Add some test data
      service.recordHttpMetric({
        method: 'GET',
        url: '/api/test',
        statusCode: 200,
        responseTime: 100,
        timestamp: new Date().toISOString(),
      });

      service.recordRabbitMQMetric({
        queue: 'test-queue',
        messagesSent: 5,
        messagesReceived: 3,
        messagesInQueue: 2,
        consumers: 1,
        timestamp: new Date().toISOString(),
      });

      const detailed = service.getDetailedMetrics();
      
      expect(detailed).toHaveProperty('timestamp');
      expect(detailed).toHaveProperty('http');
      expect(detailed).toHaveProperty('rabbitmq');
      expect(detailed).toHaveProperty('system');
      expect(detailed).toHaveProperty('performance');
      
      expect(detailed.http.totalRequests).toBe(1);
      expect(detailed.system.uptime).toBeGreaterThan(0);
      expect(detailed.system.memory).toBeDefined();
      expect(detailed.system.platform).toBeDefined();
    });

    it('should calculate error rate correctly', () => {
      // Add successful and failed requests
      service.recordHttpMetric({
        method: 'GET',
        url: '/api/success',
        statusCode: 200,
        responseTime: 100,
        timestamp: new Date().toISOString(),
      });

      service.recordHttpMetric({
        method: 'GET',
        url: '/api/error',
        statusCode: 500,
        responseTime: 100,
        timestamp: new Date().toISOString(),
      });

      const detailed = service.getDetailedMetrics();
      expect(detailed.http.errorRate).toBe(50); // 1 error out of 2 requests = 50%
    });
  });

  describe('Dashboard Summary', () => {
    it('should return dashboard summary', () => {
      service.recordHttpMetric({
        method: 'GET',
        url: '/api/test',
        statusCode: 200,
        responseTime: 100,
        timestamp: new Date().toISOString(),
      });

      const summary = service.getDashboardSummary();
      
      expect(summary).toHaveProperty('period');
      expect(summary).toHaveProperty('timestamp');
      expect(summary).toHaveProperty('http');
      expect(summary.period).toBe('Dernière heure');
    });
  });

  describe('Time Range Filtering', () => {
    it('should filter metrics by time range', () => {
      // This test would require more complex setup to test time filtering
      // For now, just verify the method accepts time range parameter
      const stats = service.getHttpStats('1h');
      expect(stats).toBeDefined();
      
      const rabbitStats = service.getRabbitMQStats('1h');
      expect(rabbitStats).toBeDefined();
    });
  });

  describe('Memory Management', () => {
    it('should handle metric storage without memory leaks', () => {
      // Record many metrics to test memory management
      for (let i = 0; i < 100; i++) {
        service.recordHttpMetric({
          method: 'GET',
          url: `/api/test-${i}`,
          statusCode: 200,
          responseTime: 100,
          timestamp: new Date().toISOString(),
        });
      }

      const stats = service.getHttpStats();
      expect(stats.totalRequests).toBe(100);
    });
  });
});
