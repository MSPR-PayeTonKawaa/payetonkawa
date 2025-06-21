import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RabbitMQService } from './rabbitmq.service';
import { ProductEventPublisher } from './publishers/product-event.publisher';
import { StockEventPublisher } from './publishers/stock-event.publisher';
import { OrderEventSubscriber } from './subscribers/order-event.subscriber';
import { ProductEventSubscriber } from './subscribers/product-event.subscriber';
import { CustomerEventSubscriber } from './subscribers/customer-event.subscriber';
import { Product } from '../entities/product.entity';

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([Product]),
  ],
  providers: [
    RabbitMQService,
    ProductEventPublisher,
    StockEventPublisher,
    OrderEventSubscriber,
    ProductEventSubscriber,
    CustomerEventSubscriber,
  ],
  exports: [
    RabbitMQService,
    ProductEventPublisher,
    StockEventPublisher,
    OrderEventSubscriber,
    ProductEventSubscriber,
    CustomerEventSubscriber,
  ],
})
export class RabbitMQModule {} 