import { Test, TestingModule } from '@nestjs/testing';
import { OrdersController } from './orders.controller';
import { OrdersService } from '../services/orders.service';
import { BadRequestException, NotFoundException } from '@nestjs/common';

import { OrderStatus } from '../entities';
import { CreateOrderDto, UpdateOrderDto, UpdateOrderStatusDto } from '../dto';

describe('OrdersController', () => {
  let controller: OrdersController;
  let ordersService: jest.Mocked<OrdersService>;

  // Mock data
  const mockOrderResponse = {
    id: 'order-uuid',
    customerId: 'customer-uuid',
    status: OrderStatus.PENDING,
    totalAmount: 49.98,
    totalQuantity: 2,
    itemsCount: 1,
    items: [
      {
        id: 'item-uuid',
        productId: 'product-uuid',
        quantity: 2,
        unitPrice: 24.99,
        totalPrice: 49.98,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ],
    createdAt: new Date(),
    updatedAt: new Date(),
  } as any;

  const mockOrderListResponse = {
    data: [mockOrderResponse],
    total: 1,
    page: 1,
    limit: 10,
    totalPages: 1,
  } as any;

  const mockStatsResponse = {
    totalOrders: 150,
    ordersByStatus: {
      [OrderStatus.PENDING]: 20,
      [OrderStatus.CONFIRMED]: 50,
      [OrderStatus.SHIPPED]: 40,
      [OrderStatus.DELIVERED]: 35,
      [OrderStatus.CANCELLED]: 5,
    },
    totalRevenue: 15750.50,
    averageOrderValue: 105.00,
    todayOrders: 8,
  } as any;

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
    const mockOrdersService = {
      create: jest.fn(),
      findAll: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
      updateStatus: jest.fn(),
      remove: jest.fn(),
      findByCustomer: jest.fn(),
      getStats: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      controllers: [OrdersController],
      providers: [
        {
          provide: OrdersService,
          useValue: mockOrdersService,
        },
      ],
    }).compile();

    controller = module.get<OrdersController>(OrdersController);
    ordersService = module.get(OrdersService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should create a new order successfully', async () => {
      // Arrange
      ordersService.create.mockResolvedValue(mockOrderResponse);

      // Act
      const result = await controller.create(mockCreateOrderDto);

      // Assert
      expect(result).toEqual(mockOrderResponse);
      expect(ordersService.create).toHaveBeenCalledWith(mockCreateOrderDto);
    });

    it('should propagate service errors', async () => {
      // Arrange
      ordersService.create.mockRejectedValue(new BadRequestException('Invalid customer'));

      // Act & Assert
      await expect(controller.create(mockCreateOrderDto)).rejects.toThrow(BadRequestException);
    });
  });

  describe('findAll', () => {
    it('should return orders with default pagination', async () => {
      // Arrange
      ordersService.findAll.mockResolvedValue(mockOrderListResponse);

      // Act
      const result = await controller.findAll();

      // Assert
      expect(result).toEqual(mockOrderListResponse);
      expect(ordersService.findAll).toHaveBeenCalledWith({
        page: 1,
        limit: 10,
        customerId: undefined,
        status: undefined,
        dateFrom: undefined,
        dateTo: undefined,
        minAmount: undefined,
        maxAmount: undefined,
      });
    });

    it('should apply query parameters correctly', async () => {
      // Arrange
      ordersService.findAll.mockResolvedValue(mockOrderListResponse);

      const query = {
        page: '2',
        limit: '20',
        customerId: 'customer-uuid',
        status: OrderStatus.CONFIRMED,
        dateFrom: '2024-01-01T00:00:00.000Z',
        dateTo: '2024-12-31T23:59:59.999Z',
        minAmount: '50',
        maxAmount: '200',
      };

      // Act
      const result = await controller.findAll(
        2,
        20,
        query.customerId,
        query.status,
        query.dateFrom,
        query.dateTo,
        50,
        200,
      );

      // Assert
      expect(result).toEqual(mockOrderListResponse);
      expect(ordersService.findAll).toHaveBeenCalledWith({
        page: 2,
        limit: 20,
        customerId: 'customer-uuid',
        status: OrderStatus.CONFIRMED,
        dateFrom: new Date('2024-01-01T00:00:00.000Z'),
        dateTo: new Date('2024-12-31T23:59:59.999Z'),
        minAmount: 50,
        maxAmount: 200,
      });
    });

    it('should handle string to number conversion for pagination', async () => {
      // Arrange
      ordersService.findAll.mockResolvedValue(mockOrderListResponse);

      // Act
      await controller.findAll(3, 15);

      // Assert
      expect(ordersService.findAll).toHaveBeenCalledWith({
        page: 3,
        limit: 15,
      });
    });

    it('should handle date string to Date conversion', async () => {
      // Arrange
      ordersService.findAll.mockResolvedValue(mockOrderListResponse);

      const dateFrom = '2024-06-01T00:00:00.000Z';
      const dateTo = '2024-06-30T23:59:59.999Z';

      // Act
      await controller.findAll(undefined, undefined, undefined, undefined, dateFrom, dateTo);

      // Assert
      expect(ordersService.findAll).toHaveBeenCalledWith({
        page: 1,
        limit: 10,
        customerId: undefined,
        status: undefined,
        dateFrom: new Date(dateFrom),
        dateTo: new Date(dateTo),
        minAmount: undefined,
        maxAmount: undefined,
      });
    });
  });

  describe('findOne', () => {
    it('should return an order by ID', async () => {
      // Arrange
      ordersService.findOne.mockResolvedValue(mockOrderResponse);

      // Act
      const result = await controller.findOne('order-uuid');

      // Assert
      expect(result).toEqual(mockOrderResponse);
      expect(ordersService.findOne).toHaveBeenCalledWith('order-uuid');
    });

    it('should propagate NotFound errors', async () => {
      // Arrange
      ordersService.findOne.mockRejectedValue(new NotFoundException('Order not found'));

      // Act & Assert
      await expect(controller.findOne('non-existent-id')).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('should update an order successfully', async () => {
      // Arrange
      const updatedOrder = { ...mockOrderResponse, totalAmount: 74.97 };
      ordersService.update.mockResolvedValue(updatedOrder);

      // Act
      const result = await controller.update('order-uuid', mockUpdateOrderDto);

      // Assert
      expect(result).toEqual(updatedOrder);
      expect(ordersService.update).toHaveBeenCalledWith('order-uuid', mockUpdateOrderDto);
    });

    it('should propagate BadRequest errors for business rule violations', async () => {
      // Arrange
      ordersService.update.mockRejectedValue(new BadRequestException('Order cannot be modified'));

      // Act & Assert
      await expect(controller.update('order-uuid', mockUpdateOrderDto)).rejects.toThrow(BadRequestException);
    });
  });

  describe('updateStatus', () => {
    it('should update order status successfully', async () => {
      // Arrange
      const confirmedOrder = { ...mockOrderResponse, status: OrderStatus.CONFIRMED };
      ordersService.updateStatus.mockResolvedValue(confirmedOrder);

      const updateStatusDto: UpdateOrderStatusDto = { status: OrderStatus.CONFIRMED };

      // Act
      const result = await controller.updateStatus('order-uuid', updateStatusDto);

      // Assert
      expect(result).toEqual(confirmedOrder);
      expect(ordersService.updateStatus).toHaveBeenCalledWith('order-uuid', updateStatusDto);
    });

    it('should propagate invalid transition errors', async () => {
      // Arrange
      ordersService.updateStatus.mockRejectedValue(
        new BadRequestException('Invalid status transition')
      );

      const updateStatusDto: UpdateOrderStatusDto = { status: OrderStatus.PENDING };

      // Act & Assert
      await expect(controller.updateStatus('order-uuid', updateStatusDto)).rejects.toThrow(BadRequestException);
    });
  });

  describe('remove', () => {
    it('should remove an order successfully', async () => {
      // Arrange
      ordersService.remove.mockResolvedValue(undefined);

      // Act
      await controller.remove('order-uuid');

      // Assert
      expect(ordersService.remove).toHaveBeenCalledWith('order-uuid');
    });

    it('should propagate business rule violations', async () => {
      // Arrange
      ordersService.remove.mockRejectedValue(new BadRequestException('Order cannot be cancelled'));

      // Act & Assert
      await expect(controller.remove('order-uuid')).rejects.toThrow(BadRequestException);
    });
  });

  describe('findByCustomer', () => {
    it('should return orders for a specific customer', async () => {
      // Arrange
      ordersService.findByCustomer.mockResolvedValue(mockOrderListResponse);

      // Act
      const result = await controller.findByCustomer('customer-uuid');

      // Assert
      expect(result).toEqual(mockOrderListResponse);
      expect(ordersService.findByCustomer).toHaveBeenCalledWith('customer-uuid', {
        page: 1,
        limit: 10,
        status: undefined,
      });
    });

    it('should apply pagination options for customer orders', async () => {
      // Arrange
      ordersService.findByCustomer.mockResolvedValue(mockOrderListResponse);

      // Act
      await controller.findByCustomer('customer-uuid', 2, 15);

      // Assert
      expect(ordersService.findByCustomer).toHaveBeenCalledWith('customer-uuid', {
        page: 2,
        limit: 15,
      });
    });
  });

  describe('getStats', () => {
    it('should return comprehensive order statistics', async () => {
      // Arrange
      ordersService.getStats.mockResolvedValue(mockStatsResponse);

      // Act
      const result = await controller.getStats();

      // Assert
      expect(result).toEqual(mockStatsResponse);
      expect(ordersService.getStats).toHaveBeenCalled();
    });

    it('should handle service errors gracefully', async () => {
      // Arrange
      ordersService.getStats.mockRejectedValue(new Error('Database connection error'));

      // Act & Assert
      await expect(controller.getStats()).rejects.toThrow('Database connection error');
    });
  });

  describe('parameter validation', () => {
    it('should handle undefined optional parameters', async () => {
      // Arrange
      ordersService.findAll.mockResolvedValue(mockOrderListResponse);

      // Act
      await controller.findAll(undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined);

      // Assert
      expect(ordersService.findAll).toHaveBeenCalledWith({
        page: 1,
        limit: 10,
        customerId: undefined,
        status: undefined,
        dateFrom: undefined,
        dateTo: undefined,
        minAmount: undefined,
        maxAmount: undefined,
      });
    });

    it('should correctly convert string amounts to numbers', async () => {
      // Arrange
      ordersService.findAll.mockResolvedValue(mockOrderListResponse);

      // Act
      await controller.findAll(undefined, undefined, undefined, undefined, undefined, undefined, 25.50, 199.99);

      // Assert
      expect(ordersService.findAll).toHaveBeenCalledWith({
        page: 1,
        limit: 10,
        customerId: undefined,
        status: undefined,
        dateFrom: undefined,
        dateTo: undefined,
        minAmount: 25.50,
        maxAmount: 199.99,
      });
    });
  });
}); 