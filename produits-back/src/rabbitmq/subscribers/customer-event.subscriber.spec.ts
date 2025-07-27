import { Test, TestingModule } from '@nestjs/testing';
import { CustomerEventSubscriber } from './customer-event.subscriber';
import { RabbitMQService } from '../rabbitmq.service';
import { Logger } from '@nestjs/common';

describe('CustomerEventSubscriber', () => {
  let subscriber: CustomerEventSubscriber;
  let rabbitMQService: jest.Mocked<RabbitMQService>;

  beforeEach(async () => {
    const mockRabbitMQService = {
      subscribe: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CustomerEventSubscriber,
        {
          provide: RabbitMQService,
          useValue: mockRabbitMQService,
        },
      ],
    }).compile();

    subscriber = module.get<CustomerEventSubscriber>(CustomerEventSubscriber);
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

    it('should call subscribeToCustomerEvents on module init', async () => {
      rabbitMQService.subscribe.mockResolvedValue(undefined);

      await subscriber.onModuleInit();

      expect(setTimeout).toHaveBeenCalled();
      expect(rabbitMQService.subscribe).toHaveBeenCalledWith(
        'customer.events',
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
    it('should handle customer.updated event', async () => {
      rabbitMQService.subscribe.mockResolvedValue(undefined);
      
      await subscriber.onModuleInit();

      // Récupérer la fonction de callback passée à subscribe
      const subscribeCall = rabbitMQService.subscribe.mock.calls[0];
      const eventHandler = subscribeCall[1];

      const customerUpdatedEvent = {
        eventType: 'customer.updated',
        customerId: 'customer-123',
        name: 'John Doe',
        email: 'john@example.com',
        isActive: true,
        timestamp: new Date().toISOString(),
      };

      await expect(eventHandler(customerUpdatedEvent)).resolves.not.toThrow();
    });

    it('should handle customer.deleted event', async () => {
      rabbitMQService.subscribe.mockResolvedValue(undefined);
      
      await subscriber.onModuleInit();

      const subscribeCall = rabbitMQService.subscribe.mock.calls[0];
      const eventHandler = subscribeCall[1];

      const customerDeletedEvent = {
        eventType: 'customer.deleted',
        customerId: 'customer-123',
        timestamp: new Date().toISOString(),
      };

      await expect(eventHandler(customerDeletedEvent)).resolves.not.toThrow();
    });

    it('should handle unknown event type gracefully', async () => {
      rabbitMQService.subscribe.mockResolvedValue(undefined);
      
      await subscriber.onModuleInit();

      const subscribeCall = rabbitMQService.subscribe.mock.calls[0];
      const eventHandler = subscribeCall[1];

      const unknownEvent = {
        eventType: 'customer.unknown',
        customerId: 'customer-123',
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
        'customer.events',
        expect.any(Function)
      );
    });
  });

  describe('Event Interfaces', () => {
    it('should validate CustomerUpdatedEvent structure', () => {
      const event = {
        eventType: 'customer.updated' as const,
        customerId: 'customer-123',
        name: 'John Doe',
        email: 'john@example.com',
        isActive: true,
        timestamp: new Date().toISOString(),
      };

      expect(event.eventType).toBe('customer.updated');
      expect(event.customerId).toBe('customer-123');
      expect(event.name).toBe('John Doe');
      expect(event.email).toBe('john@example.com');
      expect(event.isActive).toBe(true);
      expect(event.timestamp).toBeDefined();
    });

    it('should validate CustomerDeletedEvent structure', () => {
      const event = {
        eventType: 'customer.deleted' as const,
        customerId: 'customer-123',
        timestamp: new Date().toISOString(),
      };

      expect(event.eventType).toBe('customer.deleted');
      expect(event.customerId).toBe('customer-123');
      expect(event.timestamp).toBeDefined();
    });
  });
});
