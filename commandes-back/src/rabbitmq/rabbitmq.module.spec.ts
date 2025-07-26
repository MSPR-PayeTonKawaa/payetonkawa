import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { RabbitMQModule } from './rabbitmq.module';
import { RabbitMQService } from './rabbitmq.service';
import { OrderEventPublisher } from './publishers/order-event.publisher';
import { ProductEventSubscriber } from './subscribers/product-event.subscriber';
import { CustomerEventSubscriber } from './subscribers/customer-event.subscriber';

// Mock des dépendances externes
jest.mock('amqp-connection-manager', () => ({
  connect: jest.fn().mockReturnValue({
    on: jest.fn(),
    close: jest.fn(),
    createChannel: jest.fn().mockReturnValue({
      publish: jest.fn(),
      addSetup: jest.fn(),
    }),
  }),
}));

describe('RabbitMQModule', () => {
  let module: TestingModule;

  beforeEach(async () => {
    module = await Test.createTestingModule({
      imports: [RabbitMQModule],
    }).compile();
  });

  afterEach(async () => {
    if (module) {
      await module.close();
    }
  });

  it('should compile the module successfully', () => {
    expect(module).toBeDefined();
  });

  describe('Providers', () => {
    it('should provide RabbitMQService', () => {
      const service = module.get<RabbitMQService>(RabbitMQService);
      expect(service).toBeDefined();
      expect(service).toBeInstanceOf(RabbitMQService);
    });

    it('should provide OrderEventPublisher', () => {
      const publisher = module.get<OrderEventPublisher>(OrderEventPublisher);
      expect(publisher).toBeDefined();
      expect(publisher).toBeInstanceOf(OrderEventPublisher);
    });

    it('should provide ProductEventSubscriber', () => {
      const subscriber = module.get<ProductEventSubscriber>(ProductEventSubscriber);
      expect(subscriber).toBeDefined();
      expect(subscriber).toBeInstanceOf(ProductEventSubscriber);
    });

    it('should provide CustomerEventSubscriber', () => {
      const subscriber = module.get<CustomerEventSubscriber>(CustomerEventSubscriber);
      expect(subscriber).toBeDefined();
      expect(subscriber).toBeInstanceOf(CustomerEventSubscriber);
    });
  });

  describe('Exports', () => {
    it('should export RabbitMQService', () => {
      const service = module.get<RabbitMQService>(RabbitMQService);
      expect(service).toBeDefined();
    });

    it('should export OrderEventPublisher', () => {
      const publisher = module.get<OrderEventPublisher>(OrderEventPublisher);
      expect(publisher).toBeDefined();
    });

    it('should export ProductEventSubscriber', () => {
      const subscriber = module.get<ProductEventSubscriber>(ProductEventSubscriber);
      expect(subscriber).toBeDefined();
    });

    it('should export CustomerEventSubscriber', () => {
      const subscriber = module.get<CustomerEventSubscriber>(CustomerEventSubscriber);
      expect(subscriber).toBeDefined();
    });
  });

  describe('Dependencies', () => {
    it('should inject RabbitMQService into OrderEventPublisher', () => {
      const publisher = module.get<OrderEventPublisher>(OrderEventPublisher);
      expect(publisher).toBeDefined();
      
      // Vérifier que le service est injecté (accès via propriété privée)
      expect((publisher as any).rabbitMQService).toBeInstanceOf(RabbitMQService);
    });

    it('should inject RabbitMQService into ProductEventSubscriber', () => {
      const subscriber = module.get<ProductEventSubscriber>(ProductEventSubscriber);
      expect(subscriber).toBeDefined();
      
      // Vérifier que le service est injecté
      expect((subscriber as any).rabbitMQService).toBeInstanceOf(RabbitMQService);
    });

    it('should inject RabbitMQService into CustomerEventSubscriber', () => {
      const subscriber = module.get<CustomerEventSubscriber>(CustomerEventSubscriber);
      expect(subscriber).toBeDefined();
      
      // Vérifier que le service est injecté
      expect((subscriber as any).rabbitMQService).toBeInstanceOf(RabbitMQService);
    });
  });

  describe('Module Structure', () => {
    it('should have correct module imports', async () => {
      // Tester que le module peut être créé avec ses imports
      const testModule = await Test.createTestingModule({
        imports: [RabbitMQModule],
      }).compile();

      expect(testModule).toBeDefined();
      await testModule.close();
    });

    it('should provide all required services for messaging', () => {
      const rabbitMQService = module.get<RabbitMQService>(RabbitMQService);
      const orderPublisher = module.get<OrderEventPublisher>(OrderEventPublisher);
      const productSubscriber = module.get<ProductEventSubscriber>(ProductEventSubscriber);
      const customerSubscriber = module.get<CustomerEventSubscriber>(CustomerEventSubscriber);

      expect(rabbitMQService).toBeDefined();
      expect(orderPublisher).toBeDefined();
      expect(productSubscriber).toBeDefined();
      expect(customerSubscriber).toBeDefined();
    });

    it('should be usable as an imported module', async () => {
      const testModule = await Test.createTestingModule({
        imports: [RabbitMQModule],
        providers: [
          // Un service qui dépend des exports du RabbitMQModule
          {
            provide: 'TestService',
            useFactory: (
              rabbitMQService: RabbitMQService,
              orderPublisher: OrderEventPublisher
            ) => {
              return {
                rabbitMQService,
                orderPublisher,
              };
            },
            inject: [RabbitMQService, OrderEventPublisher],
          },
        ],
      }).compile();

      const testService = testModule.get('TestService');
      expect(testService).toBeDefined();
      expect(testService.rabbitMQService).toBeInstanceOf(RabbitMQService);
      expect(testService.orderPublisher).toBeInstanceOf(OrderEventPublisher);

      await testModule.close();
    });
  });

  describe('Lifecycle', () => {
    it('should initialize RabbitMQService on module init', async () => {
      const rabbitMQService = module.get<RabbitMQService>(RabbitMQService);
      const onModuleInitSpy = jest.spyOn(rabbitMQService, 'onModuleInit');

      await module.init();

      expect(onModuleInitSpy).toHaveBeenCalled();
    });

    it('should cleanup RabbitMQService on module destroy', async () => {
      const rabbitMQService = module.get<RabbitMQService>(RabbitMQService);
      const onModuleDestroySpy = jest.spyOn(rabbitMQService, 'onModuleDestroy').mockResolvedValue();

      await module.close();

      expect(onModuleDestroySpy).toHaveBeenCalled();
    });
  });
});
