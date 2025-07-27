import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { AppService } from './app.service';

describe('AppController', () => {
  let appController: AppController;
  let appService: AppService;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [AppService],
    }).compile();

    appController = app.get<AppController>(AppController);
    appService = app.get<AppService>(AppService);
  });

  describe('getServiceInfo', () => {
    it('should return service info with correct structure', () => {
      const result = appController.getServiceInfo();
      
      expect(result).toHaveProperty('service', 'PayeTonKawa - API Produits');
      expect(result).toHaveProperty('version', '1.0.0');
      expect(result).toHaveProperty('status', 'running');
      expect(result).toHaveProperty('description');
      expect(result).toHaveProperty('database');
      expect(result).toHaveProperty('endpoints');
      expect(result).toHaveProperty('gateway');
      expect(result).toHaveProperty('features');
      
      expect(result.database).toHaveProperty('type', 'PostgreSQL');
      expect(result.database).toHaveProperty('port', 5434);
      expect(result.database).toHaveProperty('database', 'products_db');
      
      expect(Array.isArray(result.features)).toBe(true);
      expect(result.features.length).toBeGreaterThan(0);
    });
  });

  describe('getHealth', () => {
    it('should return health check with correct structure', () => {
      const result = appController.getHealth();
      
      expect(result).toHaveProperty('status', 'healthy');
      expect(result).toHaveProperty('timestamp');
      expect(result).toHaveProperty('uptime');
      expect(result).toHaveProperty('version', '1.0.0');
      expect(result).toHaveProperty('service', 'products-api');
      expect(result).toHaveProperty('database', 'PostgreSQL:5434/products_db');
      expect(result).toHaveProperty('memory');
      expect(result).toHaveProperty('features');
      
      expect(result.memory).toHaveProperty('used');
      expect(result.memory).toHaveProperty('total');
      expect(result.memory).toHaveProperty('percentage');
      
      expect(typeof result.uptime).toBe('number');
      expect(result.uptime).toBeGreaterThanOrEqual(0);
      expect(typeof result.memory.used).toBe('number');
      expect(typeof result.memory.total).toBe('number');
      expect(typeof result.memory.percentage).toBe('number');
    });

    it('should return valid timestamp format', () => {
      const result = appController.getHealth();
      const timestamp = new Date(result.timestamp);
      
      expect(timestamp).toBeInstanceOf(Date);
      expect(timestamp.getTime()).not.toBeNaN();
    });
  });
});
