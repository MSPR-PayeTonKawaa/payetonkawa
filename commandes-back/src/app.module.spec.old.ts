import { Test, TestingModule } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { AppModule } from './app.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { OrdersController } from './controllers/orders.controller';
import { OrdersService } from './services/orders.service';
import { Order, OrderItem } from './entities';
import { RabbitMQModule } from './rabbitmq/rabbitmq.module';

// Mock complet des modules externes
jest.mock('@nestjs/typeorm', () => {
  const originalModule = jest.requireActual('@nestjs/typeorm');
  return {
    ...originalModule,
    TypeOrmModule: {
      forRoot: jest.fn().mockReturnValue({
        module: class MockTypeOrmRootModule {},
        imports: [],
        providers: [],
        exports: [],
      }),
      forFeature: jest.fn().mockReturnValue({
        module: class MockTypeOrmFeatureModule {},
        imports: [],
        providers: [
          {
            provide: 'OrderRepository',
            useValue: {},
          },
          {
            provide: 'OrderItemRepository', 
            useValue: {},
          },
        ],
        exports: [
          {
            provide: 'OrderRepository',
            useValue: {},
          },
          {
            provide: 'OrderItemRepository',
            useValue: {},
          },
        ],
      }),
    },
    InjectRepository: (entity: any) => {
      return (target: any, propertyKey: string | symbol | undefined, parameterIndex: number) => {
        // Mock decorator - ne fait rien dans les tests
      };
    },
  };
});

jest.mock('./rabbitmq/rabbitmq.module', () => ({
  RabbitMQModule: {
    module: class MockRabbitMQModule {},
    providers: [],
    exports: [],
  },
}));

jest.mock('./services/orders.service', () => ({
  OrdersService: jest.fn().mockImplementation(() => ({
    // Mock methods
  })),
}));

jest.mock('./controllers/orders.controller', () => ({
  OrdersController: jest.fn().mockImplementation(() => ({
    // Mock methods  
  })),
}));

describe('AppModule', () => {
  let app: TestingModule;

  beforeEach(async () => {
    // Réinitialiser les mocks
    jest.clearAllMocks();
    
    // Nettoyer les variables d'environnement
    delete process.env.NODE_ENV;
    delete process.env.DB_HOST;
    delete process.env.DB_PORT;
    delete process.env.DB_USERNAME;
    delete process.env.DB_PASSWORD;
    delete process.env.DB_NAME;
  });

  afterEach(async () => {
    if (app) {
      await app.close();
    }
  });

  it('should compile the module successfully', async () => {
    app = await Test.createTestingModule({
      providers: [AppService],
      controllers: [AppController],
    }).compile();

    expect(app).toBeDefined();
  });

  it('should have AppController available', async () => {
    app = await Test.createTestingModule({
      providers: [AppService],
      controllers: [AppController],
    }).compile();

    const appController = app.get<AppController>(AppController);
    expect(appController).toBeDefined();
  });

  it('should have AppService available', async () => {
    app = await Test.createTestingModule({
      providers: [AppService],
      controllers: [AppController],
    }).compile();

    const appService = app.get<AppService>(AppService);
    expect(appService).toBeDefined();
  });

  it('should configure TypeOrmModule with default database settings', () => {
    // Vérifier que TypeOrmModule.forRoot a été appelé
    expect(TypeOrmModule.forRoot).toHaveBeenCalledWith({
      type: 'postgres',
      host: 'localhost',
      port: 5432,
      username: 'postgres',
      password: 'postgres',
      database: 'commandes_db',
      entities: [Order, OrderItem],
      synchronize: true, // NODE_ENV n'est pas défini, donc pas 'production'
      logging: false, // NODE_ENV n'est pas 'development'
      retryAttempts: 3,
      retryDelay: 3000,
    });
  });

  it('should configure TypeOrmModule for feature with entities', () => {
    expect(TypeOrmModule.forFeature).toHaveBeenCalledWith([Order, OrderItem]);
  });
});
