import { Test, TestingModule } from '@nestjs/testing';
import { StockEventPublisher } from './stock-event.publisher';
import { RabbitMQService } from '../rabbitmq.service';
import { Product, StockStatus } from '../../entities/product.entity';
import { Logger } from '@nestjs/common';

describe('StockEventPublisher', () => {
  let publisher: StockEventPublisher;
  let rabbitMQService: jest.Mocked<RabbitMQService>;

  const createMockProduct = (stock: number, id = 'product-123', name = 'Test Product'): Partial<Product> => ({
    id,
    name,
    stock,
    stockStatus: StockStatus.AVAILABLE,
  });

  beforeEach(async () => {
    const mockRabbitMQService = {
      publish: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StockEventPublisher,
        {
          provide: RabbitMQService,
          useValue: mockRabbitMQService,
        },
      ],
    }).compile();

    publisher = module.get<StockEventPublisher>(StockEventPublisher);
    rabbitMQService = module.get(RabbitMQService);

    // Mock des méthodes Logger
    jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Logger.prototype, 'warn').mockImplementation();
    jest.spyOn(Logger.prototype, 'error').mockImplementation();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('publishStockUpdated', () => {
    it('should publish stock updated event successfully', async () => {
      const mockProduct = createMockProduct(50);
      const oldStock = 100;
      rabbitMQService.publish.mockResolvedValue(undefined);

      await publisher.publishStockUpdated(mockProduct as Product, oldStock);

      expect(rabbitMQService.publish).toHaveBeenCalledWith(
        'payetonkawa.events',
        'stock.updated',
        expect.objectContaining({
          eventType: 'stock.updated',
          productId: mockProduct.id,
          productName: mockProduct.name,
          oldStock,
          newStock: mockProduct.stock,
          stockStatus: mockProduct.stockStatus,
          timestamp: expect.any(String),
        })
      );
    });

    it('should handle publish error gracefully', async () => {
      const mockProduct = createMockProduct(50);
      const oldStock = 100;
      const error = new Error('Publish failed');
      rabbitMQService.publish.mockRejectedValue(error);

      await expect(publisher.publishStockUpdated(mockProduct as Product, oldStock)).resolves.not.toThrow();
      
      expect(rabbitMQService.publish).toHaveBeenCalled();
    });

    it('should trigger low stock alert when stock is below threshold', async () => {
      const mockProduct = createMockProduct(50); // Stock below 100 threshold
      const oldStock = 200;
      rabbitMQService.publish.mockResolvedValue(undefined);

      await publisher.publishStockUpdated(mockProduct as Product, oldStock);

      // Deux appels : stock.updated et stock.low
      expect(rabbitMQService.publish).toHaveBeenCalledTimes(2);
      expect(rabbitMQService.publish).toHaveBeenCalledWith(
        'payetonkawa.events',
        'stock.updated',
        expect.any(Object)
      );
      expect(rabbitMQService.publish).toHaveBeenCalledWith(
        'payetonkawa.events',
        'stock.low',
        expect.any(Object)
      );
    });

    it('should trigger empty stock alert when stock is zero', async () => {
      const mockProduct = createMockProduct(0); // Empty stock
      const oldStock = 10;
      rabbitMQService.publish.mockResolvedValue(undefined);

      await publisher.publishStockUpdated(mockProduct as Product, oldStock);

      // Deux appels : stock.updated et stock.empty
      expect(rabbitMQService.publish).toHaveBeenCalledTimes(2);
      expect(rabbitMQService.publish).toHaveBeenCalledWith(
        'payetonkawa.events',
        'stock.updated',
        expect.any(Object)
      );
      expect(rabbitMQService.publish).toHaveBeenCalledWith(
        'payetonkawa.events',
        'stock.empty',
        expect.any(Object)
      );
    });
  });

  describe('publishStockLow', () => {
    it('should publish stock low event successfully', async () => {
      const mockProduct = createMockProduct(50);
      rabbitMQService.publish.mockResolvedValue(undefined);

      await publisher.publishStockLow(mockProduct as Product);

      expect(rabbitMQService.publish).toHaveBeenCalledWith(
        'payetonkawa.events',
        'stock.low',
        expect.objectContaining({
          eventType: 'stock.low',
          productId: mockProduct.id,
          productName: mockProduct.name,
          currentStock: mockProduct.stock,
          threshold: 100, // LOW_STOCK_THRESHOLD
          timestamp: expect.any(String),
        })
      );
    });

    it('should handle publish error gracefully', async () => {
      const mockProduct = createMockProduct(50);
      const error = new Error('Publish failed');
      rabbitMQService.publish.mockRejectedValue(error);

      await expect(publisher.publishStockLow(mockProduct as Product)).resolves.not.toThrow();
      
      expect(rabbitMQService.publish).toHaveBeenCalled();
    });
  });

  describe('publishStockEmpty', () => {
    it('should publish stock empty event successfully', async () => {
      const mockProduct = createMockProduct(0);
      rabbitMQService.publish.mockResolvedValue(undefined);

      await publisher.publishStockEmpty(mockProduct as Product);

      expect(rabbitMQService.publish).toHaveBeenCalledWith(
        'payetonkawa.events',
        'stock.empty',
        expect.objectContaining({
          eventType: 'stock.empty',
          productId: mockProduct.id,
          productName: mockProduct.name,
          timestamp: expect.any(String),
        })
      );
    });

    it('should handle publish error gracefully', async () => {
      const mockProduct = createMockProduct(0);
      const error = new Error('Publish failed');
      rabbitMQService.publish.mockRejectedValue(error);

      await expect(publisher.publishStockEmpty(mockProduct as Product)).resolves.not.toThrow();
      
      expect(rabbitMQService.publish).toHaveBeenCalled();
    });
  });

  describe('checkAndPublishAlerts', () => {
    it('should not publish alerts for high stock', async () => {
      const mockProduct = createMockProduct(200); // High stock
      rabbitMQService.publish.mockResolvedValue(undefined);

      await publisher.publishStockUpdated(mockProduct as Product, 150);

      // Seulement stock.updated, pas d'alerte
      expect(rabbitMQService.publish).toHaveBeenCalledTimes(1);
      expect(rabbitMQService.publish).toHaveBeenCalledWith(
        'payetonkawa.events',
        'stock.updated',
        expect.any(Object)
      );
    });

    it('should publish low stock alert for stock between 1 and threshold', async () => {
      const mockProduct = createMockProduct(50); // Low stock
      rabbitMQService.publish.mockResolvedValue(undefined);

      await publisher.publishStockUpdated(mockProduct as Product, 200);

      expect(rabbitMQService.publish).toHaveBeenCalledTimes(2);
      expect(rabbitMQService.publish).toHaveBeenCalledWith(
        'payetonkawa.events',
        'stock.low',
        expect.any(Object)
      );
    });

    it('should publish empty stock alert for zero stock', async () => {
      const mockProduct = createMockProduct(0); // Empty stock
      rabbitMQService.publish.mockResolvedValue(undefined);

      await publisher.publishStockUpdated(mockProduct as Product, 10);

      expect(rabbitMQService.publish).toHaveBeenCalledTimes(2);
      expect(rabbitMQService.publish).toHaveBeenCalledWith(
        'payetonkawa.events',
        'stock.empty',
        expect.any(Object)
      );
    });
  });

  describe('Event Interfaces', () => {
    it('should create valid StockUpdatedEvent', async () => {
      const mockProduct = createMockProduct(50);
      const oldStock = 100;
      rabbitMQService.publish.mockResolvedValue(undefined);

      await publisher.publishStockUpdated(mockProduct as Product, oldStock);

      const publishCall = rabbitMQService.publish.mock.calls[0];
      const event = publishCall[2];

      expect(event).toMatchObject({
        eventType: 'stock.updated',
        productId: expect.any(String),
        productName: expect.any(String),
        oldStock: expect.any(Number),
        newStock: expect.any(Number),
        stockStatus: expect.any(String),
        timestamp: expect.any(String),
      });
    });

    it('should create valid StockLowEvent', async () => {
      const mockProduct = createMockProduct(50);
      rabbitMQService.publish.mockResolvedValue(undefined);

      await publisher.publishStockLow(mockProduct as Product);

      const publishCall = rabbitMQService.publish.mock.calls[0];
      const event = publishCall[2];

      expect(event).toMatchObject({
        eventType: 'stock.low',
        productId: expect.any(String),
        productName: expect.any(String),
        currentStock: expect.any(Number),
        threshold: expect.any(Number),
        timestamp: expect.any(String),
      });
    });

    it('should create valid StockEmptyEvent', async () => {
      const mockProduct = createMockProduct(0);
      rabbitMQService.publish.mockResolvedValue(undefined);

      await publisher.publishStockEmpty(mockProduct as Product);

      const publishCall = rabbitMQService.publish.mock.calls[0];
      const event = publishCall[2];

      expect(event).toMatchObject({
        eventType: 'stock.empty',
        productId: expect.any(String),
        productName: expect.any(String),
        timestamp: expect.any(String),
      });
    });
  });
});
