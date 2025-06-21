import { Injectable, Logger } from '@nestjs/common';
import { RabbitMQService } from '../rabbitmq.service';
import { Product } from '../../entities/product.entity';

export interface ProductCreatedEvent {
  eventType: 'product.created';
  productId: string;
  name: string;
  stock: number;
  price: number;
  category: string;
  timestamp: string;
}

export interface ProductUpdatedEvent {
  eventType: 'product.updated';
  productId: string;
  name: string;
  stock: number;
  price: number;
  category: string;
  changes: string[];
  timestamp: string;
}

export interface ProductDeletedEvent {
  eventType: 'product.deleted';
  productId: string;
  name: string;
  timestamp: string;
}

@Injectable()
export class ProductEventPublisher {
  private readonly logger = new Logger(ProductEventPublisher.name);
  private readonly EXCHANGE = 'payetonkawa.events';

  constructor(private readonly rabbitMQService: RabbitMQService) {}

  async publishProductCreated(product: Product): Promise<void> {
    try {
      const event: ProductCreatedEvent = {
        eventType: 'product.created',
        productId: product.id,
        name: product.name,
        stock: product.stock,
        price: product.details?.price || 0,
        category: product.details?.category || 'unknown',
        timestamp: new Date().toISOString(),
      };

      await this.rabbitMQService.publish(
        this.EXCHANGE,
        'product.created',
        event
      );

      this.logger.log(`✅ Événement product.created publié pour produit ${product.name}`);
    } catch (error) {
      this.logger.error(`❌ Erreur publication product.created pour ${product.id}:`, error);
      // Ne pas faire échouer l'opération métier
    }
  }

  async publishProductUpdated(product: Product, changes: string[]): Promise<void> {
    try {
      const event: ProductUpdatedEvent = {
        eventType: 'product.updated',
        productId: product.id,
        name: product.name,
        stock: product.stock,
        price: product.details?.price || 0,
        category: product.details?.category || 'unknown',
        changes,
        timestamp: new Date().toISOString(),
      };

      await this.rabbitMQService.publish(
        this.EXCHANGE,
        'product.updated',
        event
      );

      this.logger.log(`✅ Événement product.updated publié pour produit ${product.name}`);
    } catch (error) {
      this.logger.error(`❌ Erreur publication product.updated pour ${product.id}:`, error);
      // Ne pas faire échouer l'opération métier
    }
  }

  async publishProductDeleted(productId: string, productName: string): Promise<void> {
    try {
      const event: ProductDeletedEvent = {
        eventType: 'product.deleted',
        productId,
        name: productName,
        timestamp: new Date().toISOString(),
      };

      await this.rabbitMQService.publish(
        this.EXCHANGE,
        'product.deleted',
        event
      );

      this.logger.log(`✅ Événement product.deleted publié pour produit ${productName}`);
    } catch (error) {
      this.logger.error(`❌ Erreur publication product.deleted pour ${productId}:`, error);
      // Ne pas faire échouer l'opération métier
    }
  }
} 