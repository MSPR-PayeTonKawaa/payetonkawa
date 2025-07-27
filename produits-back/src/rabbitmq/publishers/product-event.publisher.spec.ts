import { Test, TestingModule } from '@nestjs/testing';
import { ProductEventPublisher } from './product-event.publisher';
import { RabbitMQService } from '../rabbitmq.service';
import { Product } from '../../entities/product.entity';
import { ProductDetails } from '../../entities/product-details.entity';

describe('ProductEventPublisher', () => {
  let publisher: ProductEventPublisher;
  let mockRabbitMQService: jest.Mocked<RabbitMQService>;
  let mockProduct: Product;
  let mockProductDetails: ProductDetails;

  beforeEach(async () => {
    // Mock RabbitMQService
    mockRabbitMQService = {
      publish: jest.fn(),
      connect: jest.fn(),
      disconnect: jest.fn(),
      subscribeToQueue: jest.fn(),
      getChannel: jest.fn(),
      onModuleInit: jest.fn(),
      onModuleDestroy: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductEventPublisher,
        {
          provide: RabbitMQService,
          useValue: mockRabbitMQService,
        },
      ],
    }).compile();

    publisher = module.get<ProductEventPublisher>(ProductEventPublisher);

    // Mock ProductDetails
    mockProductDetails = {
      id: 'details-uuid-1',
      price: 25.99,
      description: 'Test product description',
      color: 'Brown',
      category: 'Coffee',
      origin: 'Test Origin',
      weight: '250g',
      intensity: 7,
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-01'),
      getFormattedPrice: jest.fn().mockReturnValue('25,99 €'),
      isExpensive: jest.fn().mockReturnValue(false),
      isPremium: jest.fn().mockReturnValue(false),
    } as any;

    // Mock Product
    mockProduct = {
      id: 'test-uuid-1',
      name: 'Test Product',
      stock: 100,
      stockStatus: 'available',
      isActive: true,
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-01'),
      details: mockProductDetails,
      incrementStock: jest.fn(),
      decrementStock: jest.fn(),
      updateStockStatus: jest.fn(),
      isAvailable: jest.fn(),
    } as any;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Service Creation', () => {
    it('should be defined', () => {
      expect(publisher).toBeDefined();
    });

    it('should have RabbitMQService injected', () => {
      expect(mockRabbitMQService).toBeDefined();
    });
  });

  describe('publishProductCreated', () => {
    it('should publish product created event successfully', async () => {
      mockRabbitMQService.publish.mockResolvedValue(undefined);

      await publisher.publishProductCreated(mockProduct);

      expect(mockRabbitMQService.publish).toHaveBeenCalledWith(
        'payetonkawa.events',
        'product.created',
        expect.objectContaining({
          eventType: 'product.created',
          productId: 'test-uuid-1',
          name: 'Test Product',
          stock: 100,
          price: 25.99,
          category: 'Coffee',
          timestamp: expect.any(String),
        })
      );
    });

    it('should handle RabbitMQ publish errors gracefully', async () => {
      const error = new Error('RabbitMQ connection failed');
      mockRabbitMQService.publish.mockRejectedValue(error);

      // Le service ne doit pas planter, juste logger l'erreur
      await expect(publisher.publishProductCreated(mockProduct)).resolves.not.toThrow();
    });

    it('should create event with correct timestamp format', async () => {
      mockRabbitMQService.publish.mockResolvedValue(undefined);

      await publisher.publishProductCreated(mockProduct);

      const call = mockRabbitMQService.publish.mock.calls[0];
      const event = call[2];
      
      expect(event.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
      expect(new Date(event.timestamp)).toBeInstanceOf(Date);
    });
  });

  describe('publishProductUpdated', () => {
    it('should publish product updated event successfully', async () => {
      const changes = ['name', 'price'];
      mockRabbitMQService.publish.mockResolvedValue(undefined);

      await publisher.publishProductUpdated(mockProduct, changes);

      expect(mockRabbitMQService.publish).toHaveBeenCalledWith(
        'payetonkawa.events',
        'product.updated',
        expect.objectContaining({
          eventType: 'product.updated',
          productId: 'test-uuid-1',
          name: 'Test Product',
          stock: 100,
          price: 25.99,
          category: 'Coffee',
          changes: ['name', 'price'],
          timestamp: expect.any(String),
        })
      );
    });

    it('should handle empty changes array', async () => {
      const changes: string[] = [];
      mockRabbitMQService.publish.mockResolvedValue(undefined);

      await publisher.publishProductUpdated(mockProduct, changes);

      expect(mockRabbitMQService.publish).toHaveBeenCalledWith(
        'payetonkawa.events',
        'product.updated',
        expect.objectContaining({
          changes: [],
        })
      );
    });

    it('should handle RabbitMQ errors in update', async () => {
      const error = new Error('RabbitMQ connection failed');
      mockRabbitMQService.publish.mockRejectedValue(error);

      await expect(publisher.publishProductUpdated(mockProduct, ['name'])).resolves.not.toThrow();
    });
  });

  describe('publishProductDeleted', () => {
    it('should publish product deleted event successfully', async () => {
      mockRabbitMQService.publish.mockResolvedValue(undefined);

      await publisher.publishProductDeleted('test-uuid-1', 'Test Product');

      expect(mockRabbitMQService.publish).toHaveBeenCalledWith(
        'payetonkawa.events',
        'product.deleted',
        expect.objectContaining({
          eventType: 'product.deleted',
          productId: 'test-uuid-1',
          name: 'Test Product',
          timestamp: expect.any(String),
        })
      );
    });

    it('should handle RabbitMQ errors in delete', async () => {
      const error = new Error('RabbitMQ connection failed');
      mockRabbitMQService.publish.mockRejectedValue(error);

      await expect(publisher.publishProductDeleted('test-uuid-1', 'Test Product')).resolves.not.toThrow();
    });

    it('should create delete event with correct structure', async () => {
      mockRabbitMQService.publish.mockResolvedValue(undefined);

      await publisher.publishProductDeleted('test-uuid-1', 'Test Product');

      const call = mockRabbitMQService.publish.mock.calls[0];
      const event = call[2];
      
      expect(event).toHaveProperty('eventType', 'product.deleted');
      expect(event).toHaveProperty('productId', 'test-uuid-1');
      expect(event).toHaveProperty('name', 'Test Product');
      expect(event).toHaveProperty('timestamp');
      expect(event).not.toHaveProperty('stock');
      expect(event).not.toHaveProperty('price');
    });
  });

  describe('Event Structure Validation', () => {
    it('should create events with consistent structure', async () => {
      mockRabbitMQService.publish.mockResolvedValue(undefined);

      await publisher.publishProductCreated(mockProduct);
      await publisher.publishProductUpdated(mockProduct, ['name']);
      await publisher.publishProductDeleted('test-uuid-1', 'Test Product');

      expect(mockRabbitMQService.publish).toHaveBeenCalledTimes(3);

      // Vérifier que tous les événements ont un timestamp
      const calls = mockRabbitMQService.publish.mock.calls;
      calls.forEach(call => {
        const event = call[2];
        expect(event.timestamp).toBeDefined();
        expect(event.productId).toBe('test-uuid-1');
      });
    });

    it('should use correct exchange and routing keys', async () => {
      mockRabbitMQService.publish.mockResolvedValue(undefined);

      await publisher.publishProductCreated(mockProduct);
      await publisher.publishProductUpdated(mockProduct, ['name']);
      await publisher.publishProductDeleted('test-uuid-1', 'Test Product');

      const calls = mockRabbitMQService.publish.mock.calls;
      
      expect(calls[0]).toEqual(['payetonkawa.events', 'product.created', expect.any(Object)]);
      expect(calls[1]).toEqual(['payetonkawa.events', 'product.updated', expect.any(Object)]);
      expect(calls[2]).toEqual(['payetonkawa.events', 'product.deleted', expect.any(Object)]);
    });
  });
});
