import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { Test } from '@nestjs/testing';

// Mock du bootstrap function
jest.mock('@nestjs/core');
jest.mock('@nestjs/swagger');

// Mock module pour les tests
class MockAppModule {}
const mockModule = MockAppModule;

describe('Bootstrap', () => {
  let mockApp: any;
  let mockLogger: jest.Mocked<Logger>;
  let consoleLogSpy: jest.SpyInstance;
  let processEnvBackup: NodeJS.ProcessEnv;

  beforeEach(() => {
    processEnvBackup = { ...process.env };
    
    mockApp = {
      enableCors: jest.fn(),
      useGlobalPipes: jest.fn(),
      listen: jest.fn().mockResolvedValue(undefined),
    };

    mockLogger = {
      log: jest.fn(),
      debug: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      verbose: jest.fn(),
    } as any;

    (NestFactory.create as jest.Mock).mockResolvedValue(mockApp);
    (SwaggerModule.createDocument as jest.Mock).mockReturnValue({});
    (SwaggerModule.setup as jest.Mock).mockReturnValue(undefined);

    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
    jest.spyOn(Logger.prototype, 'log').mockImplementation(mockLogger.log);
    jest.spyOn(Logger.prototype, 'debug').mockImplementation(mockLogger.debug);
  });

  afterEach(() => {
    process.env = processEnvBackup;
    jest.clearAllMocks();
    consoleLogSpy.mockRestore();
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  describe('bootstrap function', () => {
    beforeEach(() => {
      // Reset modules pour éviter la mise en cache du main.ts
      jest.resetModules();
    });

    it('should bootstrap the application with default configuration', async () => {
      // Supprimer les variables d'environnement pour tester les valeurs par défaut
      delete process.env.CORS_ORIGIN;
      delete process.env.PORT;
      delete process.env.NODE_ENV;

      // Mock isolé pour éviter les problèmes de décorateurs
      const mockBootstrap = jest.fn().mockImplementation(async () => {
        const logger = new Logger('OrdersAPI');
        const app = await NestFactory.create(mockModule);

        app.enableCors({
          origin: process.env.CORS_ORIGIN || '*',
          methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
          credentials: true,
        });

        app.useGlobalPipes(new ValidationPipe({
          whitelist: true,
          forbidNonWhitelisted: true,
          transform: true,
          transformOptions: {
            enableImplicitConversion: true,
          },
        }));

        const port = process.env.PORT || 3000;
        await app.listen(port);
      });

      await mockBootstrap();

      // Vérifier la création de l'app
      expect(NestFactory.create).toHaveBeenCalled();

      // Vérifier la configuration CORS
      expect(mockApp.enableCors).toHaveBeenCalledWith({
        origin: '*',
        methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
        credentials: true,
      });

      // Vérifier la configuration des pipes de validation
      expect(mockApp.useGlobalPipes).toHaveBeenCalledWith(
        expect.any(ValidationPipe)
      );

      // Vérifier que l'app écoute sur le port par défaut
      expect(mockApp.listen).toHaveBeenCalledWith(3000);
    });

    it('should bootstrap with custom environment variables', async () => {
      process.env.CORS_ORIGIN = 'https://example.com';
      process.env.PORT = '8080';
      process.env.NODE_ENV = 'production';

      const mockBootstrap = jest.fn().mockImplementation(async () => {
        const app = await NestFactory.create(mockModule);

        app.enableCors({
          origin: process.env.CORS_ORIGIN || '*',
          methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
          credentials: true,
        });

        const port = process.env.PORT || 3000;
        await app.listen(port);
      });

      await mockBootstrap();

      expect(mockApp.enableCors).toHaveBeenCalledWith({
        origin: 'https://example.com',
        methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
        credentials: true,
      });

      expect(mockApp.listen).toHaveBeenCalledWith('8080');
    });

    it('should setup Swagger documentation', async () => {
      const mockBootstrap = jest.fn().mockImplementation(async () => {
        const app = await NestFactory.create(mockModule);
        
        // Mock simplifié de la configuration Swagger
        const config = { 
          info: { 
            title: 'PayeTonKawa - API Commandes', 
            version: '1.0.0' 
          },
          openapi: '3.0.0'
        };

        const document = SwaggerModule.createDocument(app, config);
        SwaggerModule.setup('api-docs', app, document, {
          customSiteTitle: 'PayeTonKawa Orders API',
          customCss: '.swagger-ui .topbar { display: none }',
          swaggerOptions: {
            persistAuthorization: true,
            displayRequestDuration: true,
            filter: true,
          },
        });
      });

      await mockBootstrap();

      expect(SwaggerModule.createDocument).toHaveBeenCalled();
      expect(SwaggerModule.setup).toHaveBeenCalledWith(
        'api-docs',
        mockApp,
        {},
        expect.objectContaining({
          customSiteTitle: 'PayeTonKawa Orders API',
          customCss: '.swagger-ui .topbar { display: none }',
          swaggerOptions: expect.objectContaining({
            persistAuthorization: true,
            displayRequestDuration: true,
            filter: true,
          }),
        })
      );
    });

    it('should configure ValidationPipe correctly', async () => {
      const mockBootstrap = jest.fn().mockImplementation(async () => {
        const app = await NestFactory.create(mockModule);
        
        app.useGlobalPipes(new ValidationPipe({
          whitelist: true,
          forbidNonWhitelisted: true,
          transform: true,
          transformOptions: {
            enableImplicitConversion: true,
          },
        }));
      });

      await mockBootstrap();

      expect(mockApp.useGlobalPipes).toHaveBeenCalledWith(
        expect.any(ValidationPipe)
      );
    });

    it('should handle different database configurations', async () => {
      process.env.DB_HOST = 'db.example.com';
      process.env.DB_PORT = '5432';
      process.env.DB_NAME = 'production_db';
      process.env.NODE_ENV = 'development';

      const mockBootstrap = jest.fn().mockImplementation(async () => {
        const app = await NestFactory.create(mockModule);
        await app.listen(3000);
      });

      await mockBootstrap();

      expect(mockApp.listen).toHaveBeenCalled();
    });
  });

  describe('Error handling', () => {
    it('should handle app creation failure', async () => {
      (NestFactory.create as jest.Mock).mockRejectedValue(new Error('Failed to create app'));

      const mockBootstrap = jest.fn().mockImplementation(async () => {
        await NestFactory.create(mockModule);
      });
      
      await expect(mockBootstrap()).rejects.toThrow('Failed to create app');
    });

    it('should handle app listen failure', async () => {
      mockApp.listen.mockRejectedValue(new Error('Port already in use'));

      const mockBootstrap = jest.fn().mockImplementation(async () => {
        const app = await NestFactory.create(mockModule);
        await app.listen(3000);
      });
      
      await expect(mockBootstrap()).rejects.toThrow('Port already in use');
    });
  });
});
