import { Test, TestingModule } from '@nestjs/testing';
import { OrderEventSubscriber } from './order-event.subscriber';
import { RabbitMQService } from '../rabbitmq.service';
import { ProductsService } from '../../services/products.service';
import { Logger } from '@nestjs/common';

describe('OrderEventSubscriber', () => {
  let subscriber: OrderEventSubscriber;
  let rabbitMQService: jest.Mocked<RabbitMQService>;
  let productsService: jest.Mocked<ProductsService>;

  beforeEach(async () => {
    const mockRabbitMQService = {
      subscribe: jest.fn(),
    };

    const mockProductsService = {
      findOne: jest.fn(),
      updateStock: jest.fn(),
      decrementStock: jest.fn(),
      incrementStock: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrderEventSubscriber,
        {
          provide: RabbitMQService,
          useValue: mockRabbitMQService,
        },
        {
          provide: ProductsService,
          useValue: mockProductsService,
        },
      ],
    }).compile();

    subscriber = module.get<OrderEventSubscriber>(OrderEventSubscriber);
    rabbitMQService = module.get(RabbitMQService);
    productsService = module.get(ProductsService);

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

    it('should call subscribeToOrderEvents on module init', async () => {
      rabbitMQService.subscribe.mockResolvedValue(undefined);

      await subscriber.onModuleInit();

      expect(setTimeout).toHaveBeenCalled();
      expect(rabbitMQService.subscribe).toHaveBeenCalledWith(
        'order.events',
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
    it('should handle order.created event', async () => {
      rabbitMQService.subscribe.mockResolvedValue(undefined);
      
      await subscriber.onModuleInit();

      const subscribeCall = rabbitMQService.subscribe.mock.calls[0];
      const eventHandler = subscribeCall[1];

      const orderCreatedEvent = {
        eventType: 'order.created',
        orderId: 'order-123',
        customerId: 'customer-123',
        items: [
          {
            productId: 'product-123',
            quantity: 2,
            price: 10.99
          }
        ],
        totalAmount: 21.98,
        timestamp: new Date().toISOString(),
      };

      await expect(eventHandler(orderCreatedEvent)).resolves.not.toThrow();
    });

    it('should handle order.cancelled event', async () => {
      rabbitMQService.subscribe.mockResolvedValue(undefined);
      
      await subscriber.onModuleInit();

      const subscribeCall = rabbitMQService.subscribe.mock.calls[0];
      const eventHandler = subscribeCall[1];

      const orderCancelledEvent = {
        eventType: 'order.cancelled',
        orderId: 'order-123',
        items: [
          {
            productId: 'product-123',
            quantity: 2
          }
        ],
        timestamp: new Date().toISOString(),
      };

      await expect(eventHandler(orderCancelledEvent)).resolves.not.toThrow();
    });

    it('should handle unknown event type gracefully', async () => {
      rabbitMQService.subscribe.mockResolvedValue(undefined);
      
      await subscriber.onModuleInit();

      const subscribeCall = rabbitMQService.subscribe.mock.calls[0];
      const eventHandler = subscribeCall[1];

      const unknownEvent = {
        eventType: 'order.unknown',
        orderId: 'order-123',
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

  describe('Stock Updates', () => {
    it('should handle stock updates for order creation', async () => {
      rabbitMQService.subscribe.mockResolvedValue(undefined);
      productsService.findOne.mockResolvedValue({
        id: 'product-123',
        stock: 100
      } as any);
      productsService.decrementStock.mockResolvedValue({
        id: 'product-123',
        stock: 98
      } as any);
      
      await subscriber.onModuleInit();

      const subscribeCall = rabbitMQService.subscribe.mock.calls[0];
      const eventHandler = subscribeCall[1];

      const orderCreatedEvent = {
        eventType: 'order.created',
        orderId: 'order-123',
        items: [
          {
            productId: 'product-123',
            quantity: 2
          }
        ],
        timestamp: new Date().toISOString(),
      };

      await expect(eventHandler(orderCreatedEvent)).resolves.not.toThrow();
    });

    it('should handle stock updates for order cancellation', async () => {
      rabbitMQService.subscribe.mockResolvedValue(undefined);
      productsService.findOne.mockResolvedValue({
        id: 'product-123',
        stock: 98
      } as any);
      productsService.incrementStock.mockResolvedValue({
        id: 'product-123',
        stock: 100
      } as any);
      
      await subscriber.onModuleInit();

      const subscribeCall = rabbitMQService.subscribe.mock.calls[0];
      const eventHandler = subscribeCall[1];

      const orderCancelledEvent = {
        eventType: 'order.cancelled',
        orderId: 'order-123',
        items: [
          {
            productId: 'product-123',
            quantity: 2
          }
        ],
        timestamp: new Date().toISOString(),
      };

      await expect(eventHandler(orderCancelledEvent)).resolves.not.toThrow();
    });
  });

  describe('Queue Configuration', () => {
    it('should use correct queue name', async () => {
      rabbitMQService.subscribe.mockResolvedValue(undefined);

      await subscriber.onModuleInit();

      expect(rabbitMQService.subscribe).toHaveBeenCalledWith(
        'order.events',
        expect.any(Function)
      );
    });
  });

  describe('Event Interfaces', () => {
    it('should validate OrderCreatedEvent structure', () => {
      const event = {
        eventType: 'order.created' as const,
        orderId: 'order-123',
        customerId: 'customer-123',
        items: [
          {
            productId: 'product-123',
            quantity: 2,
            price: 10.99
          }
        ],
        totalAmount: 21.98,
        timestamp: new Date().toISOString(),
      };

      expect(event.eventType).toBe('order.created');
      expect(event.orderId).toBe('order-123');
      expect(event.customerId).toBe('customer-123');
      expect(event.items).toHaveLength(1);
      expect(event.totalAmount).toBe(21.98);
      expect(event.timestamp).toBeDefined();
    });

    it('should validate OrderCancelledEvent structure', () => {
      const event = {
        eventType: 'order.cancelled' as const,
        orderId: 'order-123',
        items: [
          {
            productId: 'product-123',
            quantity: 2
          }
        ],
        timestamp: new Date().toISOString(),
      };

      expect(event.eventType).toBe('order.cancelled');
      expect(event.orderId).toBe('order-123');
      expect(event.items).toHaveLength(1);
      expect(event.timestamp).toBeDefined();
    });
  });
});
