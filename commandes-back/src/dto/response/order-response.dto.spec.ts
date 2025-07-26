import { plainToClass } from 'class-transformer';
import { OrderResponseDto, OrderItemResponseDto } from './order-response.dto';
import { OrderStatus } from '../../entities';
import { Order, OrderItem } from '../../entities';

describe('OrderResponseDto', () => {
  let orderResponseDto: OrderResponseDto;

  beforeEach(() => {
    orderResponseDto = new OrderResponseDto();
  });

  describe('DTO Structure', () => {
    it('should be defined', () => {
      expect(orderResponseDto).toBeDefined();
      expect(orderResponseDto).toBeInstanceOf(OrderResponseDto);
    });

    it('should have correct properties', () => {
      expect(orderResponseDto).toHaveProperty('id');
      expect(orderResponseDto).toHaveProperty('customerId');
      expect(orderResponseDto).toHaveProperty('status');
      expect(orderResponseDto).toHaveProperty('totalAmount');
      expect(orderResponseDto).toHaveProperty('items');
      expect(orderResponseDto).toHaveProperty('createdAt');
      expect(orderResponseDto).toHaveProperty('updatedAt');
    });
  });

  describe('Transformation from Entity', () => {
    it('should transform from Order entity correctly', () => {
      const order = new Order();
      order.id = 'order-123';
      order.customerId = 'customer-456';
      order.status = OrderStatus.CONFIRMED;
      order.totalAmount = 49.98;
      order.createdAt = new Date('2024-01-15T10:00:00Z');
      order.updatedAt = new Date('2024-01-15T10:30:00Z');
      order.items = [];

      const dto = plainToClass(OrderResponseDto, order, {
        excludeExtraneousValues: true
      });

      expect(dto.id).toBe('order-123');
      expect(dto.customerId).toBe('customer-456');
      expect(dto.status).toBe(OrderStatus.CONFIRMED);
      expect(dto.totalAmount).toBe(49.98);
      expect(dto.createdAt).toEqual(order.createdAt);
      expect(dto.updatedAt).toEqual(order.updatedAt);
    });

    it('should transform order with items correctly', () => {
      const orderItem1 = new OrderItem();
      orderItem1.id = 'item-1';
      orderItem1.productId = 'product-1';
      orderItem1.quantity = 2;
      orderItem1.unitPrice = 15.99;
      orderItem1.totalPrice = 31.98;
      orderItem1.createdAt = new Date('2024-01-15T10:00:00Z');

      const orderItem2 = new OrderItem();
      orderItem2.id = 'item-2';
      orderItem2.productId = 'product-2';
      orderItem2.quantity = 1;
      orderItem2.unitPrice = 18.00;
      orderItem2.totalPrice = 18.00;
      orderItem2.createdAt = new Date('2024-01-15T10:01:00Z');

      const order = new Order();
      order.id = 'order-123';
      order.customerId = 'customer-456';
      order.status = OrderStatus.PENDING;
      order.totalAmount = 49.98;
      order.items = [orderItem1, orderItem2];
      order.createdAt = new Date('2024-01-15T10:00:00Z');
      order.updatedAt = new Date('2024-01-15T10:30:00Z');

      const dto = plainToClass(OrderResponseDto, order, {
        excludeExtraneousValues: true
      });

      expect(dto.items).toHaveLength(2);
      expect(dto.items[0]).toBeInstanceOf(OrderItemResponseDto);
      expect(dto.items[0].id).toBe('item-1');
      expect(dto.items[0].productId).toBe('product-1');
      expect(dto.items[0].quantity).toBe(2);
      expect(dto.items[0].unitPrice).toBe(15.99);
      expect(dto.items[0].totalPrice).toBe(31.98);
    });
  });

  describe('Data Integrity', () => {
    it('should expose only intended fields', () => {
      const orderWithExtraFields = {
        id: 'order-123',
        customerId: 'customer-456',
        status: OrderStatus.DELIVERED,
        totalAmount: 99.99,
        items: [],
        createdAt: new Date(),
        updatedAt: new Date(),
        // Fields that should be excluded
        internalNotes: 'This should not be exposed',
        customerSecret: 'secret-info',
        processingData: { sensitive: true }
      };

      const dto = plainToClass(OrderResponseDto, orderWithExtraFields, {
        excludeExtraneousValues: true
      });

      expect(dto.id).toBe('order-123');
      expect(dto.customerId).toBe('customer-456');
      expect(dto.status).toBe(OrderStatus.DELIVERED);
      expect(dto.totalAmount).toBe(99.99);
      
      // These should not be present in the DTO
      expect((dto as any).internalNotes).toBeUndefined();
      expect((dto as any).customerSecret).toBeUndefined();
      expect((dto as any).processingData).toBeUndefined();
    });

    it('should handle different order statuses', () => {
      const statuses = Object.values(OrderStatus);
      
      for (const status of statuses) {
        const order = {
          id: 'order-123',
          customerId: 'customer-456',
          status: status,
          totalAmount: 50.00,
          items: [],
          createdAt: new Date(),
          updatedAt: new Date()
        };

        const dto = plainToClass(OrderResponseDto, order, {
          excludeExtraneousValues: true
        });

        expect(dto.status).toBe(status);
      }
    });
  });

  describe('Calculated Fields', () => {
    it('should maintain calculated totals', () => {
      const order = {
        id: 'order-123',
        customerId: 'customer-456',
        status: OrderStatus.CONFIRMED,
        totalAmount: 159.97,
        itemsCount: 3,
        totalQuantity: 6,
        items: [
          {
            id: 'item-1',
            productId: 'product-1',
            quantity: 2,
            unitPrice: 29.99,
            totalPrice: 59.98,
            createdAt: new Date()
          },
          {
            id: 'item-2',
            productId: 'product-2',
            quantity: 1,
            unitPrice: 49.99,
            totalPrice: 49.99,
            createdAt: new Date()
          },
          {
            id: 'item-3',
            productId: 'product-3',
            quantity: 3,
            unitPrice: 16.67,
            totalPrice: 50.00,
            createdAt: new Date()
          }
        ],
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const dto = plainToClass(OrderResponseDto, order, {
        excludeExtraneousValues: true
      });

      expect(dto.totalAmount).toBe(159.97);
      expect(dto.items).toHaveLength(3);
      
      // Verify individual item totals
      expect(dto.items[0].totalPrice).toBe(59.98);
      expect(dto.items[1].totalPrice).toBe(49.99);
      expect(dto.items[2].totalPrice).toBe(50.00);
    });
  });

  describe('Date Handling', () => {
    it('should handle date fields correctly', () => {
      const createdAt = new Date('2024-01-15T10:00:00Z');
      const updatedAt = new Date('2024-01-15T15:30:00Z');

      const order = {
        id: 'order-123',
        customerId: 'customer-456',
        status: OrderStatus.SHIPPED,
        totalAmount: 75.50,
        items: [],
        createdAt: createdAt,
        updatedAt: updatedAt
      };

      const dto = plainToClass(OrderResponseDto, order, {
        excludeExtraneousValues: true
      });

      expect(dto.createdAt).toEqual(createdAt);
      expect(dto.updatedAt).toEqual(updatedAt);
      expect(dto.updatedAt.getTime()).toBeGreaterThan(dto.createdAt.getTime());
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty orders', () => {
      const order = {
        id: 'order-123',
        customerId: 'customer-456',
        status: OrderStatus.PENDING,
        totalAmount: 0,
        items: [],
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const dto = plainToClass(OrderResponseDto, order, {
        excludeExtraneousValues: true
      });

      expect(dto.totalAmount).toBe(0);
      expect(dto.items).toEqual([]);
    });

    it('should handle high-value orders', () => {
      const order = {
        id: 'order-luxury',
        customerId: 'vip-customer',
        status: OrderStatus.CONFIRMED,
        totalAmount: 99999.99,
        items: [
          {
            id: 'item-luxury',
            productId: 'luxury-watch',
            quantity: 1,
            unitPrice: 99999.99,
            totalPrice: 99999.99,
            createdAt: new Date()
          }
        ],
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const dto = plainToClass(OrderResponseDto, order, {
        excludeExtraneousValues: true
      });

      expect(dto.totalAmount).toBe(99999.99);
      expect(dto.items[0].totalPrice).toBe(99999.99);
    });

    it('should handle orders with many items', () => {
      const items = Array.from({ length: 100 }, (_, index) => ({
        id: `item-${index + 1}`,
        productId: `product-${index + 1}`,
        quantity: 1,
        unitPrice: 1.00,
        totalPrice: 1.00,
        createdAt: new Date()
      }));

      const order = {
        id: 'bulk-order',
        customerId: 'bulk-customer',
        status: OrderStatus.PENDING,
        totalAmount: 100.00,
        items: items,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const dto = plainToClass(OrderResponseDto, order, {
        excludeExtraneousValues: true
      });

      expect(dto.items).toHaveLength(100);
      expect(dto.totalAmount).toBe(100.00);
      expect(dto.items.every(item => item instanceof OrderItemResponseDto)).toBe(true);
    });
  });
});

describe('OrderItemResponseDto', () => {
  let orderItemResponseDto: OrderItemResponseDto;

  beforeEach(() => {
    orderItemResponseDto = new OrderItemResponseDto();
  });

  describe('DTO Structure', () => {
    it('should be defined', () => {
      expect(orderItemResponseDto).toBeDefined();
      expect(orderItemResponseDto).toBeInstanceOf(OrderItemResponseDto);
    });

    it('should have correct properties', () => {
      expect(orderItemResponseDto).toHaveProperty('id');
      expect(orderItemResponseDto).toHaveProperty('productId');
      expect(orderItemResponseDto).toHaveProperty('quantity');
      expect(orderItemResponseDto).toHaveProperty('unitPrice');
      expect(orderItemResponseDto).toHaveProperty('totalPrice');
      expect(orderItemResponseDto).toHaveProperty('createdAt');
    });
  });

  describe('Transformation from Entity', () => {
    it('should transform from OrderItem entity correctly', () => {
      const orderItem = new OrderItem();
      orderItem.id = 'item-123';
      orderItem.productId = 'product-456';
      orderItem.quantity = 3;
      orderItem.unitPrice = 12.99;
      orderItem.totalPrice = 38.97;
      orderItem.createdAt = new Date('2024-01-15T10:00:00Z');

      const dto = plainToClass(OrderItemResponseDto, orderItem, {
        excludeExtraneousValues: true
      });

      expect(dto.id).toBe('item-123');
      expect(dto.productId).toBe('product-456');
      expect(dto.quantity).toBe(3);
      expect(dto.unitPrice).toBe(12.99);
      expect(dto.totalPrice).toBe(38.97);
      expect(dto.createdAt).toEqual(orderItem.createdAt);
    });

    it('should exclude non-exposed fields', () => {
      const orderItemWithExtraFields = {
        id: 'item-123',
        productId: 'product-456',
        quantity: 2,
        unitPrice: 15.99,
        totalPrice: 31.98,
        createdAt: new Date(),
        // Fields that should be excluded
        orderId: 'order-789',
        internalCode: 'INT-123',
        updatedAt: new Date()
      };

      const dto = plainToClass(OrderItemResponseDto, orderItemWithExtraFields, {
        excludeExtraneousValues: true
      });

      expect(dto.id).toBe('item-123');
      expect(dto.productId).toBe('product-456');
      expect(dto.quantity).toBe(2);
      expect(dto.unitPrice).toBe(15.99);
      expect(dto.totalPrice).toBe(31.98);
      
      // These should not be present in the DTO
      expect((dto as any).orderId).toBeUndefined();
      expect((dto as any).internalCode).toBeUndefined();
      expect((dto as any).updatedAt).toBeUndefined();
    });
  });

  describe('Business Logic Verification', () => {
    it('should maintain price calculation integrity', () => {
      const testCases = [
        { quantity: 1, unitPrice: 10.00, expectedTotal: 10.00 },
        { quantity: 3, unitPrice: 15.99, expectedTotal: 47.97 },
        { quantity: 10, unitPrice: 2.50, expectedTotal: 25.00 },
        { quantity: 1, unitPrice: 999.99, expectedTotal: 999.99 }
      ];

      for (const testCase of testCases) {
        const orderItem = {
          id: 'item-test',
          productId: 'product-test',
          quantity: testCase.quantity,
          unitPrice: testCase.unitPrice,
          totalPrice: testCase.expectedTotal,
          createdAt: new Date()
        };

        const dto = plainToClass(OrderItemResponseDto, orderItem, {
          excludeExtraneousValues: true
        });

        expect(dto.quantity).toBe(testCase.quantity);
        expect(dto.unitPrice).toBe(testCase.unitPrice);
        expect(dto.totalPrice).toBe(testCase.expectedTotal);
      }
    });
  });
});
