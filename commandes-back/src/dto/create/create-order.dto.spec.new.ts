import { validate } from 'class-validator';
import { plainToClass } from 'class-transformer';
import { CreateOrderDto } from './create-order.dto';
import { CreateOrderItemDto } from './create-order-item.dto';
import { OrderStatus } from '../../entities';

describe('CreateOrderDto', () => {
  let createOrderDto: CreateOrderDto;

  beforeEach(() => {
    createOrderDto = new CreateOrderDto();
  });

  describe('DTO Structure', () => {
    it('should be defined', () => {
      expect(createOrderDto).toBeDefined();
      expect(createOrderDto).toBeInstanceOf(CreateOrderDto);
    });

    it('should have correct properties', () => {
      expect(createOrderDto).toHaveProperty('customerId');
      expect(createOrderDto).toHaveProperty('items');
      expect(createOrderDto).toHaveProperty('status');
    });
  });

  describe('Validation', () => {
    it('should validate a complete and valid order', async () => {
      const plainOrder = {
        customerId: '550e8400-e29b-41d4-a716-446655440000',
        items: [
          {
            productId: 'e2641a5d-c196-42ac-89b8-8415cec7266c',
            quantity: 2,
            unitPrice: 24.99
          }
        ],
        status: OrderStatus.PENDING
      };

      const createOrderDto = plainToClass(CreateOrderDto, plainOrder);
      const errors = await validate(createOrderDto);
      expect(errors).toHaveLength(0);
    });

    it('should validate with minimal required fields', async () => {
      const plainOrder = {
        customerId: '550e8400-e29b-41d4-a716-446655440000',
        items: [
          {
            productId: 'e2641a5d-c196-42ac-89b8-8415cec7266c',
            quantity: 1,
            unitPrice: 10.00
          }
        ]
      };

      const createOrderDto = plainToClass(CreateOrderDto, plainOrder);
      const errors = await validate(createOrderDto);
      expect(errors).toHaveLength(0);
    });

    it('should fail validation with invalid customer ID', async () => {
      const plainOrder = {
        customerId: 'invalid-uuid',
        items: [
          {
            productId: 'e2641a5d-c196-42ac-89b8-8415cec7266c',
            quantity: 1,
            unitPrice: 10.00
          }
        ]
      };

      const createOrderDto = plainToClass(CreateOrderDto, plainOrder);
      const errors = await validate(createOrderDto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('customerId');
    });

    it('should fail validation with missing customer ID', async () => {
      const plainOrder = {
        items: [
          {
            productId: 'e2641a5d-c196-42ac-89b8-8415cec7266c',
            quantity: 1,
            unitPrice: 10.00
          }
        ]
      };

      const createOrderDto = plainToClass(CreateOrderDto, plainOrder);
      const errors = await validate(createOrderDto);
      expect(errors.length).toBeGreaterThan(0);
      const customerIdError = errors.find(error => error.property === 'customerId');
      expect(customerIdError).toBeDefined();
    });

    it('should fail validation with empty items array', async () => {
      const plainOrder = {
        customerId: '550e8400-e29b-41d4-a716-446655440000',
        items: []
      };

      const createOrderDto = plainToClass(CreateOrderDto, plainOrder);
      const errors = await validate(createOrderDto);
      expect(errors.length).toBeGreaterThan(0);
      const itemsError = errors.find(error => error.property === 'items');
      expect(itemsError).toBeDefined();
    });

    it('should fail validation with missing items', async () => {
      const plainOrder = {
        customerId: '550e8400-e29b-41d4-a716-446655440000'
      };

      const createOrderDto = plainToClass(CreateOrderDto, plainOrder);
      const errors = await validate(createOrderDto);
      expect(errors.length).toBeGreaterThan(0);
      const itemsError = errors.find(error => error.property === 'items');
      expect(itemsError).toBeDefined();
    });

    it('should validate with multiple items', async () => {
      const plainOrder = {
        customerId: '550e8400-e29b-41d4-a716-446655440000',
        items: [
          {
            productId: 'e2641a5d-c196-42ac-89b8-8415cec7266c',
            quantity: 2,
            unitPrice: 24.99
          },
          {
            productId: '550e8400-e29b-41d4-a716-446655440103',
            quantity: 1,
            unitPrice: 599.00
          }
        ]
      };

      const createOrderDto = plainToClass(CreateOrderDto, plainOrder);
      const errors = await validate(createOrderDto);
      expect(errors).toHaveLength(0);
    });

    it('should validate with different order statuses', async () => {
      const statuses = [OrderStatus.PENDING, OrderStatus.CONFIRMED, OrderStatus.SHIPPED, OrderStatus.DELIVERED, OrderStatus.CANCELLED];
      
      for (const status of statuses) {
        const plainOrder = {
          customerId: '550e8400-e29b-41d4-a716-446655440000',
          items: [
            {
              productId: 'e2641a5d-c196-42ac-89b8-8415cec7266c',
              quantity: 1,
              unitPrice: 10.00
            }
          ],
          status: status
        };

        const createOrderDto = plainToClass(CreateOrderDto, plainOrder);
        const errors = await validate(createOrderDto);
        expect(errors).toHaveLength(0);
      }
    });
  });

  describe('Transformation', () => {
    it('should transform plain object to DTO correctly', () => {
      const plainObject = {
        customerId: '550e8400-e29b-41d4-a716-446655440000',
        items: [
          {
            productId: 'e2641a5d-c196-42ac-89b8-8415cec7266c',
            quantity: 2,
            unitPrice: 24.99
          }
        ],
        status: OrderStatus.PENDING
      };

      const dto = plainToClass(CreateOrderDto, plainObject);

      expect(dto).toBeInstanceOf(CreateOrderDto);
      expect(dto.customerId).toBe(plainObject.customerId);
      expect(dto.items).toHaveLength(1);
      expect(dto.items[0]).toBeInstanceOf(CreateOrderItemDto);
      expect(dto.items[0].productId).toBe(plainObject.items[0].productId);
      expect(dto.items[0].quantity).toBe(plainObject.items[0].quantity);
      expect(dto.items[0].unitPrice).toBe(plainObject.items[0].unitPrice);
      expect(dto.status).toBe(plainObject.status);
    });

    it('should handle nested items transformation', () => {
      const plainObject = {
        customerId: '550e8400-e29b-41d4-a716-446655440000',
        items: [
          {
            productId: 'e2641a5d-c196-42ac-89b8-8415cec7266c',
            quantity: 1,
            unitPrice: 15.50
          },
          {
            productId: '550e8400-e29b-41d4-a716-446655440103',
            quantity: 3,
            unitPrice: 8.25
          }
        ]
      };

      const dto = plainToClass(CreateOrderDto, plainObject);

      expect(dto.items).toHaveLength(2);
      dto.items.forEach((item, index) => {
        expect(item).toBeInstanceOf(CreateOrderItemDto);
        expect(item.productId).toBe(plainObject.items[index].productId);
        expect(item.quantity).toBe(plainObject.items[index].quantity);
        expect(item.unitPrice).toBe(plainObject.items[index].unitPrice);
      });
    });
  });

  describe('Business Rules', () => {
    it('should support single item orders', async () => {
      const plainOrder = {
        customerId: '550e8400-e29b-41d4-a716-446655440000',
        items: [
          {
            productId: '550e8400-e29b-41d4-a716-446655440007',
            quantity: 1,
            unitPrice: 5.99
          }
        ]
      };

      const createOrderDto = plainToClass(CreateOrderDto, plainOrder);
      const errors = await validate(createOrderDto);
      expect(errors).toHaveLength(0);
    });

    it('should support bulk orders with many items', async () => {
      const items = Array.from({ length: 50 }, (_, i) => ({
        productId: '550e8400-e29b-41d4-a716-446655440000'.slice(0, -3) + String(i + 100).padStart(3, '0'),
        quantity: Math.floor(Math.random() * 10) + 1,
        unitPrice: Math.round((Math.random() * 100 + 1) * 100) / 100
      }));

      const plainOrder = {
        customerId: '550e8400-e29b-41d4-a716-446655440000',
        items: items
      };

      const createOrderDto = plainToClass(CreateOrderDto, plainOrder);
      const errors = await validate(createOrderDto);
      expect(errors).toHaveLength(0);
    });
  });

  describe('Edge Cases', () => {
    it('should handle optional status field', async () => {
      const plainOrder = {
        customerId: '550e8400-e29b-41d4-a716-446655440000',
        items: [
          {
            productId: '550e8400-e29b-41d4-a716-446655440008',
            quantity: 1,
            unitPrice: 10.00
          }
        ]
      };

      const createOrderDto = plainToClass(CreateOrderDto, plainOrder);
      const errors = await validate(createOrderDto);
      expect(errors).toHaveLength(0);
    });

    it('should reject invalid status values', async () => {
      const plainOrder = {
        customerId: '550e8400-e29b-41d4-a716-446655440000',
        items: [
          {
            productId: 'e2641a5d-c196-42ac-89b8-8415cec7266c',
            quantity: 1,
            unitPrice: 10.00
          }
        ],
        status: 'invalid-status' as any
      };

      const createOrderDto = plainToClass(CreateOrderDto, plainOrder);
      const errors = await validate(createOrderDto);
      expect(errors.length).toBeGreaterThan(0);
      const statusError = errors.find(error => error.property === 'status');
      expect(statusError).toBeDefined();
    });
  });

  describe('Real World Scenarios', () => {
    it('should handle typical e-commerce order', async () => {
      const plainOrder = {
        customerId: '550e8400-e29b-41d4-a716-446655440000',
        items: [
          {
            productId: '550e8400-e29b-41d4-a716-446655440009',
            quantity: 1,
            unitPrice: 899.99
          },
          {
            productId: '550e8400-e29b-41d4-a716-446655440010',
            quantity: 1,
            unitPrice: 29.99
          },
          {
            productId: '550e8400-e29b-41d4-a716-446655440011',
            quantity: 1,
            unitPrice: 19.99
          }
        ],
        status: OrderStatus.PENDING
      };

      const createOrderDto = plainToClass(CreateOrderDto, plainOrder);
      const errors = await validate(createOrderDto);
      expect(errors).toHaveLength(0);
    });

    it('should handle restaurant order scenario', async () => {
      const plainOrder = {
        customerId: '550e8400-e29b-41d4-a716-446655440000',
        items: [
          {
            productId: '550e8400-e29b-41d4-a716-446655440012',
            quantity: 2,
            unitPrice: 12.50
          },
          {
            productId: '550e8400-e29b-41d4-a716-446655440013',
            quantity: 3,
            unitPrice: 2.50
          },
          {
            productId: '550e8400-e29b-41d4-a716-446655440014',
            quantity: 1,
            unitPrice: 4.99
          }
        ]
      };

      const createOrderDto = plainToClass(CreateOrderDto, plainOrder);
      const errors = await validate(createOrderDto);
      expect(errors).toHaveLength(0);
    });
  });
});
