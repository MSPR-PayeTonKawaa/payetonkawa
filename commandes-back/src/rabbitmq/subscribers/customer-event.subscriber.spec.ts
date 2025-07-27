import { Test, TestingModule } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { CustomerEventSubscriber, CustomerUpdatedEvent, CustomerDeletedEvent } from './customer-event.subscriber';
import { RabbitMQService } from '../rabbitmq.service';

describe('CustomerEventSubscriber', () => {
  let subscriber: CustomerEventSubscriber;
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
        CustomerEventSubscriber,
        {
          provide: RabbitMQService,
          useValue: mockRabbitMQService,
        },
      ],
    }).compile();

    subscriber = module.get<CustomerEventSubscriber>(CustomerEventSubscriber);
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
    it('should subscribe to customer events after timeout', async () => {
      await subscriber.onModuleInit();

      expect(rabbitMQService.subscribe).toHaveBeenCalledWith(
        'customer.events',
        expect.any(Function)
      );
    });

    it('should handle subscription error', async () => {
      const error = new Error('Subscription failed');
      rabbitMQService.subscribe.mockRejectedValue(error);

      await subscriber.onModuleInit();

      expect(mockLogger.error).toHaveBeenCalledWith(
        '❌ Erreur souscription aux événements clients:',
        error
      );
    });
  });

  describe('handleCustomerEvent', () => {
    let handleCustomerEventMethod: (event: any) => Promise<void>;

    beforeEach(async () => {
      await subscriber.onModuleInit();
      // Récupérer la fonction de callback passée à subscribe
      handleCustomerEventMethod = rabbitMQService.subscribe.mock.calls[0][1];
    });

    it('should handle customer.updated event', async () => {
      const event: CustomerUpdatedEvent = {
        eventType: 'customer.updated',
        customerId: 'customer-123',
        name: 'John Doe',
        email: 'john@example.com',
        isActive: true,
        timestamp: new Date().toISOString(),
      };

      await handleCustomerEventMethod(event);

      expect(mockLogger.log).toHaveBeenCalledWith('📬 Événement client reçu: customer.updated');
      expect(mockLogger.log).toHaveBeenCalledWith('🔄 Client mis à jour: customer-123');
      expect(mockLogger.log).toHaveBeenCalledWith('👤 Nouveau nom pour customer-123: John Doe');
      expect(mockLogger.log).toHaveBeenCalledWith('📧 Nouvel email pour customer-123: john@example.com');
    });

    it('should handle customer.updated event with inactive customer', async () => {
      const event: CustomerUpdatedEvent = {
        eventType: 'customer.updated',
        customerId: 'customer-123',
        isActive: false,
        timestamp: new Date().toISOString(),
      };

      await handleCustomerEventMethod(event);

      expect(mockLogger.log).toHaveBeenCalledWith('🔄 Client mis à jour: customer-123');
      expect(mockLogger.warn).toHaveBeenCalledWith(
        '⚠️ Client customer-123 désactivé - vérifier les commandes en cours'
      );
    });

    it('should handle customer.updated event with partial data', async () => {
      const event: CustomerUpdatedEvent = {
        eventType: 'customer.updated',
        customerId: 'customer-123',
        name: 'Jane Doe',
        timestamp: new Date().toISOString(),
      };

      await handleCustomerEventMethod(event);

      expect(mockLogger.log).toHaveBeenCalledWith('🔄 Client mis à jour: customer-123');
      expect(mockLogger.log).toHaveBeenCalledWith('👤 Nouveau nom pour customer-123: Jane Doe');
      // Ne devrait pas logger d'email car il n'est pas fourni
      expect(mockLogger.log).not.toHaveBeenCalledWith(
        expect.stringContaining('📧 Nouvel email')
      );
    });

    it('should handle customer.deleted event', async () => {
      const event: CustomerDeletedEvent = {
        eventType: 'customer.deleted',
        customerId: 'customer-123',
        timestamp: new Date().toISOString(),
      };

      await handleCustomerEventMethod(event);

      expect(mockLogger.log).toHaveBeenCalledWith('📬 Événement client reçu: customer.deleted');
      expect(mockLogger.warn).toHaveBeenCalledWith('🗑️ Client supprimé: customer-123');
      expect(mockLogger.warn).toHaveBeenCalledWith(
        '⚠️ Vérification nécessaire des commandes du client customer-123'
      );
    });

    it('should handle unknown event type', async () => {
      const event = {
        eventType: 'customer.unknown',
        customerId: 'customer-123',
        timestamp: new Date().toISOString(),
      };

      await handleCustomerEventMethod(event);

      expect(mockLogger.log).toHaveBeenCalledWith('📬 Événement client reçu: customer.unknown');
      expect(mockLogger.warn).toHaveBeenCalledWith('⚠️ Événement client non géré: customer.unknown');
    });

    it('should handle error in event processing', async () => {
      const event: CustomerUpdatedEvent = {
        eventType: 'customer.updated',
        customerId: 'customer-123',
        timestamp: new Date().toISOString(),
      };

      // Simuler une erreur en mockant une méthode privée qui va lever une erreur
      const originalHandleCustomerUpdated = (subscriber as any).handleCustomerUpdated;
      (subscriber as any).handleCustomerUpdated = jest.fn().mockRejectedValue(new Error('Processing error'));

      await expect(handleCustomerEventMethod(event)).rejects.toThrow('Processing error');

      expect(mockLogger.error).toHaveBeenCalledWith(
        '❌ Erreur traitement événement client:',
        expect.any(Error)
      );

      // Restaurer la méthode originale
      (subscriber as any).handleCustomerUpdated = originalHandleCustomerUpdated;
    });
  });

  describe('handleCustomerUpdated', () => {
    it('should handle customer updated with all fields', async () => {
      const event: CustomerUpdatedEvent = {
        eventType: 'customer.updated',
        customerId: 'customer-456',
        name: 'Alice Smith',
        email: 'alice@example.com',
        isActive: true,
        timestamp: new Date().toISOString(),
      };

      // Accéder à la méthode privée pour le test
      await (subscriber as any).handleCustomerUpdated(event);

      expect(mockLogger.log).toHaveBeenCalledWith('🔄 Client mis à jour: customer-456');
      expect(mockLogger.log).toHaveBeenCalledWith('👤 Nouveau nom pour customer-456: Alice Smith');
      expect(mockLogger.log).toHaveBeenCalledWith('📧 Nouvel email pour customer-456: alice@example.com');
    });

    it('should handle customer updated with only name', async () => {
      const event: CustomerUpdatedEvent = {
        eventType: 'customer.updated',
        customerId: 'customer-789',
        name: 'Bob Johnson',
        timestamp: new Date().toISOString(),
      };

      await (subscriber as any).handleCustomerUpdated(event);

      expect(mockLogger.log).toHaveBeenCalledWith('🔄 Client mis à jour: customer-789');
      expect(mockLogger.log).toHaveBeenCalledWith('👤 Nouveau nom pour customer-789: Bob Johnson');
    });

    it('should handle customer updated with only email', async () => {
      const event: CustomerUpdatedEvent = {
        eventType: 'customer.updated',
        customerId: 'customer-101',
        email: 'newemail@example.com',
        timestamp: new Date().toISOString(),
      };

      await (subscriber as any).handleCustomerUpdated(event);

      expect(mockLogger.log).toHaveBeenCalledWith('🔄 Client mis à jour: customer-101');
      expect(mockLogger.log).toHaveBeenCalledWith('📧 Nouvel email pour customer-101: newemail@example.com');
    });

    it('should handle error in customer updated processing', async () => {
      const event: CustomerUpdatedEvent = {
        eventType: 'customer.updated',
        customerId: 'customer-error',
        timestamp: new Date().toISOString(),
      };

      // Simuler une erreur dans le logger
      mockLogger.log.mockImplementationOnce(() => {
        throw new Error('Logger error');
      });

      await expect((subscriber as any).handleCustomerUpdated(event)).rejects.toThrow();

      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('❌ Erreur traitement customer.updated pour customer-error:'),
        expect.any(Error)
      );
    });
  });

  describe('handleCustomerDeleted', () => {
    it('should handle customer deleted event', async () => {
      const event: CustomerDeletedEvent = {
        eventType: 'customer.deleted',
        customerId: 'customer-deleted',
        timestamp: new Date().toISOString(),
      };

      await (subscriber as any).handleCustomerDeleted(event);

      expect(mockLogger.warn).toHaveBeenCalledWith('🗑️ Client supprimé: customer-deleted');
      expect(mockLogger.warn).toHaveBeenCalledWith(
        '⚠️ Vérification nécessaire des commandes du client customer-deleted'
      );
    });

    it('should handle error in customer deleted processing', async () => {
      const event: CustomerDeletedEvent = {
        eventType: 'customer.deleted',
        customerId: 'customer-error',
        timestamp: new Date().toISOString(),
      };

      // Simuler une erreur dans le logger
      mockLogger.warn.mockImplementationOnce(() => {
        throw new Error('Logger error');
      });

      await expect((subscriber as any).handleCustomerDeleted(event)).rejects.toThrow();

      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('❌ Erreur traitement customer.deleted pour customer-error:'),
        expect.any(Error)
      );
    });
  });
});
