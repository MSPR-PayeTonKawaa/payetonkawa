import { Test, TestingModule } from '@nestjs/testing';
import { MonitoringController } from './monitoring.controller';
import { MetricsService } from './metrics.service';
import { RabbitMQMetricsService } from './rabbitmq-metrics.service';
import { JwtService } from '@nestjs/jwt';
import { Reflector } from '@nestjs/core';

describe('MonitoringController', () => {
  let controller: MonitoringController;
  let metricsService: MetricsService;
  let rabbitMQMetricsService: RabbitMQMetricsService;

  const mockMetricsService = {
    getHttpStats: jest.fn(),
    getSystemStats: jest.fn(),
    getRequestMetrics: jest.fn(),
  };

  const mockRabbitMQMetricsService = {
    getPayeTonKawaMetrics: jest.fn(),
    getQueueDetails: jest.fn(),
    getConnectionMetrics: jest.fn(),
  };

  const mockJwtService = {
    sign: jest.fn(),
    verify: jest.fn(),
    decode: jest.fn(),
  };

  const mockReflector = {
    get: jest.fn(),
    getAll: jest.fn(),
    getAllAndMerge: jest.fn(),
    getAllAndOverride: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MonitoringController],
      providers: [
        {
          provide: MetricsService,
          useValue: mockMetricsService,
        },
        {
          provide: RabbitMQMetricsService,
          useValue: mockRabbitMQMetricsService,
        },
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
        {
          provide: Reflector,
          useValue: mockReflector,
        },
      ],
    }).compile();

    controller = module.get<MonitoringController>(MonitoringController);
    metricsService = module.get<MetricsService>(MetricsService);
    rabbitMQMetricsService = module.get<RabbitMQMetricsService>(RabbitMQMetricsService);

    // Reset mocks before each test
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('testController', () => {
    it('should return test message with timestamp', () => {
      const result = controller.testController();

      expect(result).toHaveProperty('message');
      expect(result).toHaveProperty('timestamp');
      expect(result.message).toBe('Controller monitoring fonctionne !');
      expect(typeof result.timestamp).toBe('string');
      
      // Vérifier que le timestamp est une date ISO valide
      const timestamp = new Date(result.timestamp);
      expect(timestamp).toBeInstanceOf(Date);
      expect(timestamp.getTime()).not.toBeNaN();
    });

    it('should return different timestamps on multiple calls', async () => {
      const result1 = controller.testController();
      // Attendre 1ms pour s'assurer que les timestamps sont différents
      await new Promise(resolve => setTimeout(resolve, 1));
      const result2 = controller.testController();

      expect(result1.timestamp).not.toBe(result2.timestamp);
    });
  });

  describe('getHttpMetrics', () => {
    it('should return HTTP metrics without time range', () => {
      const expectedMetrics = {
        totalRequests: 1000,
        successfulRequests: 950,
        failedRequests: 50,
        averageResponseTime: 125,
        requestsByStatusCode: {
          '200': 800,
          '201': 100,
          '404': 30,
          '500': 20,
        },
        requestsByEndpoint: {
          '/api/customers': 400,
          '/api/products': 350,
          '/api/orders': 250,
        },
        requestsByService: {
          'clients': 400,
          'produits': 350,
          'commandes': 250,
        },
      };

      mockMetricsService.getHttpStats.mockReturnValue(expectedMetrics);

      const result = controller.getHttpMetrics();

      expect(result).toEqual(expectedMetrics);
      expect(mockMetricsService.getHttpStats).toHaveBeenCalledWith(undefined);
    });

    it('should return HTTP metrics with time range', () => {
      const timeRange = '1h';
      const expectedMetrics = {
        totalRequests: 100,
        successfulRequests: 95,
        failedRequests: 5,
        averageResponseTime: 95,
        requestsByStatusCode: {
          '200': 80,
          '201': 15,
          '404': 3,
          '500': 2,
        },
        requestsByEndpoint: {
          '/api/customers': 40,
          '/api/products': 35,
          '/api/orders': 25,
        },
        requestsByService: {
          'clients': 40,
          'produits': 35,
          'commandes': 25,
        },
      };

      mockMetricsService.getHttpStats.mockReturnValue(expectedMetrics);

      const result = controller.getHttpMetrics(timeRange);

      expect(result).toEqual(expectedMetrics);
      expect(mockMetricsService.getHttpStats).toHaveBeenCalledWith(timeRange);
    });

    it('should handle different time ranges', () => {
      const timeRanges = ['5m', '1h', '24h'];
      
      timeRanges.forEach(timeRange => {
        const metrics = {
          totalRequests: Math.floor(Math.random() * 1000),
          successfulRequests: Math.floor(Math.random() * 900),
          failedRequests: Math.floor(Math.random() * 100),
          averageResponseTime: Math.floor(Math.random() * 200),
        };

        mockMetricsService.getHttpStats.mockReturnValue(metrics);

        const result = controller.getHttpMetrics(timeRange);

        expect(mockMetricsService.getHttpStats).toHaveBeenCalledWith(timeRange);
        expect(result).toEqual(metrics);

        jest.clearAllMocks();
      });
    });

    it('should handle empty metrics', () => {
      const emptyMetrics = {
        totalRequests: 0,
        successfulRequests: 0,
        failedRequests: 0,
        averageResponseTime: 0,
        requestsByStatusCode: {},
        requestsByEndpoint: {},
        requestsByService: {},
      };

      mockMetricsService.getHttpStats.mockReturnValue(emptyMetrics);

      const result = controller.getHttpMetrics();

      expect(result.totalRequests).toBe(0);
      expect(result.successfulRequests).toBe(0);
      expect(result.failedRequests).toBe(0);
    });
  });

  describe('getRabbitMQMetrics', () => {
    it('should return RabbitMQ metrics without time range', async () => {
      const expectedMetrics = {
        totalMessages: 500,
        messagesByQueue: {
          'customer.events': {
            sent: 150,
            received: 145,
            inQueue: 5,
            consumers: 2,
          },
          'product.events': {
            sent: 200,
            received: 195,
            inQueue: 5,
            consumers: 3,
          },
          'order.events': {
            sent: 150,
            received: 150,
            inQueue: 0,
            consumers: 2,
          },
        },
        lastUpdate: new Date().toISOString(),
      };

      mockRabbitMQMetricsService.getPayeTonKawaMetrics.mockResolvedValue(expectedMetrics);

      const result = await controller.getRabbitMQMetrics();

      expect(result).toEqual(expectedMetrics);
      expect(mockRabbitMQMetricsService.getPayeTonKawaMetrics).toHaveBeenCalledTimes(1);
    });

    it('should return RabbitMQ metrics with time range', async () => {
      const timeRange = '24h';
      const expectedMetrics = {
        totalMessages: 2000,
        messagesByQueue: {
          'customer.events': {
            sent: 600,
            received: 590,
            inQueue: 10,
            consumers: 2,
          },
          'product.events': {
            sent: 800,
            received: 785,
            inQueue: 15,
            consumers: 3,
          },
          'order.events': {
            sent: 600,
            received: 600,
            inQueue: 0,
            consumers: 2,
          },
        },
        lastUpdate: new Date().toISOString(),
      };

      mockRabbitMQMetricsService.getPayeTonKawaMetrics.mockResolvedValue(expectedMetrics);

      const result = await controller.getRabbitMQMetrics(timeRange);

      expect(result).toEqual(expectedMetrics);
      expect(mockRabbitMQMetricsService.getPayeTonKawaMetrics).toHaveBeenCalledTimes(1);
    });

    it('should handle RabbitMQ service errors', async () => {
      mockRabbitMQMetricsService.getPayeTonKawaMetrics.mockRejectedValue(
        new Error('RabbitMQ connection failed'),
      );

      await expect(controller.getRabbitMQMetrics()).rejects.toThrow(
        'RabbitMQ connection failed',
      );
    });

    it('should handle empty RabbitMQ metrics', async () => {
      const emptyMetrics = {
        totalMessages: 0,
        messagesByQueue: {},
        lastUpdate: new Date().toISOString(),
      };

      mockRabbitMQMetricsService.getPayeTonKawaMetrics.mockResolvedValue(emptyMetrics);

      const result = await controller.getRabbitMQMetrics();

      expect(result.totalMessages).toBe(0);
      expect(Object.keys(result.messagesByQueue)).toHaveLength(0);
    });
  });

  describe('error handling', () => {
    it('should handle metrics service errors gracefully', () => {
      mockMetricsService.getHttpStats.mockImplementation(() => {
        throw new Error('Metrics service error');
      });

      expect(() => controller.getHttpMetrics()).toThrow('Metrics service error');
    });

    it('should propagate async RabbitMQ errors', async () => {
      const error = new Error('RabbitMQ unavailable');
      mockRabbitMQMetricsService.getPayeTonKawaMetrics.mockRejectedValue(error);

      await expect(controller.getRabbitMQMetrics()).rejects.toThrow(error);
    });
  });

  describe('API documentation', () => {
    it('should have proper API tags', () => {
      const tags = Reflect.getMetadata('swagger/apiUseTags', MonitoringController);
      expect(tags).toBeDefined();
    });

    it('should have operation metadata for test endpoint', () => {
      const testOperation = Reflect.getMetadata(
        'swagger/apiOperation',
        controller.testController,
      );
      expect(testOperation).toBeDefined();
    });

    it('should have operation metadata for HTTP metrics endpoint', () => {
      const httpMetricsOperation = Reflect.getMetadata(
        'swagger/apiOperation',
        controller.getHttpMetrics,
      );
      expect(httpMetricsOperation).toBeDefined();
    });

    it('should have operation metadata for RabbitMQ metrics endpoint', () => {
      const rabbitMQMetricsOperation = Reflect.getMetadata(
        'swagger/apiOperation',
        controller.getRabbitMQMetrics,
      );
      expect(rabbitMQMetricsOperation).toBeDefined();
    });
  });

  describe('parameter validation', () => {
    it('should handle valid time range parameters', () => {
      const validTimeRanges = ['5m', '1h', '24h', '7d'];
      
      validTimeRanges.forEach(timeRange => {
        mockMetricsService.getHttpStats.mockReturnValue({
          totalRequests: 100,
          successfulRequests: 95,
          failedRequests: 5,
          averageResponseTime: 100,
        });

        const result = controller.getHttpMetrics(timeRange);
        
        expect(mockMetricsService.getHttpStats).toHaveBeenCalledWith(timeRange);
        expect(result).toBeDefined();

        jest.clearAllMocks();
      });
    });

    it('should handle undefined time range gracefully', () => {
      mockMetricsService.getHttpStats.mockReturnValue({
        totalRequests: 50,
        successfulRequests: 48,
        failedRequests: 2,
        averageResponseTime: 80,
      });

      const result = controller.getHttpMetrics(undefined);

      expect(mockMetricsService.getHttpStats).toHaveBeenCalledWith(undefined);
      expect(result).toBeDefined();
    });
  });

  describe('response format validation', () => {
    it('should return HTTP metrics with required fields', () => {
      const metrics = {
        totalRequests: 100,
        successfulRequests: 95,
        failedRequests: 5,
        averageResponseTime: 120,
        requestsByStatusCode: { '200': 95, '500': 5 },
        requestsByEndpoint: { '/api/test': 100 },
        requestsByService: { 'test-service': 100 },
      };

      mockMetricsService.getHttpStats.mockReturnValue(metrics);

      const result = controller.getHttpMetrics();

      expect(result).toHaveProperty('totalRequests');
      expect(result).toHaveProperty('successfulRequests');
      expect(result).toHaveProperty('failedRequests');
      expect(result).toHaveProperty('averageResponseTime');
      expect(typeof result.totalRequests).toBe('number');
      expect(typeof result.successfulRequests).toBe('number');
      expect(typeof result.failedRequests).toBe('number');
      expect(typeof result.averageResponseTime).toBe('number');
    });

    it('should return RabbitMQ metrics with required structure', async () => {
      const metrics = {
        totalMessages: 100,
        messagesByQueue: {
          'test.queue': {
            sent: 50,
            received: 45,
            inQueue: 5,
            consumers: 1,
          },
        },
        lastUpdate: new Date().toISOString(),
      };

      mockRabbitMQMetricsService.getPayeTonKawaMetrics.mockResolvedValue(metrics);

      const result = await controller.getRabbitMQMetrics();

      expect(result).toHaveProperty('totalMessages');
      expect(result).toHaveProperty('messagesByQueue');
      expect(result).toHaveProperty('lastUpdate');
      expect(typeof result.totalMessages).toBe('number');
      expect(typeof result.messagesByQueue).toBe('object');
      expect(typeof result.lastUpdate).toBe('string');
    });
  });
});
