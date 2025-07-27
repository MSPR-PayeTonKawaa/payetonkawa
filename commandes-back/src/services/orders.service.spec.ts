import { Test, TestingModule } from '@nestjs/testing';
import { OrdersService, FindOrdersOptions } from './orders.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { NotFoundException, BadRequestException } from '@nestjs/common';

import { Order, OrderItem, OrderStatus } from '../entities';
import { CreateOrderDto, UpdateOrderDto, UpdateOrderStatusDto } from '../dto';
import { OrderEventPublisher } from '../rabbitmq/publishers/order-event.publisher';

describe('OrdersService', () => {
  let service: OrdersService;
  let orderRepository: jest.Mocked<Repository<Order>>;
  let orderItemRepository: jest.Mocked<Repository<OrderItem>>;
  let orderEventPublisher: jest.Mocked<OrderEventPublisher>;

  // Mock data
  const mockOrderItem = {
    id: 'item-uuid',
    orderId: 'order-uuid',
    productId: 'product-uuid',
    quantity: 2,
    unitPrice: 24.99,
    totalPrice: 49.98,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const createMockOrder = (overrides = {}) => ({
    id: 'order-uuid',
    customerId: 'customer-uuid',
    status: OrderStatus.PENDING,
    totalAmount: 49.98,
    items: [mockOrderItem],
    createdAt: new Date(),
    updatedAt: new Date(),
    // Méthodes métier simulées
    calculateTotal: jest.fn().mockReturnValue(49.98),
    getTotalQuantity: jest.fn().mockReturnValue(2),
    canBeModified: jest.fn().mockReturnValue(true),
    canBeCancelled: jest.fn().mockReturnValue(true),
    confirm: jest.fn(),
    ship: jest.fn(),
    deliver: jest.fn(),
    cancel: jest.fn(),
    ...overrides,
  });

  const mockOrder = createMockOrder();

  const mockCreateOrderDto: CreateOrderDto = {
    customerId: 'customer-uuid',
    items: [
      {
        productId: 'product-uuid',
        quantity: 2,
        unitPrice: 24.99,
      },
    ],
  };

  const mockUpdateOrderDto: UpdateOrderDto = {
    items: [
      {
        productId: 'product-uuid',
        quantity: 3,
        unitPrice: 24.99,
      },
    ],
  };

  beforeEach(async () => {
    // Mock repositories
    const mockOrderRepo = {
      create: jest.fn(),
      save: jest.fn(),
      findOne: jest.fn(),
      remove: jest.fn(),
      count: jest.fn(),
      createQueryBuilder: jest.fn(),
    };

    const mockOrderItemRepo = {
      create: jest.fn(),
      save: jest.fn(),
      delete: jest.fn(),
    };

    const mockOrderEventPub = {
      publishOrderCreated: jest.fn(),
      publishOrderCancelled: jest.fn(),
      publishOrderStatusChanged: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrdersService,
        {
          provide: getRepositoryToken(Order),
          useValue: mockOrderRepo,
        },
        {
          provide: getRepositoryToken(OrderItem),
          useValue: mockOrderItemRepo,
        },
        {
          provide: OrderEventPublisher,
          useValue: mockOrderEventPub,
        },
      ],
    }).compile();

    service = module.get<OrdersService>(OrdersService);
    orderRepository = module.get(getRepositoryToken(Order));
    orderItemRepository = module.get(getRepositoryToken(OrderItem));
    orderEventPublisher = module.get(OrderEventPublisher);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create an order successfully with items', async () => {
      // Arrange
      const createdOrder = createMockOrder();
      orderRepository.create.mockReturnValue(createdOrder as any);
      orderItemRepository.create.mockReturnValue(mockOrderItem as any);
      orderRepository.save.mockResolvedValue(createdOrder as any);

      // Act
      const result = await service.create(mockCreateOrderDto);

      // Assert
      expect(result).toBeDefined();
      expect(result.customerId).toBe(mockCreateOrderDto.customerId);
      expect(orderRepository.create).toHaveBeenCalled();
      expect(orderRepository.save).toHaveBeenCalled();
      expect(orderEventPublisher.publishOrderCreated).toHaveBeenCalledWith(createdOrder);
    });

    it('should create order with PENDING status by default', async () => {
      // Arrange
      const dtoWithoutStatus = { ...mockCreateOrderDto };
      delete (dtoWithoutStatus as any).status;
      
      const createdOrder = createMockOrder({ status: OrderStatus.PENDING });
      orderRepository.create.mockReturnValue(createdOrder as any);
      orderItemRepository.create.mockReturnValue(mockOrderItem as any);
      orderRepository.save.mockResolvedValue(createdOrder as any);

      // Act
      const result = await service.create(dtoWithoutStatus);

      // Assert
      expect(result.status).toBe(OrderStatus.PENDING);
    });

    it('should handle RabbitMQ publishing errors gracefully', async () => {
      // Arrange
      const createdOrder = createMockOrder();
      orderRepository.create.mockReturnValue(createdOrder as any);
      orderItemRepository.create.mockReturnValue(mockOrderItem as any);
      orderRepository.save.mockResolvedValue(createdOrder as any);
      orderEventPublisher.publishOrderCreated.mockRejectedValue(new Error('RabbitMQ error'));

      // Act
      const result = await service.create(mockCreateOrderDto);

      // Assert
      expect(result).toBeDefined(); // Ne doit pas échouer malgré l'erreur RabbitMQ
      expect(orderEventPublisher.publishOrderCreated).toHaveBeenCalled();
    });
  });

  describe('findAll', () => {
    it('should return paginated orders with default options', async () => {
      // Arrange
      const mockQueryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[mockOrder], 1]),
      };
      
      orderRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder as any);

      // Act
      const result = await service.findAll();

      // Assert
      expect(result).toEqual({
        data: expect.arrayContaining([expect.objectContaining({ customerId: mockOrder.customerId })]),
        total: 1,
        page: 1,
        limit: 10,
        totalPages: 1,
      });
    });

    it('should apply all filters correctly', async () => {
      // Arrange
      const mockQueryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[mockOrder], 1]),
      };
      
      orderRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder as any);

      const options: FindOrdersOptions = {
        customerId: 'customer-uuid',
        status: OrderStatus.CONFIRMED,
        dateFrom: new Date('2024-01-01'),
        dateTo: new Date('2024-12-31'),
        minAmount: 10,
        maxAmount: 100,
      };

      // Act
      const result = await service.findAll(options);

      // Assert
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('order.customerId = :customerId', { customerId: 'customer-uuid' });
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('order.status = :status', { status: OrderStatus.CONFIRMED });
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('order.createdAt BETWEEN :dateFrom AND :dateTo', expect.any(Object));
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('order.totalAmount >= :minAmount', { minAmount: 10 });
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('order.totalAmount <= :maxAmount', { maxAmount: 100 });
    });
  });

  describe('findOne', () => {
    it('should return an order when found', async () => {
      // Arrange
      orderRepository.findOne.mockResolvedValue(mockOrder as any);

      // Act
      const result = await service.findOne('order-uuid');

      // Assert
      expect(result).toBeDefined();
      expect(result.id).toBe(mockOrder.id);
      expect(orderRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'order-uuid' },
        relations: ['items'],
      });
    });

    it('should throw NotFoundException when order not found', async () => {
      // Arrange
      orderRepository.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(service.findOne('non-existent-id')).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('should update an order successfully when PENDING', async () => {
      // Arrange
      const pendingOrder = createMockOrder({ status: OrderStatus.PENDING, canBeModified: jest.fn().mockReturnValue(true) });
      const updatedOrder = createMockOrder({ items: [{ ...mockOrderItem, quantity: 3, totalPrice: 74.97 }] });
      
      orderRepository.findOne.mockResolvedValue(pendingOrder as any);
      orderItemRepository.create.mockReturnValue({ ...mockOrderItem, quantity: 3 } as any);
      orderRepository.save.mockResolvedValue(updatedOrder as any);

      // Act
      const result = await service.update('order-uuid', mockUpdateOrderDto);

      // Assert
      expect(result).toBeDefined();
      expect(orderItemRepository.delete).toHaveBeenCalledWith({ orderId: 'order-uuid' });
      expect(orderRepository.save).toHaveBeenCalled();
    });

    it('should throw NotFoundException when order not found', async () => {
      // Arrange
      orderRepository.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(service.update('non-existent-id', mockUpdateOrderDto)).rejects.toThrow(NotFoundException);
      expect(orderRepository.save).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException when order cannot be modified', async () => {
      // Arrange
      const confirmedOrder = createMockOrder({ 
        status: OrderStatus.CONFIRMED, 
        canBeModified: jest.fn().mockReturnValue(false) 
      });
      orderRepository.findOne.mockResolvedValue(confirmedOrder as any);

      // Act & Assert
      await expect(service.update('order-uuid', mockUpdateOrderDto)).rejects.toThrow(BadRequestException);
      expect(orderRepository.save).not.toHaveBeenCalled();
    });
  });

  describe('updateStatus', () => {
    it('should update status from PENDING to CONFIRMED', async () => {
      // Arrange
      const pendingOrder = createMockOrder({ status: OrderStatus.PENDING });
      const confirmedOrder = createMockOrder({ status: OrderStatus.CONFIRMED });
      
      orderRepository.findOne.mockResolvedValue(pendingOrder as any);
      orderRepository.save.mockResolvedValue(confirmedOrder as any);

      const updateDto: UpdateOrderStatusDto = { status: OrderStatus.CONFIRMED };

      // Act
      const result = await service.updateStatus('order-uuid', updateDto);

      // Assert
      expect(result.status).toBe(OrderStatus.CONFIRMED);
      expect(orderEventPublisher.publishOrderStatusChanged).toHaveBeenCalledWith(
        confirmedOrder, 
        OrderStatus.PENDING
      );
    });

    it('should handle cancellation and publish correct event', async () => {
      // Arrange
      const pendingOrder = createMockOrder({ status: OrderStatus.PENDING });
      const cancelledOrder = createMockOrder({ status: OrderStatus.CANCELLED });
      
      orderRepository.findOne.mockResolvedValue(pendingOrder as any);
      orderRepository.save.mockResolvedValue(cancelledOrder as any);

      const updateDto: UpdateOrderStatusDto = { status: OrderStatus.CANCELLED };

      // Act
      const result = await service.updateStatus('order-uuid', updateDto);

      // Assert
      expect(result.status).toBe(OrderStatus.CANCELLED);
      expect(orderEventPublisher.publishOrderCancelled).toHaveBeenCalledWith(cancelledOrder);
    });

    it('should throw BadRequestException for invalid status transition', async () => {
      // Arrange
      const deliveredOrder = createMockOrder({ status: OrderStatus.DELIVERED });
      orderRepository.findOne.mockResolvedValue(deliveredOrder as any);

      const updateDto: UpdateOrderStatusDto = { status: OrderStatus.PENDING };

      // Act & Assert
      await expect(service.updateStatus('order-uuid', updateDto)).rejects.toThrow(BadRequestException);
      expect(orderRepository.save).not.toHaveBeenCalled();
    });

    it('should handle RabbitMQ publishing errors gracefully', async () => {
      // Arrange
      const pendingOrder = createMockOrder({ status: OrderStatus.PENDING });
      const confirmedOrder = createMockOrder({ status: OrderStatus.CONFIRMED });
      
      orderRepository.findOne.mockResolvedValue(pendingOrder as any);
      orderRepository.save.mockResolvedValue(confirmedOrder as any);
      orderEventPublisher.publishOrderStatusChanged.mockRejectedValue(new Error('RabbitMQ error'));

      const updateDto: UpdateOrderStatusDto = { status: OrderStatus.CONFIRMED };

      // Act
      const result = await service.updateStatus('order-uuid', updateDto);

      // Assert
      expect(result).toBeDefined(); // Ne doit pas échouer malgré l'erreur RabbitMQ
      expect(result.status).toBe(OrderStatus.CONFIRMED);
    });
  });

  describe('remove', () => {
    it('should remove an order successfully when cancellable', async () => {
      // Arrange
      const pendingOrder = createMockOrder({ 
        status: OrderStatus.PENDING, 
        canBeCancelled: jest.fn().mockReturnValue(true) 
      });
      orderRepository.findOne.mockResolvedValue(pendingOrder as any);

      // Act
      await service.remove('order-uuid');

      // Assert
      expect(orderRepository.remove).toHaveBeenCalledWith(pendingOrder);
    });

    it('should throw NotFoundException when order not found', async () => {
      // Arrange
      orderRepository.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(service.remove('non-existent-id')).rejects.toThrow(NotFoundException);
      expect(orderRepository.remove).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException when order cannot be cancelled', async () => {
      // Arrange
      const deliveredOrder = createMockOrder({ 
        status: OrderStatus.DELIVERED, 
        canBeCancelled: jest.fn().mockReturnValue(false) 
      });
      orderRepository.findOne.mockResolvedValue(deliveredOrder as any);

      // Act & Assert
      await expect(service.remove('order-uuid')).rejects.toThrow(BadRequestException);
      expect(orderRepository.remove).not.toHaveBeenCalled();
    });
  });

  describe('findByCustomer', () => {
    it('should return orders for a specific customer', async () => {
      // Arrange
      const mockQueryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[mockOrder], 1]),
      };
      
      orderRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder as any);

      // Act
      const result = await service.findByCustomer('customer-uuid');

      // Assert
      expect(result).toBeDefined();
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('order.customerId = :customerId', { customerId: 'customer-uuid' });
    });
  });

  describe('getStats', () => {
    it('should return comprehensive order statistics', async () => {
      // Arrange
      const mockQueryBuilder = {
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValue([
          { status: OrderStatus.PENDING, count: '5' },
          { status: OrderStatus.CONFIRMED, count: '10' },
          { status: OrderStatus.DELIVERED, count: '15' },
        ]),
        getRawOne: jest.fn().mockResolvedValue({ total: '1500.75' }),
      };

      orderRepository.count
        .mockResolvedValueOnce(30) // totalOrders
        .mockResolvedValueOnce(5); // todayOrders

      orderRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder as any);

      // Act
      const result = await service.getStats();

      // Assert
      expect(result).toEqual({
        totalOrders: 30,
        ordersByStatus: {
          [OrderStatus.PENDING]: 5,
          [OrderStatus.CONFIRMED]: 10,
          [OrderStatus.DELIVERED]: 15,
        },
        totalRevenue: 1500.75,
        averageOrderValue: 50.025, // 1500.75 / 30
        todayOrders: 5,
      });
    });

    it('should handle zero orders gracefully', async () => {
      // Arrange
      const mockQueryBuilder = {
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValue([]),
        getRawOne: jest.fn().mockResolvedValue({ total: null }),
      };

      orderRepository.count.mockResolvedValue(0);
      orderRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder as any);

      // Act
      const result = await service.getStats();

      // Assert
      expect(result).toEqual({
        totalOrders: 0,
        ordersByStatus: {},
        totalRevenue: 0,
        averageOrderValue: 0,
        todayOrders: 0,
      });
    });
  });

  describe('validateStatusTransition (private method integration)', () => {
    it('should allow valid transitions', async () => {
      // Test transitions valides via updateStatus
      const pendingOrder = createMockOrder({ status: OrderStatus.PENDING });
      orderRepository.findOne.mockResolvedValue(pendingOrder as any);
      orderRepository.save.mockResolvedValue(createMockOrder({ status: OrderStatus.CONFIRMED }) as any);

      // PENDING → CONFIRMED
      await expect(service.updateStatus('order-uuid', { status: OrderStatus.CONFIRMED })).resolves.toBeDefined();

      // PENDING → CANCELLED
      await expect(service.updateStatus('order-uuid', { status: OrderStatus.CANCELLED })).resolves.toBeDefined();
    });

    it('should reject invalid transitions', async () => {
      // DELIVERED → PENDING (invalide)
      const deliveredOrder = createMockOrder({ status: OrderStatus.DELIVERED });
      orderRepository.findOne.mockResolvedValue(deliveredOrder as any);

      await expect(service.updateStatus('order-uuid', { status: OrderStatus.PENDING }))
        .rejects.toThrow('Transition de statut non autorisée: delivered -> pending');
    });
  });

  describe('mapToResponseDto (private method integration)', () => {
    it('should correctly transform order to response DTO', async () => {
      // Arrange
      const orderWithMethods = createMockOrder();
      orderRepository.findOne.mockResolvedValue(orderWithMethods as any);

      // Act
      const result = await service.findOne('order-uuid');

      // Assert
      expect(result).toEqual(
        expect.objectContaining({
          id: orderWithMethods.id,
          customerId: orderWithMethods.customerId,
          status: orderWithMethods.status,
          totalAmount: orderWithMethods.totalAmount,
          totalQuantity: 2, // Résultat de getTotalQuantity()
          itemsCount: 1, // Nombre d'items
        })
      );
    });
  });

  describe('Error Handling and Edge Cases', () => {
    describe('create() error scenarios', () => {
      it('should handle case when OrderEventPublisher is null', async () => {
        // Arrange
        const createOrderDto = {
          customerId: 'customer-uuid',
          items: [
            {
              productId: 'product-uuid',
              quantity: 2,
              unitPrice: 24.99,
            },
          ],
        };

        orderRepository.create.mockReturnValue(mockOrder as any);
        orderRepository.save.mockResolvedValue(mockOrder as any);

        // Simuler OrderEventPublisher null
        const serviceWithoutPublisher = new (require('./orders.service').OrdersService)(
          orderRepository,
          orderItemRepository,
          null // OrderEventPublisher null
        );

        // Act
        const result = await serviceWithoutPublisher.create(createOrderDto);

        // Assert
        expect(result).toBeDefined();
        expect(orderRepository.save).toHaveBeenCalled();
      });

      it('should handle OrderEventPublisher error during creation', async () => {
        // Arrange
        const createOrderDto = {
          customerId: 'customer-uuid',
          items: [
            {
              productId: 'product-uuid',
              quantity: 2,
              unitPrice: 24.99,
            },
          ],
        };

        orderRepository.create.mockReturnValue(mockOrder as any);
        orderRepository.save.mockResolvedValue(mockOrder as any);
        orderEventPublisher.publishOrderCreated.mockRejectedValue(new Error('RabbitMQ error'));

        // Act
        const result = await service.create(createOrderDto);

        // Assert
        expect(result).toBeDefined();
        expect(orderEventPublisher.publishOrderCreated).toHaveBeenCalled();
        // La création devrait réussir malgré l'erreur de publication
      });
    });

    describe('updateStatus() error scenarios', () => {
      it('should handle OrderEventPublisher error during status update', async () => {
        // Arrange
        const updateStatusDto = { status: OrderStatus.CONFIRMED };
        
        orderRepository.findOne.mockResolvedValue(mockOrder as any);
        orderRepository.save.mockResolvedValue({
          ...mockOrder,
          status: OrderStatus.CONFIRMED,
        } as any);
        orderEventPublisher.publishOrderStatusChanged.mockRejectedValue(new Error('RabbitMQ error'));

        // Act
        const result = await service.updateStatus('order-uuid', updateStatusDto);

        // Assert
        expect(result).toBeDefined();
        expect(result.status).toBe(OrderStatus.CONFIRMED);
        expect(orderEventPublisher.publishOrderStatusChanged).toHaveBeenCalled();
        // La mise à jour devrait réussir malgré l'erreur de publication
      });

      it('should handle OrderEventPublisher error during cancellation', async () => {
        // Arrange
        const updateStatusDto = { status: OrderStatus.CANCELLED };
        
        orderRepository.findOne.mockResolvedValue(mockOrder as any);
        orderRepository.save.mockResolvedValue({
          ...mockOrder,
          status: OrderStatus.CANCELLED,
        } as any);
        orderEventPublisher.publishOrderCancelled.mockRejectedValue(new Error('RabbitMQ error'));

        // Act
        const result = await service.updateStatus('order-uuid', updateStatusDto);

        // Assert
        expect(result).toBeDefined();
        expect(result.status).toBe(OrderStatus.CANCELLED);
        expect(orderEventPublisher.publishOrderCancelled).toHaveBeenCalled();
        // La mise à jour devrait réussir malgré l'erreur de publication
      });

      it('should publish order cancelled event when updating to cancelled status', async () => {
        // Arrange
        const updateStatusDto = { status: OrderStatus.CANCELLED };
        
        // Mock avec statut initial PENDING pour permettre la transition vers CANCELLED
        const pendingOrder = { ...mockOrder, status: OrderStatus.PENDING };
        orderRepository.findOne.mockResolvedValue(pendingOrder as any);
        orderRepository.save.mockResolvedValue({
          ...pendingOrder,
          status: OrderStatus.CANCELLED,
        } as any);

        // Act
        await service.updateStatus('order-uuid', updateStatusDto);

        // Assert
        expect(orderEventPublisher.publishOrderCancelled).toHaveBeenCalledWith({
          ...pendingOrder,
          status: OrderStatus.CANCELLED,
        });
        expect(orderEventPublisher.publishOrderStatusChanged).not.toHaveBeenCalled();
      });

      it('should publish order status changed event for non-cancelled status', async () => {
        // Arrange
        const updateStatusDto = { status: OrderStatus.CONFIRMED };
        
        // Mock avec statut initial PENDING pour permettre la transition vers CONFIRMED
        const pendingOrder = { ...mockOrder, status: OrderStatus.PENDING };
        orderRepository.findOne.mockResolvedValue(pendingOrder as any);
        orderRepository.save.mockResolvedValue({
          ...pendingOrder,
          status: OrderStatus.CONFIRMED,
        } as any);

        // Act
        await service.updateStatus('order-uuid', updateStatusDto);

        // Assert
        expect(orderEventPublisher.publishOrderStatusChanged).toHaveBeenCalledWith(
          {
            ...pendingOrder,
            status: OrderStatus.CONFIRMED,
          },
          OrderStatus.PENDING
        );
        expect(orderEventPublisher.publishOrderCancelled).not.toHaveBeenCalled();
      });
    });
  });
}); 