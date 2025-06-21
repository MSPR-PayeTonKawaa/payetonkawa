import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { RabbitMQService } from '../rabbitmq.service';

export interface ProductUpdatedEvent {
  eventType: 'product.updated';
  productId: string;
  name?: string;
  price?: number;
  stock?: number;
  isActive?: boolean;
  timestamp: string;
}

export interface ProductDeletedEvent {
  eventType: 'product.deleted';
  productId: string;
  timestamp: string;
}

@Injectable()
export class ProductEventSubscriber implements OnModuleInit {
  private readonly logger = new Logger(ProductEventSubscriber.name);
  private readonly QUEUE = 'product.events';

  constructor(private readonly rabbitMQService: RabbitMQService) {}

  async onModuleInit() {
    // Attendre un peu que RabbitMQ soit connecté
    setTimeout(() => {
      this.subscribeToProductEvents();
    }, 2000);
  }

  private async subscribeToProductEvents() {
    try {
      await this.rabbitMQService.subscribe(
        this.QUEUE,
        this.handleProductEvent.bind(this),
      );
    } catch (error) {
      this.logger.error('❌ Erreur souscription aux événements produits:', error);
    }
  }

  private async handleProductEvent(event: any): Promise<void> {
    try {
      this.logger.log(`📬 Événement produit reçu: ${event.eventType}`);

      switch (event.eventType) {
        case 'product.updated':
          await this.handleProductUpdated(event as ProductUpdatedEvent);
          break;
        case 'product.deleted':
          await this.handleProductDeleted(event as ProductDeletedEvent);
          break;
        default:
          this.logger.warn(`⚠️ Événement produit non géré: ${event.eventType}`);
      }
    } catch (error) {
      this.logger.error('❌ Erreur traitement événement produit:', error);
      throw error;
    }
  }

  private async handleProductUpdated(event: ProductUpdatedEvent): Promise<void> {
    try {
      this.logger.log(`🔄 Produit mis à jour: ${event.productId}`);
      
      // TODO: Ici on pourrait mettre à jour un cache local des produits
      // ou invalider des données en cache pour forcer un refresh
      
      // Pour l'instant, on log juste l'événement
      if (event.price !== undefined) {
        this.logger.log(`💰 Nouveau prix pour ${event.productId}: ${event.price}€`);
      }
      
      if (event.stock !== undefined) {
        this.logger.log(`📦 Nouveau stock pour ${event.productId}: ${event.stock} unités`);
      }

      if (event.isActive === false) {
        this.logger.warn(`⚠️ Produit ${event.productId} désactivé - vérifier les commandes en cours`);
      }

    } catch (error) {
      this.logger.error(`❌ Erreur traitement product.updated pour ${event.productId}:`, error);
      throw error;
    }
  }

  private async handleProductDeleted(event: ProductDeletedEvent): Promise<void> {
    try {
      this.logger.warn(`🗑️ Produit supprimé: ${event.productId}`);
      
      // TODO: Ici on pourrait :
      // 1. Vérifier s'il y a des commandes en cours avec ce produit
      // 2. Marquer ces commandes comme problématiques
      // 3. Notifier les administrateurs
      
      this.logger.warn(`⚠️ Vérification nécessaire des commandes contenant le produit ${event.productId}`);

    } catch (error) {
      this.logger.error(`❌ Erreur traitement product.deleted pour ${event.productId}:`, error);
      throw error;
    }
  }
} 