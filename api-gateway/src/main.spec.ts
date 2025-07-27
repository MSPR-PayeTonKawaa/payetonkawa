import { Test } from '@nestjs/testing';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

// Mock des modules externes
jest.mock('@nestjs/core', () => ({
  NestFactory: {
    create: jest.fn(),
  },
}));

jest.mock('@nestjs/swagger', () => ({
  DocumentBuilder: jest.fn().mockReturnValue({
    setTitle: jest.fn().mockReturnThis(),
    setDescription: jest.fn().mockReturnThis(),
    setVersion: jest.fn().mockReturnThis(),
    addBearerAuth: jest.fn().mockReturnThis(),
    addTag: jest.fn().mockReturnThis(),
    addServer: jest.fn().mockReturnThis(),
    build: jest.fn().mockReturnValue({}),
  }),
  SwaggerModule: {
    createDocument: jest.fn().mockReturnValue({}),
    setup: jest.fn(),
  },
}));

jest.mock('helmet', () => jest.fn(() => jest.fn()));
jest.mock('compression', () => jest.fn(() => jest.fn()));
jest.mock('cors', () => jest.fn(() => jest.fn()));

describe('Main Bootstrap', () => {
  let mockApp: any;
  let mockLogger: any;
  let consoleLogSpy: jest.SpyInstance;

  beforeEach(() => {
    // Mock de l'application NestJS
    mockApp = {
      use: jest.fn(),
      useGlobalPipes: jest.fn(),
      listen: jest.fn().mockResolvedValue(undefined),
    };

    // Mock du logger
    mockLogger = {
      log: jest.fn(),
    };

    // Mock NestFactory.create
    (NestFactory.create as jest.Mock).mockResolvedValue(mockApp);

    // Mock console.log pour capturer les logs
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();

    // Mock process.env
    process.env.NODE_ENV = 'test';
    process.env.PORT = '3000';
  });

  afterEach(() => {
    jest.clearAllMocks();
    consoleLogSpy.mockRestore();
    delete process.env.NODE_ENV;
    delete process.env.PORT;
  });

  it('should bootstrap the application successfully', async () => {
    // Import et exécution de main.ts
    const bootstrap = require('./main');
    
    // Vérifications
    expect(NestFactory.create).toHaveBeenCalledWith(AppModule);
  });

  it('should configure security middlewares', async () => {
    // Import de main.ts pour déclencher le bootstrap
    require('./main');
    
    // Attendre que les appels asynchrones se terminent
    await new Promise(resolve => setImmediate(resolve));
    
    // Vérifier que les middlewares de sécurité sont configurés
    expect(mockApp.use).toHaveBeenCalled();
  });

  it('should configure CORS for development environment', async () => {
    process.env.NODE_ENV = 'development';
    
    // Re-require pour obtenir les nouvelles variables d'environnement
    delete require.cache[require.resolve('./main')];
    require('./main');
    
    await new Promise(resolve => setImmediate(resolve));
    
    expect(mockApp.use).toHaveBeenCalled();
  });

  it('should configure CORS for production environment', async () => {
    process.env.NODE_ENV = 'production';
    
    delete require.cache[require.resolve('./main')];
    require('./main');
    
    await new Promise(resolve => setImmediate(resolve));
    
    expect(mockApp.use).toHaveBeenCalled();
  });

  it('should configure global validation pipe', async () => {
    require('./main');
    
    await new Promise(resolve => setImmediate(resolve));
    
    expect(mockApp.useGlobalPipes).toHaveBeenCalled();
  });

  it('should configure Swagger documentation', async () => {
    const { DocumentBuilder, SwaggerModule } = require('@nestjs/swagger');
    
    require('./main');
    
    await new Promise(resolve => setImmediate(resolve));
    
    expect(DocumentBuilder).toHaveBeenCalled();
    expect(SwaggerModule.createDocument).toHaveBeenCalled();
    expect(SwaggerModule.setup).toHaveBeenCalledWith(
      'api-docs',
      mockApp,
      {},
      expect.any(Object)
    );
  });

  it('should start the application on the correct port', async () => {
    process.env.PORT = '4000';
    
    delete require.cache[require.resolve('./main')];
    require('./main');
    
    await new Promise(resolve => setImmediate(resolve));
    
    expect(mockApp.listen).toHaveBeenCalledWith('4000');
  });

  it('should use default port 3000 when PORT is not set', async () => {
    delete process.env.PORT;
    
    delete require.cache[require.resolve('./main')];
    require('./main');
    
    await new Promise(resolve => setImmediate(resolve));
    
    expect(mockApp.listen).toHaveBeenCalledWith(3000);
  });

  it('should handle application startup errors', async () => {
    const error = new Error('Bootstrap failed');
    (NestFactory.create as jest.Mock).mockRejectedValue(error);
    
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
    
    try {
      delete require.cache[require.resolve('./main')];
      require('./main');
      
      await new Promise(resolve => setImmediate(resolve));
    } catch (e) {
      // Expected to fail
    }
    
    consoleSpy.mockRestore();
  });

  it('should configure Swagger with correct options', async () => {
    const { SwaggerModule } = require('@nestjs/swagger');
    
    require('./main');
    
    await new Promise(resolve => setImmediate(resolve));
    
    expect(SwaggerModule.setup).toHaveBeenCalledWith(
      'api-docs',
      mockApp,
      {},
      expect.objectContaining({
        swaggerOptions: expect.objectContaining({
          persistAuthorization: true,
          displayRequestDuration: true,
          filter: true,
          showRequestHeaders: true,
        }),
        customSiteTitle: 'PayeTonKawa API Documentation',
      })
    );
  });

  it('should configure DocumentBuilder with all required settings', async () => {
    const { DocumentBuilder } = require('@nestjs/swagger');
    const mockBuilder = DocumentBuilder();
    
    require('./main');
    
    await new Promise(resolve => setImmediate(resolve));
    
    expect(mockBuilder.setTitle).toHaveBeenCalledWith('PayeTonKawa API Gateway');
    expect(mockBuilder.setVersion).toHaveBeenCalledWith('1.0.0');
    expect(mockBuilder.addBearerAuth).toHaveBeenCalled();
    expect(mockBuilder.addTag).toHaveBeenCalledWith('🔐 Authentication', 'Endpoints d\'authentification');
    expect(mockBuilder.addTag).toHaveBeenCalledWith('🧑‍💼 Clients', 'Gestion des clients et entreprises');
    expect(mockBuilder.addTag).toHaveBeenCalledWith('📦 Produits', 'Catalogue produits et stocks');
    expect(mockBuilder.addTag).toHaveBeenCalledWith('🛒 Commandes', 'Gestion des commandes');
    expect(mockBuilder.addTag).toHaveBeenCalledWith('📊 Monitoring', 'Health checks et métriques');
    expect(mockBuilder.addServer).toHaveBeenCalledWith('http://localhost:3000', 'Environnement de développement');
    expect(mockBuilder.addServer).toHaveBeenCalledWith('https://api.payetonkawa.fr', 'Environnement de production');
  });

  it('should configure validation pipe with correct options', async () => {
    require('./main');
    
    await new Promise(resolve => setImmediate(resolve));
    
    const [validationPipe] = (mockApp.useGlobalPipes as jest.Mock).mock.calls[0];
    expect(validationPipe).toBeDefined();
  });
});
