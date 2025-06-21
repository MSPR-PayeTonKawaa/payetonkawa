import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { RabbitMQService } from '../rabbitmq.service';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Customer } from '../../entities/customer.entity';

export interface OrderCreatedEvent {
  eventType: 'order.created';
  orderId: string;
  customerId: string;
  totalAmount: number;
  items: Array<{
    productId: string;
    quantity: number;
    unitPrice: number;
  }>;
  timestamp: string;
}

export interface OrderStatusChangedEvent {
  eventType: 'order.status.changed';
  orderId: string;
  customerId: string;
  oldStatus: string;
  newStatus: string;
  timestamp: string;
}

@Injectable()
export class OrderEventSubscriber implements OnModuleInit {
  private readonly logger = new Logger(OrderEventSubscriber.name);

  constructor(
    private readonly rabbitMQService: RabbitMQService,
    @InjectRepository(Customer)
    private readonly customerRepository: Repository<Customer>,
  ) {}

  async onModuleInit() {
    // Attendre un peu que RabbitMQ soit connecté
    setTimeout(async () => {
      await this.subscribeToOrderEvents();
    }, 2000);
  }

  private async subscribeToOrderEvents() {
    try {
      await this.rabbitMQService.subscribe(
        'order.events',
        async (message: any) => {
          await this.handleOrderEvent(message);
        }
      );

      this.logger.log('👂 Écoute des événements de commandes démarrée');
    } catch (error) {
      this.logger.error('❌ Erreur souscription aux événements de commandes:', error);
    }
  }

  private async handleOrderEvent(eventData: any) {
    try {
      const event = typeof eventData === 'string' ? JSON.parse(eventData) : eventData;

      switch (event.eventType) {
        case 'order.created':
          await this.handleOrderCreated(event as OrderCreatedEvent);
          break;
        case 'order.status.changed':
          await this.handleOrderStatusChanged(event as OrderStatusChangedEvent);
          break;
        default:
          this.logger.warn(`Événement ordre non géré: ${event.eventType}`);
      }
    } catch (error) {
      this.logger.error('❌ Erreur traitement événement commande:', error);
      throw error; // Sera envoyé vers la DLQ
    }
  }

  private async handleOrderCreated(event: OrderCreatedEvent) {
    this.logger.log(`📬 Nouvelle commande pour client ${event.customerId}: ${event.orderId}`);

    // Optionnel : vérifier que le client existe toujours
    const customer = await this.customerRepository.findOne({
      where: { id: event.customerId }
    });

    if (!customer) {
      this.logger.warn(`⚠️ Client ${event.customerId} introuvable pour commande ${event.orderId}`);
      return;
    }

    // Ici on pourrait implémenter des notifications, mise à jour de statistiques, etc.
    this.logger.log(`✅ Commande ${event.orderId} enregistrée pour ${customer.name}`);
  }

  private async handleOrderStatusChanged(event: OrderStatusChangedEvent) {
    this.logger.log(`📮 Changement statut commande ${event.orderId}: ${event.oldStatus} → ${event.newStatus}`);

    // Optionnel : notifier le client du changement de statut
    const customer = await this.customerRepository.findOne({
      where: { id: event.customerId }
    });

    if (customer) {
      this.logger.log(`✅ Notification statut envoyée à ${customer.name} pour commande ${event.orderId}`);
      // Ici on pourrait implémenter l'envoi d'emails, notifications push, etc.
    }
  }
} 