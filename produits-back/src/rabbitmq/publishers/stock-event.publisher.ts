import { Injectable, Logger } from '@nestjs/common';
import { RabbitMQService } from '../rabbitmq.service';
import { Product } from '../../entities/product.entity';
import { StockStatus } from '../../entities/product.entity';

export interface StockUpdatedEvent {
  eventType: 'stock.updated';
  productId: string;
  productName: string;
  oldStock: number;
  newStock: number;
  stockStatus: StockStatus;
  timestamp: string;
}

export interface StockLowEvent {
  eventType: 'stock.low';
  productId: string;
  productName: string;
  currentStock: number;
  threshold: number;
  timestamp: string;
}

export interface StockEmptyEvent {
  eventType: 'stock.empty';
  productId: string;
  productName: string;
  timestamp: string;
}

@Injectable()
export class StockEventPublisher {
  private readonly logger = new Logger(StockEventPublisher.name);
  private readonly EXCHANGE = 'payetonkawa.events';
  private readonly LOW_STOCK_THRESHOLD = 100;

  constructor(private readonly rabbitMQService: RabbitMQService) {}

  async publishStockUpdated(product: Product, oldStock: number): Promise<void> {
    try {
      const event: StockUpdatedEvent = {
        eventType: 'stock.updated',
        productId: product.id,
        productName: product.name,
        oldStock,
        newStock: product.stock,
        stockStatus: product.stockStatus,
        timestamp: new Date().toISOString(),
      };

      await this.rabbitMQService.publish(
        this.EXCHANGE,
        'stock.updated',
        event
      );

      this.logger.log(`✅ Événement stock.updated publié: ${product.name} (${oldStock} → ${product.stock})`);

      // Vérifier s'il faut publier des alertes
      await this.checkAndPublishAlerts(product);

    } catch (error) {
      this.logger.error(`❌ Erreur publication stock.updated pour ${product.id}:`, error);
      // Ne pas faire échouer l'opération métier
    }
  }

  async publishStockLow(product: Product): Promise<void> {
    try {
      const event: StockLowEvent = {
        eventType: 'stock.low',
        productId: product.id,
        productName: product.name,
        currentStock: product.stock,
        threshold: this.LOW_STOCK_THRESHOLD,
        timestamp: new Date().toISOString(),
      };

      await this.rabbitMQService.publish(
        this.EXCHANGE,
        'stock.low',
        event
      );

      this.logger.warn(`⚠️ Alerte stock faible: ${product.name} (${product.stock} unités)`);
    } catch (error) {
      this.logger.error(`❌ Erreur publication stock.low pour ${product.id}:`, error);
    }
  }

  async publishStockEmpty(product: Product): Promise<void> {
    try {
      const event: StockEmptyEvent = {
        eventType: 'stock.empty',
        productId: product.id,
        productName: product.name,
        timestamp: new Date().toISOString(),
      };

      await this.rabbitMQService.publish(
        this.EXCHANGE,
        'stock.empty',
        event
      );

      this.logger.error(`💀 Alerte rupture de stock: ${product.name}`);
    } catch (error) {
      this.logger.error(`❌ Erreur publication stock.empty pour ${product.id}:`, error);
    }
  }

  private async checkAndPublishAlerts(product: Product): Promise<void> {
    if (product.stock === 0) {
      await this.publishStockEmpty(product);
    } else if (product.stock < this.LOW_STOCK_THRESHOLD && product.stock > 0) {
      await this.publishStockLow(product);
    }
  }
} 