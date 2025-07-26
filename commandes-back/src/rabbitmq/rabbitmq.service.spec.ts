import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { Logger } from '@nestjs/common';
import { RabbitMQService } from './rabbitmq.service';
import * as amqpConnectionManager from 'amqp-connection-manager';

// Mock amqp-connection-manager
jest.mock('amqp-connection-manager', () => ({
  connect: jest.fn(),
}));

describe('RabbitMQService', () => {
  let service: RabbitMQService;
  let configService: ConfigService;
  let mockConnection: any;
  let mockChannel: any;
  let mockAmqpChannel: any;

  beforeEach(async () => {
    // Créer des mocks pour les objets RabbitMQ
    mockAmqpChannel = {
      prefetch: jest.fn().mockResolvedValue(undefined),
      assertQueue: jest.fn().mockResolvedValue(undefined),
      consume: jest.fn().mockResolvedValue(undefined),
      ack: jest.fn(),
      nack: jest.fn(),
      publish: jest.fn().mockResolvedValue(true),
    };

    mockChannel = {
      publish: jest.fn().mockResolvedValue(true),
      addSetup: jest.fn().mockImplementation((setupFn) => {
        return setupFn(mockAmqpChannel);
      }),
    };

    mockConnection = {
      on: jest.fn(),
      close: jest.fn().mockResolvedValue(undefined),
      createChannel: jest.fn().mockReturnValue(mockChannel),
    };

    (amqpConnectionManager.connect as jest.Mock).mockReturnValue(mockConnection);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RabbitMQService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockReturnValue('amqp://test:test@localhost:5672/test'),
          },
        },
      ],
    }).compile();

    // Désactiver les logs pour les tests
    jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Logger.prototype, 'warn').mockImplementation();
    jest.spyOn(Logger.prototype, 'error').mockImplementation();

    service = module.get<RabbitMQService>(RabbitMQService);
    configService = module.get<ConfigService>(ConfigService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('onModuleInit', () => {
    it('should call connect method', async () => {
      const connectSpy = jest.spyOn(service as any, 'connect').mockResolvedValue(undefined);

      await service.onModuleInit();

      expect(connectSpy).toHaveBeenCalled();
    });

    it('should handle connection errors gracefully', async () => {
      const error = new Error('Connection failed');
      jest.spyOn(service as any, 'connect').mockRejectedValue(error);
      const loggerSpy = jest.spyOn(Logger.prototype, 'error');

      await service.onModuleInit();

      // Attendre un peu pour que la promesse soit rejetée
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(loggerSpy).toHaveBeenCalledWith('❌ Connexion RabbitMQ échouée au démarrage:', error);
    });
  });

  describe('onModuleDestroy', () => {
    it('should close connection if exists', async () => {
      // Simuler une connexion établie
      (service as any).connection = mockConnection;

      await service.onModuleDestroy();

      expect(mockConnection.close).toHaveBeenCalled();
    });

    it('should not throw error if no connection exists', async () => {
      (service as any).connection = null;

      await expect(service.onModuleDestroy()).resolves.not.toThrow();
    });
  });

  describe('connect', () => {
    it('should establish connection with default URL', async () => {
      await (service as any).connect();

      expect(configService.get).toHaveBeenCalledWith('RABBITMQ_URL', 'amqp://payetonkawa:rabbitmq123@localhost:5672/payetonkawa');
      expect(amqpConnectionManager.connect).toHaveBeenCalledWith(
        ['amqp://test:test@localhost:5672/test'],
        {
          reconnectTimeInSeconds: 5,
          heartbeatIntervalInSeconds: 5,
        }
      );
    });

    it('should setup connection event listeners', async () => {
      await (service as any).connect();

      expect(mockConnection.on).toHaveBeenCalledWith('connect', expect.any(Function));
      expect(mockConnection.on).toHaveBeenCalledWith('disconnect', expect.any(Function));
    });

    it('should create channel with prefetch configuration', async () => {
      await (service as any).connect();

      expect(mockConnection.createChannel).toHaveBeenCalledWith({
        setup: expect.any(Function),
      });
      // Le prefetch est appelé dans la fonction setup, simulons l'appel
      const setupFn = mockConnection.createChannel.mock.calls[0][0].setup;
      await setupFn(mockAmqpChannel);
      expect(mockAmqpChannel.prefetch).toHaveBeenCalledWith(10);
    });

    it('should handle connection errors', async () => {
      const error = new Error('Connection error');
      (amqpConnectionManager.connect as jest.Mock).mockImplementation(() => {
        throw error;
      });

      await expect((service as any).connect()).rejects.toThrow(error);
    });
  });

  describe('publish', () => {
    beforeEach(async () => {
      await (service as any).connect();
    });

    it('should publish message successfully', async () => {
      const exchange = 'test.exchange';
      const routingKey = 'test.routing.key';
      const message = { test: 'data' };

      await service.publish(exchange, routingKey, message);

      expect(mockChannel.publish).toHaveBeenCalledWith(
        exchange,
        routingKey,
        Buffer.from(JSON.stringify(message)),
        {
          persistent: true,
          timestamp: expect.any(Number),
          messageId: expect.any(String),
          appId: 'commandes-api',
        }
      );
    });

    it('should handle missing channel gracefully', async () => {
      (service as any).channel = null;
      const loggerSpy = jest.spyOn(Logger.prototype, 'warn');

      await service.publish('exchange', 'key', {});

      expect(loggerSpy).toHaveBeenCalledWith('⚠️ RabbitMQ non connecté, message ignoré: exchange/key');
    });

    it('should handle publish errors gracefully', async () => {
      const error = new Error('Publish error');
      mockChannel.publish.mockRejectedValue(error);
      const loggerSpy = jest.spyOn(Logger.prototype, 'error');

      await service.publish('exchange', 'key', {});

      expect(loggerSpy).toHaveBeenCalledWith('❌ Erreur publication: exchange/key', error);
    });

    it('should generate unique message IDs', async () => {
      const calls: any[] = [];
      mockChannel.publish.mockImplementation((...args) => {
        calls.push(args);
        return Promise.resolve(true);
      });

      await service.publish('exchange', 'key1', {});
      await service.publish('exchange', 'key2', {});

      expect(calls).toHaveLength(2);
      expect(calls[0][3].messageId).not.toBe(calls[1][3].messageId);
    });
  });

  describe('subscribe', () => {
    let mockHandler: jest.Mock;

    beforeEach(async () => {
      mockHandler = jest.fn().mockResolvedValue(undefined);
      await (service as any).connect();
    });

    it('should subscribe to queue successfully', async () => {
      const queueName = 'test.queue';

      await service.subscribe(queueName, mockHandler);

      expect(mockChannel.addSetup).toHaveBeenCalled();
      expect(mockAmqpChannel.assertQueue).toHaveBeenCalledWith(queueName, {
        durable: true,
        exclusive: false,
        autoDelete: false,
      });
      expect(mockAmqpChannel.consume).toHaveBeenCalledWith(
        queueName,
        expect.any(Function)
      );
    });

    it('should handle messages correctly', async () => {
      const queueName = 'test.queue';
      const testMessage = { test: 'data' };
      const mockMessage = {
        content: Buffer.from(JSON.stringify(testMessage)),
      };

      let consumeHandler: Function | undefined;
      mockAmqpChannel.consume.mockImplementation((queue, handler) => {
        consumeHandler = handler;
      });

      await service.subscribe(queueName, mockHandler);

      // Simuler la réception d'un message
      if (consumeHandler) {
        await consumeHandler(mockMessage);
      }

      expect(mockHandler).toHaveBeenCalledWith(testMessage);
      expect(mockAmqpChannel.ack).toHaveBeenCalledWith(mockMessage);
    });

    it('should handle message processing errors', async () => {
      const queueName = 'test.queue';
      const error = new Error('Handler error');
      mockHandler.mockRejectedValue(error);

      const mockMessage = {
        content: Buffer.from(JSON.stringify({ test: 'data' })),
      };

      let consumeHandler: Function | undefined;
      mockAmqpChannel.consume.mockImplementation((queue, handler) => {
        consumeHandler = handler;
      });

      await service.subscribe(queueName, mockHandler);

      const loggerSpy = jest.spyOn(Logger.prototype, 'error');

      // Simuler la réception d'un message qui échoue
      if (consumeHandler) {
        await consumeHandler(mockMessage);
      }

      expect(loggerSpy).toHaveBeenCalledWith(
        `❌ Erreur traitement message ${queueName}:`,
        error
      );
      expect(mockAmqpChannel.nack).toHaveBeenCalledWith(mockMessage, false, false);
    });

    it('should handle null messages', async () => {
      const queueName = 'test.queue';

      let consumeHandler: Function | undefined;
      mockAmqpChannel.consume.mockImplementation((queue, handler) => {
        consumeHandler = handler;
      });

      await service.subscribe(queueName, mockHandler);

      // Simuler un message null
      if (consumeHandler) {
        await consumeHandler(null);
      }

      expect(mockHandler).not.toHaveBeenCalled();
      expect(mockAmqpChannel.ack).not.toHaveBeenCalled();
    });

    it('should handle missing channel gracefully', async () => {
      (service as any).channel = null;
      const loggerSpy = jest.spyOn(Logger.prototype, 'warn');

      await service.subscribe('queue', mockHandler);

      expect(loggerSpy).toHaveBeenCalledWith('⚠️ RabbitMQ non connecté, souscription ignorée: queue');
    });

    it('should handle subscription errors', async () => {
      const error = new Error('Subscribe error');
      mockChannel.addSetup.mockRejectedValue(error);

      await expect(service.subscribe('queue', mockHandler)).rejects.toThrow(error);
    });
  });

  describe('getConnection', () => {
    it('should return connection', async () => {
      await (service as any).connect();

      expect(service.getConnection()).toBe(mockConnection);
    });

    it('should return undefined if no connection', () => {
      expect(service.getConnection()).toBeUndefined();
    });
  });

  describe('getChannel', () => {
    it('should return channel', async () => {
      await (service as any).connect();

      expect(service.getChannel()).toBe(mockChannel);
    });

    it('should return undefined if no channel', () => {
      expect(service.getChannel()).toBeUndefined();
    });
  });
});
