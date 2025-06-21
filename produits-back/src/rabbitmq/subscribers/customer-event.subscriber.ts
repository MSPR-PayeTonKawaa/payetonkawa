import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { RabbitMQService } from '../rabbitmq.service';

export interface CustomerUpdatedEvent {
  eventType: 'customer.updated';
  customerId: string;
  name?: string;
  email?: string;
  isActive?: boolean;
  timestamp: string;
}

export interface CustomerDeletedEvent {
  eventType: 'customer.deleted';
  customerId: string;
  timestamp: string;
}

@Injectable()
export class CustomerEventSubscriber implements OnModuleInit {
  private readonly logger = new Logger(CustomerEventSubscriber.name);
  private readonly QUEUE = 'customer.events';

  constructor(private readonly rabbitMQService: RabbitMQService) {}

  async onModuleInit() {
    // Attendre un peu que RabbitMQ soit connecté
    setTimeout(() => {
      this.subscribeToCustomerEvents();
    }, 2000);
  }

  private async subscribeToCustomerEvents() {
    try {
      await this.rabbitMQService.subscribe(
        this.QUEUE,
        this.handleCustomerEvent.bind(this),
      );
    } catch (error) {
      this.logger.error('❌ Erreur souscription aux événements clients:', error);
    }
  }

  private async handleCustomerEvent(event: any): Promise<void> {
    try {
      this.logger.log(`📬 Événement client reçu: ${event.eventType}`);

      switch (event.eventType) {
        case 'customer.updated':
          await this.handleCustomerUpdated(event as CustomerUpdatedEvent);
          break;
        case 'customer.deleted':
          await this.handleCustomerDeleted(event as CustomerDeletedEvent);
          break;
        default:
          this.logger.warn(`⚠️ Événement client non géré: ${event.eventType}`);
      }
    } catch (error) {
      this.logger.error('❌ Erreur traitement événement client:', error);
      throw error;
    }
  }

  private async handleCustomerUpdated(event: CustomerUpdatedEvent): Promise<void> {
    try {
      this.logger.log(`🔄 Client mis à jour: ${event.customerId}`);
      
      // TODO: Ici on pourrait mettre à jour un cache local des clients
      // ou invalider des données en cache pour forcer un refresh
      
      // Pour l'instant, on log juste l'événement
      if (event.name) {
        this.logger.log(`👤 Nouveau nom pour ${event.customerId}: ${event.name}`);
      }
      
      if (event.email) {
        this.logger.log(`📧 Nouvel email pour ${event.customerId}: ${event.email}`);
      }

      if (event.isActive === false) {
        this.logger.warn(`⚠️ Client ${event.customerId} désactivé - vérifier les commandes en cours`);
      }

    } catch (error) {
      this.logger.error(`❌ Erreur traitement customer.updated pour ${event.customerId}:`, error);
      throw error;
    }
  }

  private async handleCustomerDeleted(event: CustomerDeletedEvent): Promise<void> {
    try {
      this.logger.warn(`🗑️ Client supprimé: ${event.customerId}`);
      
      // TODO: Ici on pourrait :
      // 1. Vérifier s'il y a des commandes en cours pour ce client
      // 2. Marquer ces commandes comme problématiques
      // 3. Archiver les données du client
      // 4. Notifier les administrateurs
      
      this.logger.warn(`⚠️ Vérification nécessaire des commandes du client ${event.customerId}`);

    } catch (error) {
      this.logger.error(`❌ Erreur traitement customer.deleted pour ${event.customerId}:`, error);
      throw error;
    }
  }
} 