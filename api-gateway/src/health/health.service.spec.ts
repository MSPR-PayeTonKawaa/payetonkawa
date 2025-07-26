import { Test, TestingModule } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { HealthService } from './health.service';
import axios from 'axios';

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('HealthService', () => {
  let service: HealthService;
  let logger: Logger;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [HealthService],
    }).compile();

    service = module.get<HealthService>(HealthService);
    logger = new Logger(HealthService.name);

    // Reset mocks
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getHealth', () => {
    it('should return basic health information', () => {
      const result = service.getHealth();

      expect(result).toHaveProperty('status', 'healthy');
      expect(result).toHaveProperty('timestamp');
      expect(result).toHaveProperty('uptime');
      expect(result).toHaveProperty('version', '1.0.0');
      expect(result).toHaveProperty('environment');
      expect(result).toHaveProperty('memory');

      // Vérifier la structure de l'objet memory
      expect(result.memory).toHaveProperty('used');
      expect(result.memory).toHaveProperty('total');
      expect(result.memory).toHaveProperty('percentage');

      // Vérifier les types
      expect(typeof result.uptime).toBe('number');
      expect(typeof result.memory.used).toBe('number');
      expect(typeof result.memory.total).toBe('number');
      expect(typeof result.memory.percentage).toBe('number');
    });

    it('should return valid timestamp in ISO format', () => {
      const result = service.getHealth();
      const timestamp = new Date(result.timestamp);

      expect(timestamp.toISOString()).toBe(result.timestamp);
      expect(timestamp.getTime()).toBeGreaterThan(0);
    });

    it('should return positive uptime', () => {
      const result = service.getHealth();

      expect(result.uptime).toBeGreaterThanOrEqual(0);
    });

    it('should return memory usage within reasonable bounds', () => {
      const result = service.getHealth();

      expect(result.memory.used).toBeGreaterThan(0);
      expect(result.memory.total).toBeGreaterThanOrEqual(result.memory.used);
      expect(result.memory.percentage).toBeGreaterThanOrEqual(0);
      expect(result.memory.percentage).toBeLessThanOrEqual(100);
    });

    it('should return consistent data structure across calls', () => {
      const result1 = service.getHealth();
      const result2 = service.getHealth();

      // Vérifier que les propriétés sont les mêmes
      expect(Object.keys(result1).sort()).toEqual(Object.keys(result2).sort());
      expect(Object.keys(result1.memory).sort()).toEqual(
        Object.keys(result2.memory).sort(),
      );

      // L'uptime devrait augmenter entre les appels
      expect(result2.uptime).toBeGreaterThanOrEqual(result1.uptime);
    });
  });

  describe('checkAllServices', () => {
    beforeEach(() => {
      // Setup axios mock
      mockedAxios.get = jest.fn();
    });

    it('should check all microservices successfully', async () => {
      // Mock successful responses for all services
      mockedAxios.get
        .mockResolvedValueOnce({
          status: 200,
          data: { status: 'healthy' },
        })
        .mockResolvedValueOnce({
          status: 200,
          data: { status: 'healthy' },
        })
        .mockResolvedValueOnce({
          status: 200,
          data: { status: 'healthy' },
        });

      const result = await service.checkAllServices();

      expect(result).toHaveProperty('gateway', 'healthy');
      expect(result).toHaveProperty('timestamp');
      expect(result).toHaveProperty('services');

      expect(result.services).toHaveProperty('clients');
      expect(result.services).toHaveProperty('produits');
      expect(result.services).toHaveProperty('commandes');

      expect(result.services['clients']).toHaveProperty('status', 'healthy');
      expect(result.services['produits']).toHaveProperty('status', 'healthy');
      expect(result.services['commandes']).toHaveProperty('status', 'healthy');
    });

    it('should handle service failures gracefully', async () => {
      // Mock one successful and one failed response
      mockedAxios.get
        .mockResolvedValueOnce({
          status: 200,
          data: { status: 'healthy' },
        })
        .mockRejectedValueOnce(new Error('Service unavailable'))
        .mockResolvedValueOnce({
          status: 200,
          data: { status: 'healthy' },
        });

      const result = await service.checkAllServices();

      expect(result.services['clients']).toHaveProperty('status', 'healthy');
      expect(result.services['produits']).toHaveProperty('status', 'unhealthy');
      expect(result.services['commandes']).toHaveProperty('status', 'healthy');

      // Vérifier que le service en erreur a les bonnes informations
      expect(result.services['produits']).toHaveProperty('error');
      expect(result.services['produits']).toHaveProperty('responseTime');
    });

    it('should measure response times', async () => {
      // Mock a delayed response
      mockedAxios.get.mockImplementation(() =>
        new Promise((resolve) =>
          setTimeout(
            () =>
              resolve({
                status: 200,
                data: { status: 'healthy' },
              }),
            50,
          ),
        ),
      );

      const result = await service.checkAllServices();

      // Vérifier que les services HTTP ont un responseTime (clients, produits, commandes)
      const httpServices = ['clients', 'produits', 'commandes'];
      httpServices.forEach(serviceName => {
        const serviceResult = result.services[serviceName];
        if (serviceResult) {
          expect(serviceResult).toHaveProperty('responseTime');
          expect(typeof serviceResult.responseTime).toBe('number');
          expect(serviceResult.responseTime).toBeGreaterThanOrEqual(0);
        }
      });

      // RabbitMQ n'a pas de responseTime mais a d'autres propriétés
      const rabbitMQService = result.services['rabbitmq'];
      if (rabbitMQService) {
        expect(rabbitMQService).toHaveProperty('status');
        expect(rabbitMQService).toHaveProperty('url');
        expect(rabbitMQService).toHaveProperty('lastCheck');
        // RabbitMQ peut avoir managementUrl mais pas responseTime
        expect(rabbitMQService).not.toHaveProperty('responseTime');
      }
    });

    it('should handle timeout errors', async () => {
      // Mock timeout error
      mockedAxios.get.mockRejectedValue({
        code: 'ECONNABORTED',
        message: 'timeout of 5000ms exceeded',
      });

      const result = await service.checkAllServices();

      Object.values(result.services).forEach((service: any) => {
        expect(service.status).toBe('unhealthy');
        expect(service.error).toContain('timeout');
      });
    });

    it('should use correct service URLs', async () => {
      mockedAxios.get.mockResolvedValue({
        status: 200,
        data: { status: 'healthy' },
      });

      await service.checkAllServices();

      expect(mockedAxios.get).toHaveBeenCalledWith(
        'http://localhost:3001/health',
        expect.any(Object),
      );
      expect(mockedAxios.get).toHaveBeenCalledWith(
        'http://localhost:3002/health',
        expect.any(Object),
      );
      expect(mockedAxios.get).toHaveBeenCalledWith(
        'http://localhost:3003/health',
        expect.any(Object),
      );
    });
  });

  describe('error handling', () => {
    it('should handle network errors gracefully in checkAllServices', async () => {
      mockedAxios.get.mockRejectedValue({
        code: 'ECONNREFUSED',
        message: 'Connection refused',
      });

      const result = await service.checkAllServices();

      // Tous les services devraient être unhealthy
      Object.values(result.services).forEach((service: any) => {
        expect(service.status).toBe('unhealthy');
        expect(service.error).toBeDefined();
      });
    });

    it('should handle mixed service statuses', async () => {
      // Premier service OK, deuxième en erreur, troisième OK
      mockedAxios.get
        .mockResolvedValueOnce({
          status: 200,
          data: { status: 'healthy' },
        })
        .mockRejectedValueOnce(new Error('Service down'))
        .mockResolvedValueOnce({
          status: 200,
          data: { status: 'healthy' },
        });

      const result = await service.checkAllServices();

      expect(result.services['clients'].status).toBe('healthy');
      expect(result.services['produits'].status).toBe('unhealthy');
      expect(result.services['commandes'].status).toBe('healthy');
    });
  });
});
