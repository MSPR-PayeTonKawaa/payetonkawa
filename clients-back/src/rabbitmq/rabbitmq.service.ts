import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as amqp from 'amqplib';
import { connect } from 'amqp-connection-manager';

@Injectable()
export class RabbitMQService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RabbitMQService.name);
  private connection: any;
  private channel: any;

  constructor(private configService: ConfigService) {}

  async onModuleInit() {
    // Connexion en arrière-plan pour ne pas bloquer le démarrage
    this.connect().catch(error => {
      this.logger.error('❌ Connexion RabbitMQ échouée au démarrage:', error);
    });
  }

  async onModuleDestroy() {
    if (this.connection) {
      await this.connection.close();
    }
  }

  private async connect() {
    try {
      const rabbitmqUrl = this.configService.get<string>('RABBITMQ_URL', 'amqp://payetonkawa:rabbitmq123@localhost:5672/payetonkawa');
      
      this.logger.log(`🐰 Connexion à RabbitMQ: ${rabbitmqUrl}`);
      
      this.connection = connect([rabbitmqUrl], {
        reconnectTimeInSeconds: 5,
        heartbeatIntervalInSeconds: 5,
      });

      this.connection.on('connect', () => {
        this.logger.log('✅ Connecté à RabbitMQ');
      });

      this.connection.on('disconnect', (err: any) => {
        this.logger.warn('❌ Déconnecté de RabbitMQ', err);
      });

      // Créer un channel wrapper
      this.channel = this.connection.createChannel({
        setup: async (channel: amqp.Channel) => {
          // Configuration du channel si nécessaire
          await channel.prefetch(10); // Limite le nombre de messages non-acquittés
        },
      });

    } catch (error) {
      this.logger.error('❌ Erreur connexion RabbitMQ:', error);
      throw error;
    }
  }

  async publish(exchange: string, routingKey: string, message: any): Promise<void> {
    try {
      if (!this.channel) {
        this.logger.warn(`⚠️ RabbitMQ non connecté, message ignoré: ${exchange}/${routingKey}`);
        return;
      }

      const messageBuffer = Buffer.from(JSON.stringify(message));
      
      await this.channel.publish(exchange, routingKey, messageBuffer, {
        persistent: true,
        timestamp: Date.now(),
        messageId: `${Date.now()}-${Math.random()}`,
        appId: 'clients-api',
      });

      this.logger.log(`📨 Message publié: ${exchange}/${routingKey}`);
    } catch (error) {
      this.logger.error(`❌ Erreur publication: ${exchange}/${routingKey}`, error);
      // Ne pas faire échouer l'opération métier
    }
  }

  async subscribe(queueName: string, handler: (message: any) => Promise<void>): Promise<void> {
    try {
      if (!this.channel) {
        this.logger.warn(`⚠️ RabbitMQ non connecté, souscription ignorée: ${queueName}`);
        return;
      }

      await this.channel.addSetup(async (channel: amqp.Channel) => {
        // 🔧 DÉCLARATION AUTOMATIQUE DE LA QUEUE
        await channel.assertQueue(queueName, {
          durable: true,
          exclusive: false,
          autoDelete: false,
        });

        this.logger.log(`📦 Queue déclarée: ${queueName}`);

        await channel.consume(queueName, async (message: amqp.ConsumeMessage | null) => {
          if (message) {
            try {
              const content = JSON.parse(message.content.toString());
              await handler(content);
              channel.ack(message);
              
              this.logger.log(`✅ Message traité: ${queueName}`);
            } catch (error) {
              this.logger.error(`❌ Erreur traitement message ${queueName}:`, error);
              // Rejeter le message vers la DLQ
              channel.nack(message, false, false);
            }
          }
        });

        this.logger.log(`👂 Écoute de la queue: ${queueName}`);
      });

    } catch (error) {
      this.logger.error(`❌ Erreur souscription: ${queueName}`, error);
      throw error;
    }
  }

  getConnection() {
    return this.connection;
  }

  getChannel() {
    return this.channel;
  }
} 