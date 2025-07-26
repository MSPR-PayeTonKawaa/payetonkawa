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

  afterEach(() => {
    // Nettoyer les variables d'environnement
    delete process.env.DB_PORT;
    delete process.env.DB_NAME;
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getServiceInfo', () => {
    it('should return complete service information with default values', () => {
      const result = service.getServiceInfo();

      expect(result).toBeDefined();
      expect(result.service).toBe('PayeTonKawa - API Commandes');
      expect(result.version).toBe('1.0.0');
      expect(result.status).toBe('running');
      expect(result.description).toContain('Microservice de gestion des commandes');
    });

    it('should return database configuration with default values', () => {
      const result = service.getServiceInfo();

      expect(result.database).toBeDefined();
      expect(result.database.type).toBe('PostgreSQL');
      expect(result.database.port).toBe(5435);
      expect(result.database.database).toBe('commandes_db');
    });

    it('should return database configuration with environment variables', () => {
      process.env.DB_PORT = '5555';
      process.env.DB_NAME = 'test_db';

      const result = service.getServiceInfo();

      expect(result.database.port).toBe(5555);
      expect(result.database.database).toBe('test_db');
    });

    it('should return all required endpoints', () => {
      const result = service.getServiceInfo();

      expect(result.endpoints).toBeDefined();
      expect(result.endpoints.orders).toBe('/orders');
      expect(result.endpoints.stats).toBe('/orders/stats');
      expect(result.endpoints.customerOrders).toBe('/orders/customers/:customerId');
      expect(result.endpoints.health).toBe('/health');
      expect(result.endpoints.docs).toBe('/api-docs');
    });

    it('should return gateway URL', () => {
      const result = service.getServiceInfo();

      expect(result.gateway).toBe('http://localhost:3000/api/orders');
    });

    it('should return all features', () => {
      const result = service.getServiceInfo();

      expect(result.features).toBeDefined();
      expect(Array.isArray(result.features)).toBe(true);
      expect(result.features).toContain('Gestion complète du cycle de vie des commandes');
      expect(result.features).toContain('Validation métier et transitions de statut');
      expect(result.features).toContain('Calcul automatique des totaux');
      expect(result.features).toContain('Statistiques et reporting avancés');
      expect(result.features).toContain('Filtrage et recherche multicritères');
      expect(result.features).toContain('Intégration avec les services Clients et Produits');
      expect(result.features).toContain('Événements métier pour synchronisation');
      expect(result.features).toContain('Gestion des workflows de commande');
    });

    it('should maintain consistent structure across calls', () => {
      const result1 = service.getServiceInfo();
      const result2 = service.getServiceInfo();

      expect(result1).toEqual(result2);
    });
  });

  describe('getHealth', () => {
    beforeEach(() => {
      // Mock process.uptime pour des tests consistants
      jest.spyOn(process, 'uptime').mockReturnValue(100);
      jest.spyOn(process, 'memoryUsage').mockReturnValue({
        rss: 50 * 1024 * 1024,
        heapTotal: 30 * 1024 * 1024,
        heapUsed: 20 * 1024 * 1024,
        external: 5 * 1024 * 1024,
        arrayBuffers: 1 * 1024 * 1024,
      });
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('should return health status with basic information', () => {
      const result = service.getHealth();

      expect(result).toBeDefined();
      expect(result.status).toBe('healthy');
      expect(result.version).toBe('1.0.0');
      expect(result.service).toBe('orders-api');
    });

    it('should return timestamp as ISO string', () => {
      const beforeCall = new Date();
      const result = service.getHealth();
      const afterCall = new Date();

      expect(result.timestamp).toBeDefined();
      expect(typeof result.timestamp).toBe('string');
      
      const timestamp = new Date(result.timestamp);
      expect(timestamp).toBeInstanceOf(Date);
      expect(timestamp.getTime()).toBeGreaterThanOrEqual(beforeCall.getTime());
      expect(timestamp.getTime()).toBeLessThanOrEqual(afterCall.getTime());
    });

    it('should return uptime in milliseconds', () => {
      const result = service.getHealth();

      expect(result.uptime).toBe(100000); // 100 seconds * 1000
      expect(typeof result.uptime).toBe('number');
    });

    it('should return database configuration with default values', () => {
      const result = service.getHealth();

      expect(result.database).toBe('PostgreSQL:5435/commandes_db');
    });

    it('should return database configuration with environment variables', () => {
      process.env.DB_PORT = '5678';
      process.env.DB_NAME = 'custom_db';

      const result = service.getHealth();

      expect(result.database).toBe('PostgreSQL:5678/custom_db');
    });

    it('should return memory usage information', () => {
      const result = service.getHealth();

      expect(result.memory).toBeDefined();
      expect(result.memory.used).toBe(20); // 20 MB
      expect(result.memory.total).toBe(30); // 30 MB
      expect(result.memory.percentage).toBe(67); // Math.round((20/30) * 100)
    });

    it('should return all features status', () => {
      const result = service.getHealth();

      expect(result.features).toBeDefined();
      expect(result.features.order_management).toBe('active');
      expect(result.features.status_workflow).toBe('active');
      expect(result.features.statistics).toBe('active');
      expect(result.features.inter_service_communication).toBe('ready');
    });

    it('should calculate memory percentage correctly with different values', () => {
      jest.spyOn(process, 'memoryUsage').mockReturnValue({
        rss: 100 * 1024 * 1024,
        heapTotal: 50 * 1024 * 1024,
        heapUsed: 25 * 1024 * 1024,
        external: 10 * 1024 * 1024,
        arrayBuffers: 2 * 1024 * 1024,
      });

      const result = service.getHealth();

      expect(result.memory.used).toBe(25);
      expect(result.memory.total).toBe(50);
      expect(result.memory.percentage).toBe(50);
    });

    it('should handle edge case with zero uptime', () => {
      jest.spyOn(process, 'uptime').mockReturnValue(0);

      const result = service.getHealth();

      expect(result.uptime).toBe(0);
    });

    it('should handle high memory usage', () => {
      jest.spyOn(process, 'memoryUsage').mockReturnValue({
        rss: 1000 * 1024 * 1024,
        heapTotal: 512 * 1024 * 1024,
        heapUsed: 500 * 1024 * 1024,
        external: 50 * 1024 * 1024,
        arrayBuffers: 10 * 1024 * 1024,
      });

      const result = service.getHealth();

      expect(result.memory.used).toBe(500);
      expect(result.memory.total).toBe(512);
      expect(result.memory.percentage).toBe(98);
    });

    it('should maintain consistent structure across calls', () => {
      const result1 = service.getHealth();
      const result2 = service.getHealth();

      // Ignorer le timestamp pour la comparaison
      const { timestamp: timestamp1, ...rest1 } = result1;
      const { timestamp: timestamp2, ...rest2 } = result2;

      expect(rest1).toEqual(rest2);
    });
  });
});
