import { Injectable, NotFoundException, BadRequestException, ConflictException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindManyOptions, Between } from 'typeorm';
import { plainToClass } from 'class-transformer';

import { Order, OrderItem, OrderStatus } from '../entities';
import {
  CreateOrderDto,
  UpdateOrderDto,
  UpdateOrderStatusDto,
  OrderResponseDto,
  OrderListResponseDto,
  OrderStatsResponseDto,
} from '../dto';
import { OrderEventPublisher } from '../rabbitmq/publishers/order-event.publisher';

export interface FindOrdersOptions {
  page?: number;
  limit?: number;
  customerId?: string;
  status?: OrderStatus;
  dateFrom?: Date;
  dateTo?: Date;
  minAmount?: number;
  maxAmount?: number;
}

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);

  constructor(
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
    @InjectRepository(OrderItem)
    private readonly orderItemRepository: Repository<OrderItem>,
    private readonly orderEventPublisher: OrderEventPublisher,
  ) {}

  /**
   * Crée une nouvelle commande avec validation métier
   */
  async create(createOrderDto: CreateOrderDto): Promise<OrderResponseDto> {
    this.logger.log(`Création d'une nouvelle commande pour le client ${createOrderDto.customerId}`);

    // TODO: Vérifier que le client existe (appel au service clients)
    // await this.validateCustomerExists(createOrderDto.customerId);

    // TODO: Vérifier la disponibilité des produits et récupérer leurs prix
    // await this.validateProductsAvailability(createOrderDto.items);

    // Créer la commande
    const order = this.orderRepository.create({
      customerId: createOrderDto.customerId,
      status: createOrderDto.status || OrderStatus.PENDING,
      items: createOrderDto.items.map(item => 
        this.orderItemRepository.create({
          productId: item.productId,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
        })
      ),
    });

    // Calculer le total automatiquement via les hooks
    const savedOrder = await this.orderRepository.save(order);

    this.logger.log(`Commande créée avec succès - ID: ${savedOrder.id}, Total: ${savedOrder.totalAmount}€`);

    // Publier l'événement OrderCreated vers RabbitMQ
    try {
      this.logger.log(`🔍 Tentative publication événement pour commande ${savedOrder.id}`);
      this.logger.log(`🔍 OrderEventPublisher disponible: ${!!this.orderEventPublisher}`);
      
      if (!this.orderEventPublisher) {
        this.logger.error('❌ OrderEventPublisher non injecté !');
        return this.mapToResponseDto(savedOrder);
      }

      await this.orderEventPublisher.publishOrderCreated(savedOrder);
      this.logger.log(`✅ Publication réussie pour commande ${savedOrder.id}`);
    } catch (error) {
      this.logger.warn(`Erreur publication événement order.created pour ${savedOrder.id}:`, error);
      // Ne pas faire échouer la création pour un problème de messaging
    }

    return this.mapToResponseDto(savedOrder);
  }

  /**
   * Récupère toutes les commandes avec pagination et filtres
   */
  async findAll(options: FindOrdersOptions = {}): Promise<OrderListResponseDto> {
    const {
      page = 1,
      limit = 10,
      customerId,
      status,
      dateFrom,
      dateTo,
      minAmount,
      maxAmount,
    } = options;

    this.logger.log(`Récupération des commandes - Page: ${page}, Limite: ${limit}`);

    const queryBuilder = this.orderRepository.createQueryBuilder('order')
      .leftJoinAndSelect('order.items', 'items')
      .orderBy('order.createdAt', 'DESC');

    // Filtres
    if (customerId) {
      queryBuilder.andWhere('order.customerId = :customerId', { customerId });
    }

    if (status) {
      queryBuilder.andWhere('order.status = :status', { status });
    }

    if (dateFrom && dateTo) {
      queryBuilder.andWhere('order.createdAt BETWEEN :dateFrom AND :dateTo', {
        dateFrom,
        dateTo,
      });
    }

    if (minAmount !== undefined) {
      queryBuilder.andWhere('order.totalAmount >= :minAmount', { minAmount });
    }

    if (maxAmount !== undefined) {
      queryBuilder.andWhere('order.totalAmount <= :maxAmount', { maxAmount });
    }

    // Pagination
    const skip = (page - 1) * limit;
    queryBuilder.skip(skip).take(limit);

    const [orders, total] = await queryBuilder.getManyAndCount();

    const data = orders.map(order => this.mapToResponseDto(order));

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Récupère une commande par son ID
   */
  async findOne(id: string): Promise<OrderResponseDto> {
    this.logger.log(`Récupération de la commande ${id}`);

    const order = await this.orderRepository.findOne({
      where: { id },
      relations: ['items'],
    });

    if (!order) {
      throw new NotFoundException(`Commande avec l'ID ${id} non trouvée`);
    }

    return this.mapToResponseDto(order);
  }

  /**
   * Met à jour une commande (seulement si elle est en attente)
   */
  async update(id: string, updateOrderDto: UpdateOrderDto): Promise<OrderResponseDto> {
    this.logger.log(`Mise à jour de la commande ${id}`);

    const order = await this.orderRepository.findOne({
      where: { id },
      relations: ['items'],
    });

    if (!order) {
      throw new NotFoundException(`Commande avec l'ID ${id} non trouvée`);
    }

    if (!order.canBeModified()) {
      throw new BadRequestException(`La commande ${id} ne peut plus être modifiée (statut: ${order.status})`);
    }

    // Mise à jour des champs autorisés
    if (updateOrderDto.items) {
      // Supprimer les anciens articles
      await this.orderItemRepository.delete({ orderId: id });

      // Créer les nouveaux articles
      order.items = updateOrderDto.items.map(item =>
        this.orderItemRepository.create({
          orderId: id,
          productId: item.productId,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
        })
      );
    }

    const updatedOrder = await this.orderRepository.save(order);

    this.logger.log(`Commande ${id} mise à jour avec succès`);

    return this.mapToResponseDto(updatedOrder);
  }

  /**
   * Met à jour le statut d'une commande avec validation des transitions
   */
  async updateStatus(id: string, updateStatusDto: UpdateOrderStatusDto): Promise<OrderResponseDto> {
    this.logger.log(`Mise à jour du statut de la commande ${id} vers ${updateStatusDto.status}`);

    const order = await this.orderRepository.findOne({
      where: { id },
      relations: ['items'],
    });

    if (!order) {
      throw new NotFoundException(`Commande avec l'ID ${id} non trouvée`);
    }

    // Validation des transitions de statut
    this.validateStatusTransition(order.status, updateStatusDto.status);

    const oldStatus = order.status;
    order.status = updateStatusDto.status;

    const updatedOrder = await this.orderRepository.save(order);

    this.logger.log(`Statut de la commande ${id} mis à jour: ${oldStatus} -> ${updateStatusDto.status}`);

    // Publier les événements métier appropriés
    try {
      if (updateStatusDto.status === OrderStatus.CANCELLED) {
        await this.orderEventPublisher.publishOrderCancelled(updatedOrder);
      } else {
        await this.orderEventPublisher.publishOrderStatusChanged(updatedOrder, oldStatus);
      }
    } catch (error) {
      this.logger.warn(`Erreur publication événement pour ${updatedOrder.id}:`, error);
      // Ne pas faire échouer la mise à jour pour un problème de messaging
    }

    return this.mapToResponseDto(updatedOrder);
  }

  /**
   * Supprime une commande (seulement si elle peut être annulée)
   */
  async remove(id: string): Promise<void> {
    this.logger.log(`Suppression de la commande ${id}`);

    const order = await this.orderRepository.findOne({ where: { id } });

    if (!order) {
      throw new NotFoundException(`Commande avec l'ID ${id} non trouvée`);
    }

    if (!order.canBeCancelled()) {
      throw new BadRequestException(`La commande ${id} ne peut pas être supprimée (statut: ${order.status})`);
    }

    await this.orderRepository.remove(order);

    this.logger.log(`Commande ${id} supprimée avec succès`);
  }

  /**
   * Récupère les commandes d'un client spécifique
   */
  async findByCustomer(customerId: string, options: FindOrdersOptions = {}): Promise<OrderListResponseDto> {
    this.logger.log(`Récupération des commandes du client ${customerId}`);

    return this.findAll({ ...options, customerId });
  }

  /**
   * Récupère les statistiques des commandes
   */
  async getStats(): Promise<OrderStatsResponseDto> {
    this.logger.log('Récupération des statistiques des commandes');

    const totalOrders = await this.orderRepository.count();

    // Commandes par statut
    const statusCounts = await this.orderRepository
      .createQueryBuilder('order')
      .select('order.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .groupBy('order.status')
      .getRawMany();

    const ordersByStatus = statusCounts.reduce((acc, item) => {
      acc[item.status] = parseInt(item.count);
      return acc;
    }, {} as Record<OrderStatus, number>);

    // Chiffre d'affaires total
    const revenueResult = await this.orderRepository
      .createQueryBuilder('order')
      .select('SUM(order.totalAmount)', 'total')
      .where('order.status IN (:...statuses)', {
        statuses: [OrderStatus.CONFIRMED, OrderStatus.SHIPPED, OrderStatus.DELIVERED]
      })
      .getRawOne();

    const totalRevenue = parseFloat(revenueResult.total) || 0;

    // Panier moyen
    const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

    // Commandes du jour
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const todayOrders = await this.orderRepository.count({
      where: {
        createdAt: Between(today, tomorrow),
      },
    });

    return {
      totalOrders,
      ordersByStatus,
      totalRevenue,
      averageOrderValue,
      todayOrders,
    };
  }

  /**
   * Valide les transitions de statut autorisées
   */
  private validateStatusTransition(currentStatus: OrderStatus, newStatus: OrderStatus): void {
    const allowedTransitions: Record<OrderStatus, OrderStatus[]> = {
      [OrderStatus.PENDING]: [OrderStatus.CONFIRMED, OrderStatus.CANCELLED],
      [OrderStatus.CONFIRMED]: [OrderStatus.SHIPPED, OrderStatus.CANCELLED],
      [OrderStatus.SHIPPED]: [OrderStatus.DELIVERED],
      [OrderStatus.DELIVERED]: [], // Statut final
      [OrderStatus.CANCELLED]: [], // Statut final
    };

    if (!allowedTransitions[currentStatus].includes(newStatus)) {
      throw new BadRequestException(
        `Transition de statut non autorisée: ${currentStatus} -> ${newStatus}`
      );
    }
  }

  /**
   * Mappe une entité Order vers un DTO de réponse
   */
  private mapToResponseDto(order: Order): OrderResponseDto {
    const dto = plainToClass(OrderResponseDto, order, {
      excludeExtraneousValues: true,
    });

    // Ajouter les champs calculés
    dto.totalQuantity = order.getTotalQuantity();
    dto.itemsCount = order.items?.length || 0;

    return dto;
  }

  /**
   * TODO: Valider que le client existe (appel au service clients)
   */
  private async validateCustomerExists(customerId: string): Promise<void> {
    // Implémentation future avec appel HTTP au service clients
    // ou écoute des événements CustomerCreated/CustomerDeleted
  }

  /**
   * TODO: Valider la disponibilité des produits (appel au service produits)
   */
  private async validateProductsAvailability(items: any[]): Promise<void> {
    // Implémentation future avec appel HTTP au service produits
    // pour vérifier le stock et récupérer les prix actuels
  }
} 