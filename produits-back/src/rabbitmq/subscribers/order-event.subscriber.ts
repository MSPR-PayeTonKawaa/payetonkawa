import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { RabbitMQService } from '../rabbitmq.service';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Product } from '../../entities/product.entity';
import { StockEventPublisher } from '../publishers/stock-event.publisher';

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

export interface OrderCancelledEvent {
  eventType: 'order.cancelled';
  orderId: string;
  customerId: string;
  items: Array<{
    productId: string;
    quantity: number;
  }>;
  timestamp: string;
}

@Injectable()
export class OrderEventSubscriber implements OnModuleInit {
  private readonly logger = new Logger(OrderEventSubscriber.name);

  constructor(
    private readonly rabbitMQService: RabbitMQService,
    private readonly stockEventPublisher: StockEventPublisher,
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
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
        case 'order.cancelled':
          await this.handleOrderCancelled(event as OrderCancelledEvent);
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
    this.logger.log(`📦 Traitement commande créée: ${event.orderId}`);

    for (const item of event.items) {
      try {
        await this.decrementStock(item.productId, item.quantity);
      } catch (error) {
        this.logger.error(`❌ Erreur décrément stock produit ${item.productId}:`, error);
        throw error;
      }
    }

    this.logger.log(`✅ Stock mis à jour pour commande ${event.orderId}`);
  }

  private async handleOrderCancelled(event: OrderCancelledEvent) {
    this.logger.log(`🔄 Traitement commande annulée: ${event.orderId}`);

    for (const item of event.items) {
      try {
        await this.incrementStock(item.productId, item.quantity);
      } catch (error) {
        this.logger.error(`❌ Erreur incrément stock produit ${item.productId}:`, error);
        throw error;
      }
    }

    this.logger.log(`✅ Stock restauré pour commande annulée ${event.orderId}`);
  }

  private async decrementStock(productId: string, quantity: number) {
    const product = await this.productRepository.findOne({
      where: { id: productId },
      relations: ['details'],
    });

    if (!product) {
      throw new Error(`Produit ${productId} introuvable`);
    }

    const oldStock = product.stock;
    const newStock = Math.max(0, product.stock - quantity);

    if (newStock !== product.stock) {
      product.stock = newStock;
      await this.productRepository.save(product);

      // Publier événement de stock mis à jour
      await this.stockEventPublisher.publishStockUpdated(product, oldStock);

      this.logger.log(`📉 Stock décrementé: ${product.name} (${oldStock} → ${newStock})`);
    }
  }

  private async incrementStock(productId: string, quantity: number) {
    const product = await this.productRepository.findOne({
      where: { id: productId },
      relations: ['details'],
    });

    if (!product) {
      throw new Error(`Produit ${productId} introuvable`);
    }

    const oldStock = product.stock;
    product.stock += quantity;

    await this.productRepository.save(product);

    // Publier événement de stock mis à jour
    await this.stockEventPublisher.publishStockUpdated(product, oldStock);

    this.logger.log(`📈 Stock incrémenté: ${product.name} (${oldStock} → ${product.stock})`);
  }
} 