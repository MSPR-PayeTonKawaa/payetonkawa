import { Test, TestingModule } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { ProductEventSubscriber, ProductUpdatedEvent, ProductDeletedEvent } from './product-event.subscriber';
import { RabbitMQService } from '../rabbitmq.service';

describe('ProductEventSubscriber', () => {
  let subscriber: ProductEventSubscriber;
  let rabbitMQService: jest.Mocked<RabbitMQService>;
  let mockLogger: jest.Mocked<Logger>;

  beforeEach(async () => {
    const mockRabbitMQService = {
      subscribe: jest.fn().mockResolvedValue(undefined),
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
        ProductEventSubscriber,
        {
          provide: RabbitMQService,
          useValue: mockRabbitMQService,
        },
      ],
    }).compile();

    subscriber = module.get<ProductEventSubscriber>(ProductEventSubscriber);
    rabbitMQService = module.get(RabbitMQService) as jest.Mocked<RabbitMQService>;

    // Mock du logger
    jest.spyOn(Logger.prototype, 'log').mockImplementation(mockLogger.log);
    jest.spyOn(Logger.prototype, 'error').mockImplementation(mockLogger.error);
    jest.spyOn(Logger.prototype, 'warn').mockImplementation(mockLogger.warn);

    // Mock setTimeout pour éviter l'attente dans les tests
    jest.spyOn(global, 'setTimeout').mockImplementation((callback: any) => {
      callback();
      return {} as any;
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  describe('onModuleInit', () => {
    it('should subscribe to product events after timeout', async () => {
      await subscriber.onModuleInit();

      expect(rabbitMQService.subscribe).toHaveBeenCalledWith(
        'product.events',
        expect.any(Function)
      );
    });

    it('should handle subscription error', async () => {
      const error = new Error('Subscription failed');
      rabbitMQService.subscribe.mockRejectedValue(error);

      await subscriber.onModuleInit();

      expect(mockLogger.error).toHaveBeenCalledWith(
        '❌ Erreur souscription aux événements produits:',
        error
      );
    });
  });

  describe('handleProductEvent', () => {
    let handleProductEventMethod: (event: any) => Promise<void>;

    beforeEach(async () => {
      await subscriber.onModuleInit();
      // Récupérer la fonction de callback passée à subscribe
      handleProductEventMethod = rabbitMQService.subscribe.mock.calls[0][1];
    });

    it('should handle product.updated event', async () => {
      const event: ProductUpdatedEvent = {
        eventType: 'product.updated',
        productId: 'product-123',
        name: 'New Product Name',
        price: 99.99,
        stock: 50,
        isActive: true,
        timestamp: new Date().toISOString(),
      };

      await handleProductEventMethod(event);

      expect(mockLogger.log).toHaveBeenCalledWith('📬 Événement produit reçu: product.updated');
    });

    it('should handle product.deleted event', async () => {
      const event: ProductDeletedEvent = {
        eventType: 'product.deleted',
        productId: 'product-123',
        timestamp: new Date().toISOString(),
      };

      await handleProductEventMethod(event);

      expect(mockLogger.log).toHaveBeenCalledWith('📬 Événement produit reçu: product.deleted');
    });

    it('should handle unknown event type', async () => {
      const event = {
        eventType: 'product.unknown',
        productId: 'product-123',
        timestamp: new Date().toISOString(),
      };

      await handleProductEventMethod(event);

      expect(mockLogger.log).toHaveBeenCalledWith('📬 Événement produit reçu: product.unknown');
      expect(mockLogger.warn).toHaveBeenCalledWith('⚠️ Événement produit non géré: product.unknown');
    });

    it('should handle error in event processing', async () => {
      const event: ProductUpdatedEvent = {
        eventType: 'product.updated',
        productId: 'product-123',
        timestamp: new Date().toISOString(),
      };

      // Simuler une erreur en mockant une méthode privée qui va lever une erreur
      const originalHandleProductUpdated = (subscriber as any).handleProductUpdated;
      (subscriber as any).handleProductUpdated = jest.fn().mockRejectedValue(new Error('Processing error'));

      await expect(handleProductEventMethod(event)).rejects.toThrow('Processing error');

      expect(mockLogger.error).toHaveBeenCalledWith(
        '❌ Erreur traitement événement produit:',
        expect.any(Error)
      );

      // Restaurer la méthode originale
      (subscriber as any).handleProductUpdated = originalHandleProductUpdated;
    });
  });

  describe('handleProductUpdated', () => {
    it('should handle product updated with all fields', async () => {
      const event: ProductUpdatedEvent = {
        eventType: 'product.updated',
        productId: 'product-456',
        name: 'Awesome Product',
        price: 149.99,
        stock: 25,
        isActive: true,
        timestamp: new Date().toISOString(),
      };

      await (subscriber as any).handleProductUpdated(event);

      expect(mockLogger.log).toHaveBeenCalledWith('🔄 Produit mis à jour: product-456');
      expect(mockLogger.log).toHaveBeenCalledWith('💰 Nouveau prix pour product-456: 149.99€');
      expect(mockLogger.log).toHaveBeenCalledWith('📦 Nouveau stock pour product-456: 25 unités');
    });

    it('should handle product updated with only name', async () => {
      const event: ProductUpdatedEvent = {
        eventType: 'product.updated',
        productId: 'product-789',
        name: 'Updated Product Name',
        timestamp: new Date().toISOString(),
      };

      await (subscriber as any).handleProductUpdated(event);

      expect(mockLogger.log).toHaveBeenCalledWith('🔄 Produit mis à jour: product-789');
      // Le nom n'est pas logué dans l'implémentation actuelle
    });

    it('should handle product updated with only price', async () => {
      const event: ProductUpdatedEvent = {
        eventType: 'product.updated',
        productId: 'product-101',
        price: 79.99,
        timestamp: new Date().toISOString(),
      };

      await (subscriber as any).handleProductUpdated(event);

      expect(mockLogger.log).toHaveBeenCalledWith('🔄 Produit mis à jour: product-101');
      expect(mockLogger.log).toHaveBeenCalledWith('💰 Nouveau prix pour product-101: 79.99€');
    });

    it('should handle product updated with only stock', async () => {
      const event: ProductUpdatedEvent = {
        eventType: 'product.updated',
        productId: 'product-202',
        stock: 100,
        timestamp: new Date().toISOString(),
      };

      await (subscriber as any).handleProductUpdated(event);

      expect(mockLogger.log).toHaveBeenCalledWith('🔄 Produit mis à jour: product-202');
      expect(mockLogger.log).toHaveBeenCalledWith('📦 Nouveau stock pour product-202: 100 unités');
    });

    it('should handle product deactivation', async () => {
      const event: ProductUpdatedEvent = {
        eventType: 'product.updated',
        productId: 'product-303',
        isActive: false,
        timestamp: new Date().toISOString(),
      };

      await (subscriber as any).handleProductUpdated(event);

      expect(mockLogger.log).toHaveBeenCalledWith('🔄 Produit mis à jour: product-303');
      expect(mockLogger.warn).toHaveBeenCalledWith(
        '⚠️ Produit product-303 désactivé - vérifier les commandes en cours'
      );
    });

    it('should handle low stock warning', async () => {
      const event: ProductUpdatedEvent = {
        eventType: 'product.updated',
        productId: 'product-404',
        stock: 2,
        timestamp: new Date().toISOString(),
      };

      await (subscriber as any).handleProductUpdated(event);

      expect(mockLogger.log).toHaveBeenCalledWith('🔄 Produit mis à jour: product-404');
      expect(mockLogger.log).toHaveBeenCalledWith('📦 Nouveau stock pour product-404: 2 unités');
      // Le stock faible n'est pas géré dans l'implémentation actuelle
    });

    it('should handle out of stock', async () => {
      const event: ProductUpdatedEvent = {
        eventType: 'product.updated',
        productId: 'product-505',
        stock: 0,
        timestamp: new Date().toISOString(),
      };

      await (subscriber as any).handleProductUpdated(event);

      expect(mockLogger.log).toHaveBeenCalledWith('🔄 Produit mis à jour: product-505');
      expect(mockLogger.log).toHaveBeenCalledWith('📦 Nouveau stock pour product-505: 0 unités');
      // Le stock épuisé n'est pas géré dans l'implémentation actuelle
    });

    it('should handle error in product updated processing', async () => {
      const event: ProductUpdatedEvent = {
        eventType: 'product.updated',
        productId: 'product-error',
        timestamp: new Date().toISOString(),
      };

      // Simuler une erreur dans le logger
      mockLogger.log.mockImplementationOnce(() => {
        throw new Error('Logger error');
      });

      await expect((subscriber as any).handleProductUpdated(event)).rejects.toThrow();

      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('❌ Erreur traitement product.updated pour product-error:'),
        expect.any(Error)
      );
    });
  });

  describe('handleProductDeleted', () => {
    it('should handle product deleted event', async () => {
      const event: ProductDeletedEvent = {
        eventType: 'product.deleted',
        productId: 'product-deleted',
        timestamp: new Date().toISOString(),
      };

      await (subscriber as any).handleProductDeleted(event);

      expect(mockLogger.warn).toHaveBeenCalledWith('🗑️ Produit supprimé: product-deleted');
      expect(mockLogger.warn).toHaveBeenCalledWith(
        '⚠️ Vérification nécessaire des commandes contenant le produit product-deleted'
      );
    });

    it('should handle error in product deleted processing', async () => {
      const event: ProductDeletedEvent = {
        eventType: 'product.deleted',
        productId: 'product-error',
        timestamp: new Date().toISOString(),
      };

      // Simuler une erreur dans le logger
      mockLogger.warn.mockImplementationOnce(() => {
        throw new Error('Logger error');
      });

      await expect((subscriber as any).handleProductDeleted(event)).rejects.toThrow();

      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('❌ Erreur traitement product.deleted pour product-error:'),
        expect.any(Error)
      );
    });
  });
});
