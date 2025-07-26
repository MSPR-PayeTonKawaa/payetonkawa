import { Test, TestingModule } from '@nestjs/testing';
import { AppService } from './app.service';

describe('AppService', () => {
  let service: AppService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AppService],
    }).compile();

    service = module.get<AppService>(AppService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getServiceInfo', () => {
    it('should return service information', () => {
      const result = service.getServiceInfo();
      
      expect(result).toEqual({
        service: 'PayeTonKawa - API Clients',
        version: '1.0.0',
        status: 'running',
        description: 'Microservice de gestion des clients',
        database: {
          type: 'PostgreSQL',
          port: 5433,
          database: 'clients_db',
        },
        endpoints: {
          customers: '/customers',
          health: '/health',
          docs: '/api-docs',
        },
        gateway: 'http://localhost:3000/api/customers',
      });
    });

    it('should return consistent service information', () => {
      const result1 = service.getServiceInfo();
      const result2 = service.getServiceInfo();
      
      expect(result1).toEqual(result2);
    });
  });

  describe('getHealth', () => {
    it('should return health status', () => {
      const result = service.getHealth();
      
      expect(result).toEqual({
        status: 'healthy',
        timestamp: expect.any(String),
        uptime: expect.any(Number),
        version: '1.0.0',
        service: 'clients-api',
        database: 'PostgreSQL:5433/clients_db',
        memory: {
          used: expect.any(Number),
          total: expect.any(Number),
          percentage: expect.any(Number),
        },
      });
    });

    it('should return valid uptime', () => {
      const result = service.getHealth();
      
      expect(typeof result.uptime).toBe('number');
      expect(result.uptime).toBeGreaterThanOrEqual(0);
    });

    it('should return valid timestamp', () => {
      const result = service.getHealth();
      const timestamp = new Date(result.timestamp);
      
      expect(timestamp).toBeInstanceOf(Date);
    });

    it('should return valid memory information', () => {
      const result = service.getHealth();
      
      expect(result.memory.used).toBeGreaterThan(0);
      expect(result.memory.total).toBeGreaterThan(0);
      expect(result.memory.percentage).toBeGreaterThanOrEqual(0);
      expect(result.memory.percentage).toBeLessThanOrEqual(100);
    });
  });

  describe('Service Properties', () => {
    it('should have consistent service properties', () => {
      const info = service.getServiceInfo();
      const health = service.getHealth();
      
      expect(info.version).toBe('1.0.0');
      expect(health.version).toBe('1.0.0');
      expect(health.status).toBe('healthy');
    });

    it('should maintain uptime consistency', () => {
      const health1 = service.getHealth();
      
      // Attendre un petit moment
      setTimeout(() => {
        const health2 = service.getHealth();
        expect(health2.uptime).toBeGreaterThanOrEqual(health1.uptime);
      }, 1);
    });
  });
});
