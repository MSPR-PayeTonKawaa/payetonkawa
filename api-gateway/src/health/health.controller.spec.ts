import { Test, TestingModule } from '@nestjs/testing';
import { HealthController } from './health.controller';
import { HealthService } from './health.service';

describe('HealthController', () => {
  let controller: HealthController;
  let healthService: HealthService;

  const mockHealthService = {
    getHealth: jest.fn(),
    checkAllServices: jest.fn(),
    getMetrics: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        {
          provide: HealthService,
          useValue: mockHealthService,
        },
      ],
    }).compile();

    controller = module.get<HealthController>(HealthController);
    healthService = module.get<HealthService>(HealthService);

    // Reset mocks before each test
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getHealth', () => {
    it('should return health status from service', async () => {
      const expectedHealth = {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: 12345,
        version: '1.0.0',
        environment: 'test',
        memory: {
          used: 50,
          total: 100,
          percentage: 50,
        },
      };

      mockHealthService.getHealth.mockReturnValue(expectedHealth);

      const result = controller.getHealth();

      expect(result).toEqual(expectedHealth);
      expect(mockHealthService.getHealth).toHaveBeenCalledTimes(1);
    });

    it('should return consistent health structure', () => {
      const healthData = {
        status: 'healthy',
        timestamp: '2024-01-01T00:00:00.000Z',
        uptime: 5000,
        version: '1.0.0',
        environment: 'development',
        memory: {
          used: 25,
          total: 80,
          percentage: 31,
        },
      };

      mockHealthService.getHealth.mockReturnValue(healthData);

      const result = controller.getHealth();

      expect(result).toHaveProperty('status');
      expect(result).toHaveProperty('timestamp');
      expect(result).toHaveProperty('uptime');
      expect(result).toHaveProperty('version');
      expect(result).toHaveProperty('memory');
      expect(result.memory).toHaveProperty('used');
      expect(result.memory).toHaveProperty('total');
      expect(result.memory).toHaveProperty('percentage');
    });

    it('should handle different health statuses', () => {
      const degradedHealth = {
        status: 'degraded',
        timestamp: new Date().toISOString(),
        uptime: 1000,
        version: '1.0.0',
        environment: 'production',
        memory: {
          used: 90,
          total: 100,
          percentage: 90,
        },
        warnings: ['High memory usage'],
      };

      mockHealthService.getHealth.mockReturnValue(degradedHealth);

      const result = controller.getHealth();

      expect(result.status).toBe('degraded');
      expect(result).toHaveProperty('warnings');
    });
  });

  describe('getServicesHealth', () => {
    it('should return status of all microservices', async () => {
      const expectedServicesHealth = {
        gateway: 'healthy',
        timestamp: new Date().toISOString(),
        services: {
          clients: {
            status: 'healthy',
            responseTime: 50,
            lastChecked: new Date().toISOString(),
          },
          produits: {
            status: 'healthy',
            responseTime: 75,
            lastChecked: new Date().toISOString(),
          },
          commandes: {
            status: 'healthy',
            responseTime: 60,
            lastChecked: new Date().toISOString(),
          },
        },
      };

      mockHealthService.checkAllServices.mockResolvedValue(expectedServicesHealth);

      const result = await controller.getServicesHealth();

      expect(result).toEqual(expectedServicesHealth);
      expect(mockHealthService.checkAllServices).toHaveBeenCalledTimes(1);
    });

    it('should handle mixed service statuses', async () => {
      const mixedServicesHealth = {
        gateway: 'healthy',
        timestamp: new Date().toISOString(),
        services: {
          clients: {
            status: 'healthy',
            responseTime: 45,
            lastChecked: new Date().toISOString(),
          },
          produits: {
            status: 'unhealthy',
            error: 'Connection timeout',
            responseTime: 5000,
            lastChecked: new Date().toISOString(),
          },
          commandes: {
            status: 'healthy',
            responseTime: 55,
            lastChecked: new Date().toISOString(),
          },
        },
      };

      mockHealthService.checkAllServices.mockResolvedValue(mixedServicesHealth);

      const result = await controller.getServicesHealth();

      expect(result.services['clients'].status).toBe('healthy');
      expect(result.services['produits'].status).toBe('unhealthy');
      expect(result.services['commandes'].status).toBe('healthy');
      expect(result.services['produits']).toHaveProperty('error');
    });

    it('should handle service check failures', async () => {
      const failedServicesHealth = {
        gateway: 'healthy',
        timestamp: new Date().toISOString(),
        services: {
          clients: {
            status: 'unhealthy',
            error: 'Service unavailable',
            responseTime: 0,
            lastChecked: new Date().toISOString(),
          },
          produits: {
            status: 'unhealthy',
            error: 'Connection refused',
            responseTime: 0,
            lastChecked: new Date().toISOString(),
          },
          commandes: {
            status: 'unhealthy',
            error: 'Timeout',
            responseTime: 5000,
            lastChecked: new Date().toISOString(),
          },
        },
      };

      mockHealthService.checkAllServices.mockResolvedValue(failedServicesHealth);

      const result = await controller.getServicesHealth();

      Object.values(result.services).forEach((service: any) => {
        expect(service.status).toBe('unhealthy');
        expect(service).toHaveProperty('error');
        expect(service).toHaveProperty('responseTime');
      });
    });

    it('should include response times for all services', async () => {
      const servicesWithTiming = {
        gateway: 'healthy',
        timestamp: new Date().toISOString(),
        services: {
          clients: {
            status: 'healthy',
            responseTime: 123,
            lastChecked: new Date().toISOString(),
          },
          produits: {
            status: 'healthy',
            responseTime: 456,
            lastChecked: new Date().toISOString(),
          },
          commandes: {
            status: 'healthy',
            responseTime: 789,
            lastChecked: new Date().toISOString(),
          },
        },
      };

      mockHealthService.checkAllServices.mockResolvedValue(servicesWithTiming);

      const result = await controller.getServicesHealth();

      Object.values(result.services).forEach((service: any) => {
        expect(service).toHaveProperty('responseTime');
        expect(typeof service.responseTime).toBe('number');
        expect(service.responseTime).toBeGreaterThanOrEqual(0);
      });
    });
  });

  describe('error handling', () => {
    it('should handle service errors gracefully', async () => {
      mockHealthService.checkAllServices.mockRejectedValue(
        new Error('Service unavailable'),
      );

      await expect(controller.getServicesHealth()).rejects.toThrow(
        'Service unavailable',
      );
    });

    it('should handle health service failures', () => {
      mockHealthService.getHealth.mockImplementation(() => {
        throw new Error('Health service error');
      });

      expect(() => controller.getHealth()).toThrow('Health service error');
    });
  });

  describe('getMetrics', () => {
    it('should return metrics from service', () => {
      const expectedMetrics = {
        uptime: 12345,
        timestamp: new Date().toISOString(),
        memory: {
          used: 512,
          total: 1024,
          percentage: 50,
          rss: 600,
          external: 50,
        },
        process: {
          pid: 1234,
          nodeVersion: 'v18.17.0',
          platform: 'win32',
          arch: 'x64',
        },
        environment: {
          nodeEnv: 'test',
          port: 3000,
        },
      };

      mockHealthService.getMetrics.mockReturnValue(expectedMetrics);

      const result = controller.getMetrics();

      expect(result).toEqual(expectedMetrics);
      expect(mockHealthService.getMetrics).toHaveBeenCalledTimes(1);
    });

    it('should return metrics with proper structure', () => {
      const metricsData = {
        uptime: 5000,
        timestamp: new Date().toISOString(),
        memory: {
          used: 256,
          total: 512,
          percentage: 50,
          rss: 300,
          external: 25,
        },
        process: {
          pid: 5678,
          nodeVersion: 'v18.17.0',
          platform: 'linux',
          arch: 'x64',
        },
        environment: {
          nodeEnv: 'development',
          port: 3001,
        },
      };

      mockHealthService.getMetrics.mockReturnValue(metricsData);

      const result = controller.getMetrics();

      expect(result).toHaveProperty('uptime');
      expect(result).toHaveProperty('timestamp');
      expect(result).toHaveProperty('memory');
      expect(result).toHaveProperty('process');
      expect(result).toHaveProperty('environment');
      expect(result.memory).toHaveProperty('used');
      expect(result.memory).toHaveProperty('total');
      expect(result.memory).toHaveProperty('percentage');
      expect(result.memory).toHaveProperty('rss');
      expect(result.memory).toHaveProperty('external');
      expect(result.process).toHaveProperty('pid');
      expect(result.process).toHaveProperty('nodeVersion');
      expect(result.process).toHaveProperty('platform');
      expect(result.process).toHaveProperty('arch');
      expect(result.environment).toHaveProperty('nodeEnv');
      expect(result.environment).toHaveProperty('port');
    });

    it('should handle high memory usage metrics', () => {
      const highMemoryMetrics = {
        uptime: 86400000, // 24 hours
        timestamp: new Date().toISOString(),
        memory: {
          used: 950,
          total: 1024,
          percentage: 92,
          rss: 1000,
          external: 100,
        },
        process: {
          pid: 9999,
          nodeVersion: 'v18.17.0',
          platform: 'win32',
          arch: 'x64',
        },
        environment: {
          nodeEnv: 'production',
          port: 8080,
        },
      };

      mockHealthService.getMetrics.mockReturnValue(highMemoryMetrics);

      const result = controller.getMetrics();

      expect(result.memory.percentage).toBeGreaterThan(90);
      expect(result.uptime).toBeGreaterThan(86000000);
      expect(result.environment.nodeEnv).toBe('production');
    });

    it('should handle metrics service errors', () => {
      mockHealthService.getMetrics.mockImplementation(() => {
        throw new Error('Metrics collection failed');
      });

      expect(() => controller.getMetrics()).toThrow('Metrics collection failed');
    });
  });

  describe('API documentation', () => {
    it('should have proper API tags', () => {
      const tags = Reflect.getMetadata('swagger/apiUseTags', HealthController);
      expect(tags).toBeDefined();
    });

    it('should have operation metadata for health endpoint', () => {
      const healthOperation = Reflect.getMetadata(
        'swagger/apiOperation',
        controller.getHealth,
      );
      expect(healthOperation).toBeDefined();
    });

    it('should have operation metadata for services endpoint', () => {
      const servicesOperation = Reflect.getMetadata(
        'swagger/apiOperation',
        controller.getServicesHealth,
      );
      expect(servicesOperation).toBeDefined();
    });

    it('should have operation metadata for metrics endpoint', () => {
      const metricsOperation = Reflect.getMetadata(
        'swagger/apiOperation',
        controller.getMetrics,
      );
      expect(metricsOperation).toBeDefined();
    });
  });

  describe('response format validation', () => {
    it('should return health data with required fields', () => {
      const minimalHealth = {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: 0,
        version: '1.0.0',
        environment: 'test',
        memory: {
          used: 10,
          total: 20,
          percentage: 50,
        },
      };

      mockHealthService.getHealth.mockReturnValue(minimalHealth);

      const result = controller.getHealth();

      // Vérifier les champs obligatoires
      expect(result).toHaveProperty('status');
      expect(result).toHaveProperty('timestamp');
      expect(result).toHaveProperty('uptime');
      expect(result).toHaveProperty('version');
    });

    it('should return services health with required structure', async () => {
      const servicesHealth = {
        gateway: 'healthy',
        timestamp: new Date().toISOString(),
        services: {
          clients: {
            status: 'healthy',
            responseTime: 100,
            lastChecked: new Date().toISOString(),
          },
        },
      };

      mockHealthService.checkAllServices.mockResolvedValue(servicesHealth);

      const result = await controller.getServicesHealth();

      expect(result).toHaveProperty('gateway');
      expect(result).toHaveProperty('timestamp');
      expect(result).toHaveProperty('services');
      expect(typeof result.services).toBe('object');
    });
  });
});
