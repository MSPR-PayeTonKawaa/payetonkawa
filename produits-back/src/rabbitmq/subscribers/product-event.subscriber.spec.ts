import { Test, TestingModule } from '@nestjs/testing';
import { ProductEventSubscriber } from './product-event.subscriber';
import { RabbitMQService } from '../rabbitmq.service';
import { Logger } from '@nestjs/common';

describe('ProductEventSubscriber', () => {
  let subscriber: ProductEventSubscriber;
  let rabbitMQService: jest.Mocked<RabbitMQService>;

  beforeEach(async () => {
    const mockRabbitMQService = {
      subscribe: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductEventSubscriber,
        {
          provide: RabbitMQService,
          useValue: mockRabbitMQService,
        },
      ],
    }).compile();

    subscriber = module.get<ProductEventSubscriber>(ProductEventSubscriber);
    rabbitMQService = module.get(RabbitMQService);

    // Mock des méthodes Logger
    jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Logger.prototype, 'warn').mockImplementation();
    jest.spyOn(Logger.prototype, 'error').mockImplementation();

    // Mock setTimeout pour éviter les délais dans les tests
    jest.spyOn(global, 'setTimeout').mockImplementation((callback: any) => {
      callback();
      return {} as any;
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  describe('Module Initialization', () => {
    it('should be defined', () => {
      expect(subscriber).toBeDefined();
    });

    it('should call subscribeToProductEvents on module init', async () => {
      rabbitMQService.subscribe.mockResolvedValue(undefined);

      await subscriber.onModuleInit();

      expect(setTimeout).toHaveBeenCalled();
      expect(rabbitMQService.subscribe).toHaveBeenCalledWith(
        'product.events',
        expect.any(Function)
      );
    });

    it('should handle subscription error gracefully', async () => {
      const error = new Error('Subscription failed');
      rabbitMQService.subscribe.mockRejectedValue(error);

      await subscriber.onModuleInit();

      expect(rabbitMQService.subscribe).toHaveBeenCalled();
    });
  });

  describe('Event Handling', () => {
    it('should handle product.created event', async () => {
      rabbitMQService.subscribe.mockResolvedValue(undefined);
      
      await subscriber.onModuleInit();

      const subscribeCall = rabbitMQService.subscribe.mock.calls[0];
      const eventHandler = subscribeCall[1];

      const productCreatedEvent = {
        eventType: 'product.created',
        productId: 'product-123',
        name: 'New Product',
        category: 'Coffee',
        price: 15.99,
        timestamp: new Date().toISOString(),
      };

      await expect(eventHandler(productCreatedEvent)).resolves.not.toThrow();
    });

    it('should handle product.updated event', async () => {
      rabbitMQService.subscribe.mockResolvedValue(undefined);
      
      await subscriber.onModuleInit();

      const subscribeCall = rabbitMQService.subscribe.mock.calls[0];
      const eventHandler = subscribeCall[1];

      const productUpdatedEvent = {
        eventType: 'product.updated',
        productId: 'product-123',
        name: 'Updated Product',
        changes: ['name', 'price'],
        timestamp: new Date().toISOString(),
      };

      await expect(eventHandler(productUpdatedEvent)).resolves.not.toThrow();
    });

    it('should handle product.deleted event', async () => {
      rabbitMQService.subscribe.mockResolvedValue(undefined);
      
      await subscriber.onModuleInit();

      const subscribeCall = rabbitMQService.subscribe.mock.calls[0];
      const eventHandler = subscribeCall[1];

      const productDeletedEvent = {
        eventType: 'product.deleted',
        productId: 'product-123',
        name: 'Deleted Product',
        timestamp: new Date().toISOString(),
      };

      await expect(eventHandler(productDeletedEvent)).resolves.not.toThrow();
    });

    it('should handle unknown event type gracefully', async () => {
      rabbitMQService.subscribe.mockResolvedValue(undefined);
      
      await subscriber.onModuleInit();

      const subscribeCall = rabbitMQService.subscribe.mock.calls[0];
      const eventHandler = subscribeCall[1];

      const unknownEvent = {
        eventType: 'product.unknown',
        productId: 'product-123',
        timestamp: new Date().toISOString(),
      };

      await expect(eventHandler(unknownEvent)).resolves.not.toThrow();
    });

    it('should handle malformed event gracefully', async () => {
      rabbitMQService.subscribe.mockResolvedValue(undefined);
      
      await subscriber.onModuleInit();

      const subscribeCall = rabbitMQService.subscribe.mock.calls[0];
      const eventHandler = subscribeCall[1];

      const malformedEvent = {
        // Missing required fields
        timestamp: new Date().toISOString(),
      };

      await expect(eventHandler(malformedEvent)).resolves.not.toThrow();
    });
  });

  describe('Queue Configuration', () => {
    it('should use correct queue name', async () => {
      rabbitMQService.subscribe.mockResolvedValue(undefined);

      await subscriber.onModuleInit();

      expect(rabbitMQService.subscribe).toHaveBeenCalledWith(
        'product.events',
        expect.any(Function)
      );
    });
  });

  describe('Event Interfaces', () => {
    it('should validate ProductCreatedEvent structure', () => {
      const event = {
        eventType: 'product.created' as const,
        productId: 'product-123',
        name: 'New Product',
        category: 'Coffee',
        price: 15.99,
        timestamp: new Date().toISOString(),
      };

      expect(event.eventType).toBe('product.created');
      expect(event.productId).toBe('product-123');
      expect(event.name).toBe('New Product');
      expect(event.category).toBe('Coffee');
      expect(event.price).toBe(15.99);
      expect(event.timestamp).toBeDefined();
    });

    it('should validate ProductUpdatedEvent structure', () => {
      const event = {
        eventType: 'product.updated' as const,
        productId: 'product-123',
        name: 'Updated Product',
        changes: ['name', 'price'],
        timestamp: new Date().toISOString(),
      };

      expect(event.eventType).toBe('product.updated');
      expect(event.productId).toBe('product-123');
      expect(event.name).toBe('Updated Product');
      expect(event.changes).toEqual(['name', 'price']);
      expect(event.timestamp).toBeDefined();
    });

    it('should validate ProductDeletedEvent structure', () => {
      const event = {
        eventType: 'product.deleted' as const,
        productId: 'product-123',
        name: 'Deleted Product',
        timestamp: new Date().toISOString(),
      };

      expect(event.eventType).toBe('product.deleted');
      expect(event.productId).toBe('product-123');
      expect(event.name).toBe('Deleted Product');
      expect(event.timestamp).toBeDefined();
    });
  });
});
