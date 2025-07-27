import { Test, TestingModule } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { OrderEventPublisher } from './order-event.publisher';
import { RabbitMQService } from '../rabbitmq.service';
import { Order } from '../../entities/order.entity';
import { OrderItem } from '../../entities/order-item.entity';

describe('OrderEventPublisher', () => {
  let publisher: OrderEventPublisher;
  let rabbitMQService: jest.Mocked<RabbitMQService>;
  let mockLogger: jest.Mocked<Logger>;

  const mockOrder: Order = {
    id: 'order-123',
    customerId: 'customer-456',
    totalAmount: 199.99,
    status: 'pending',
    items: [
      {
        id: 'item-1',
        productId: 'product-123',
        quantity: 2,
        unitPrice: 99.99,
      } as OrderItem,
      {
        id: 'item-2',
        productId: 'product-456',
        quantity: 1,
        unitPrice: 0.01,
      } as OrderItem,
    ],
    createdAt: new Date(),
    updatedAt: new Date(),
  } as Order;

  beforeEach(async () => {
    const mockRabbitMQService = {
      publish: jest.fn().mockResolvedValue(undefined),
    };

    mockLogger = {
      log: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
      verbose: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrderEventPublisher,
        {
          provide: RabbitMQService,
          useValue: mockRabbitMQService,
        },
      ],
    }).compile();

    publisher = module.get<OrderEventPublisher>(OrderEventPublisher);
    rabbitMQService = module.get(RabbitMQService) as jest.Mocked<RabbitMQService>;

    // Mock du logger
    jest.spyOn(Logger.prototype, 'log').mockImplementation(mockLogger.log);
    jest.spyOn(Logger.prototype, 'error').mockImplementation(mockLogger.error);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('publishOrderCreated', () => {
    it('should publish order created event successfully', async () => {
      await publisher.publishOrderCreated(mockOrder);

      expect(rabbitMQService.publish).toHaveBeenCalledWith(
        '',
        'product.events',
        expect.objectContaining({
          eventType: 'order.created',
          orderId: 'order-123',
          customerId: 'customer-456',
          totalAmount: 199.99,
          items: [
            {
              productId: 'product-123',
              quantity: 2,
              unitPrice: 99.99,
            },
            {
              productId: 'product-456',
              quantity: 1,
              unitPrice: 0.01,
            },
          ],
          timestamp: expect.any(String),
        })
      );

      expect(mockLogger.log).toHaveBeenCalledWith(
        expect.stringContaining('✅ Événement order.created publié vers product.events pour commande order-123')
      );
    });

    it('should handle publish error for order created event', async () => {
      const error = new Error('RabbitMQ connection failed');
      rabbitMQService.publish.mockRejectedValue(error);

      await expect(publisher.publishOrderCreated(mockOrder)).rejects.toThrow(error);

      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('❌ Erreur publication order.created pour order-123:'),
        error
      );
    });

    it('should format timestamp correctly in order created event', async () => {
      const beforePublish = new Date().toISOString();
      await publisher.publishOrderCreated(mockOrder);
      const afterPublish = new Date().toISOString();

      const publishCall = rabbitMQService.publish.mock.calls[0];
      const event = publishCall[2] as any;
      
      expect(event.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
      expect(event.timestamp >= beforePublish).toBeTruthy();
      expect(event.timestamp <= afterPublish).toBeTruthy();
    });

    it('should handle order with empty items array', async () => {
      const orderWithoutItems = { ...mockOrder, items: [] } as unknown as Order;

      await publisher.publishOrderCreated(orderWithoutItems);

      const publishCall = rabbitMQService.publish.mock.calls[0];
      const event = publishCall[2] as any;
      
      expect(event.items).toEqual([]);
    });
  });

  describe('publishOrderStatusChanged', () => {
    it('should publish order status changed event successfully', async () => {
      const oldStatus = 'pending';
      const updatedOrder = { ...mockOrder, status: 'confirmed' } as unknown as Order;

      await publisher.publishOrderStatusChanged(updatedOrder, oldStatus);

      expect(rabbitMQService.publish).toHaveBeenCalledWith(
        'payetonkawa.events',
        'order.confirmed',
        expect.objectContaining({
          eventType: 'order.status.changed',
          orderId: 'order-123',
          customerId: 'customer-456',
          oldStatus: 'pending',
          newStatus: 'confirmed',
          timestamp: expect.any(String),
        })
      );

      expect(mockLogger.log).toHaveBeenCalledWith(
        expect.stringContaining('✅ Événement order.confirmed publié pour commande order-123')
      );
    });

    it('should handle publish error for status changed event', async () => {
      const error = new Error('Exchange not found');
      rabbitMQService.publish.mockRejectedValue(error);

      await expect(publisher.publishOrderStatusChanged(mockOrder, 'pending')).rejects.toThrow(error);

      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('❌ Erreur publication order.status.changed pour order-123:'),
        error
      );
    });

    it('should publish with different status transitions', async () => {
      const statusTransitions = [
        { oldStatus: 'pending', newStatus: 'confirmed' },
        { oldStatus: 'confirmed', newStatus: 'shipped' },
        { oldStatus: 'shipped', newStatus: 'delivered' },
        { oldStatus: 'pending', newStatus: 'cancelled' },
      ];

      for (const transition of statusTransitions) {
        const updatedOrder = { ...mockOrder, status: transition.newStatus } as unknown as Order;
        await publisher.publishOrderStatusChanged(updatedOrder, transition.oldStatus);

        expect(rabbitMQService.publish).toHaveBeenCalledWith(
          'payetonkawa.events',
          `order.${transition.newStatus}`,
          expect.objectContaining({
            oldStatus: transition.oldStatus,
            newStatus: transition.newStatus,
          })
        );
      }
    });
  });

  describe('publishOrderCancelled', () => {
    it('should publish order cancelled event successfully', async () => {
      await publisher.publishOrderCancelled(mockOrder);

      expect(rabbitMQService.publish).toHaveBeenCalledWith(
        '',
        'product.events',
        expect.objectContaining({
          eventType: 'order.cancelled',
          orderId: 'order-123',
          customerId: 'customer-456',
          items: [
            {
              productId: 'product-123',
              quantity: 2,
            },
            {
              productId: 'product-456',
              quantity: 1,
            },
          ],
          timestamp: expect.any(String),
        })
      );

      expect(mockLogger.log).toHaveBeenCalledWith(
        expect.stringContaining('✅ Événement order.cancelled publié vers product.events pour commande order-123')
      );
    });

    it('should handle publish error for cancelled event', async () => {
      const error = new Error('Queue not found');
      rabbitMQService.publish.mockRejectedValue(error);

      await expect(publisher.publishOrderCancelled(mockOrder)).rejects.toThrow(error);

      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('❌ Erreur publication order.cancelled pour order-123:'),
        error
      );
    });

    it('should not include unitPrice in cancelled event items', async () => {
      await publisher.publishOrderCancelled(mockOrder);

      const publishCall = rabbitMQService.publish.mock.calls[0];
      const event = publishCall[2] as any;
      
      expect(event.items).toEqual([
        {
          productId: 'product-123',
          quantity: 2,
        },
        {
          productId: 'product-456',
          quantity: 1,
        },
      ]);

      // Vérifier que unitPrice n'est pas inclus
      event.items.forEach((item: any) => {
        expect(item).not.toHaveProperty('unitPrice');
      });
    });

    it('should handle order with no items for cancellation', async () => {
      const orderWithoutItems = { ...mockOrder, items: [] } as unknown as Order;

      await publisher.publishOrderCancelled(orderWithoutItems);

      const publishCall = rabbitMQService.publish.mock.calls[0];
      const event = publishCall[2] as any;
      
      expect(event.items).toEqual([]);
    });
  });

  describe('Event format validation', () => {
    it('should create valid OrderCreatedEvent format', async () => {
      await publisher.publishOrderCreated(mockOrder);

      const publishCall = rabbitMQService.publish.mock.calls[0];
      const event = publishCall[2] as any;

      expect(event).toMatchObject({
        eventType: 'order.created',
        orderId: expect.any(String),
        customerId: expect.any(String),
        totalAmount: expect.any(Number),
        items: expect.any(Array),
        timestamp: expect.any(String),
      });
    });

    it('should create valid OrderStatusChangedEvent format', async () => {
      await publisher.publishOrderStatusChanged(mockOrder, 'pending');

      const publishCall = rabbitMQService.publish.mock.calls[0];
      const event = publishCall[2] as any;

      expect(event).toMatchObject({
        eventType: 'order.status.changed',
        orderId: expect.any(String),
        customerId: expect.any(String),
        oldStatus: expect.any(String),
        newStatus: expect.any(String),
        timestamp: expect.any(String),
      });
    });

    it('should create valid OrderCancelledEvent format', async () => {
      await publisher.publishOrderCancelled(mockOrder);

      const publishCall = rabbitMQService.publish.mock.calls[0];
      const event = publishCall[2] as any;

      expect(event).toMatchObject({
        eventType: 'order.cancelled',
        orderId: expect.any(String),
        customerId: expect.any(String),
        items: expect.any(Array),
        timestamp: expect.any(String),
      });
    });
  });
});
