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
      createOrderDto.customerId = 'invalid-uuid';
      createOrderDto.items = [
        {
          productId: 'e2641a5d-c196-42ac-89b8-8415cec7266c',
          quantity: 1,
          unitPrice: 10.00
        }
      ];

      const errors = await validate(createOrderDto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('customerId');
    });

    it('should fail validation with missing customer ID', async () => {
      createOrderDto.items = [
        {
          productId: 'e2641a5d-c196-42ac-89b8-8415cec7266c',
          quantity: 1,
          unitPrice: 10.00
        }
      ];

      const errors = await validate(createOrderDto);
      expect(errors.length).toBeGreaterThan(0);
      const customerIdError = errors.find(error => error.property === 'customerId');
      expect(customerIdError).toBeDefined();
    });

    it('should fail validation with empty items array', async () => {
      createOrderDto.customerId = '550e8400-e29b-41d4-a716-446655440000';
      createOrderDto.items = [];

      const errors = await validate(createOrderDto);
      expect(errors.length).toBeGreaterThan(0);
      const itemsError = errors.find(error => error.property === 'items');
      expect(itemsError).toBeDefined();
    });

    it('should fail validation with missing items', async () => {
      createOrderDto.customerId = '550e8400-e29b-41d4-a716-446655440000';

      const errors = await validate(createOrderDto);
      expect(errors.length).toBeGreaterThan(0);
      const itemsError = errors.find(error => error.property === 'items');
      expect(itemsError).toBeDefined();
    });

    it('should validate with multiple items', async () => {
      createOrderDto.customerId = '550e8400-e29b-41d4-a716-446655440000';
      createOrderDto.items = [
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
      ];

      const errors = await validate(createOrderDto);
      expect(errors).toHaveLength(0);
    });

    it('should validate with different order statuses', async () => {
      createOrderDto.customerId = '550e8400-e29b-41d4-a716-446655440000';
      createOrderDto.items = [
        {
          productId: 'e2641a5d-c196-42ac-89b8-8415cec7266c',
          quantity: 1,
          unitPrice: 10.00
        }
      ];

      // Test each valid status
      for (const status of Object.values(OrderStatus)) {
        createOrderDto.status = status;
        const errors = await validate(createOrderDto);
        expect(errors).toHaveLength(0);
      }
    });
  });

  describe('Transformation', () => {
    it('should transform from plain object correctly', () => {
      const plainObject = {
        customerId: '550e8400-e29b-41d4-a716-446655440000',
        items: [
          {
            productId: 'e2641a5d-c196-42ac-89b8-8415cec7266c',
            quantity: 2,
            unitPrice: 24.99
          }
        ],
        status: 'pending'
      };

      const dto = plainToClass(CreateOrderDto, plainObject);

      expect(dto).toBeInstanceOf(CreateOrderDto);
      expect(dto.customerId).toBe(plainObject.customerId);
      expect(dto.items).toHaveLength(1);
      expect(dto.items[0]).toBeInstanceOf(CreateOrderItemDto);
      expect(dto.status).toBe(OrderStatus.PENDING);
    });

    it('should handle complex order with multiple items', () => {
      const plainObject = {
        customerId: '550e8400-e29b-41d4-a716-446655440000',
        items: [
          {
            productId: 'product-1',
            quantity: 2,
            unitPrice: 15.99
          },
          {
            productId: 'product-2',
            quantity: 1,
            unitPrice: 299.99
          },
          {
            productId: 'product-3',
            quantity: 3,
            unitPrice: 9.99
          }
        ]
      };

      const dto = plainToClass(CreateOrderDto, plainObject);

      expect(dto.items).toHaveLength(3);
      expect(dto.items.every(item => item instanceof CreateOrderItemDto)).toBe(true);
    });
  });

  describe('Business Rules', () => {
    it('should support single item orders', async () => {
      createOrderDto.customerId = '550e8400-e29b-41d4-a716-446655440000';
      createOrderDto.items = [
        {
          productId: 'single-product',
          quantity: 1,
          unitPrice: 5.99
        }
      ];

      const errors = await validate(createOrderDto);
      expect(errors).toHaveLength(0);
    });

    it('should support bulk orders with many items', async () => {
      createOrderDto.customerId = '550e8400-e29b-41d4-a716-446655440000';
      createOrderDto.items = Array.from({ length: 50 }, (_, index) => ({
        productId: `product-${index + 1}`,
        quantity: Math.floor(Math.random() * 10) + 1,
        unitPrice: Math.round((Math.random() * 100 + 1) * 100) / 100
      }));

      const errors = await validate(createOrderDto);
      expect(errors).toHaveLength(0);
    });
  });

  describe('Edge Cases', () => {
    it('should handle optional status field', async () => {
      createOrderDto.customerId = '550e8400-e29b-41d4-a716-446655440000';
      createOrderDto.items = [
        {
          productId: 'product-1',
          quantity: 1,
          unitPrice: 10.00
        }
      ];
      // status is undefined (optional)

      const errors = await validate(createOrderDto);
      expect(errors).toHaveLength(0);
    });

    it('should reject invalid status values', async () => {
      createOrderDto.customerId = '550e8400-e29b-41d4-a716-446655440000';
      createOrderDto.items = [
        {
          productId: 'product-1',
          quantity: 1,
          unitPrice: 10.00
        }
      ];
      createOrderDto.status = 'invalid-status' as OrderStatus;

      const errors = await validate(createOrderDto);
      expect(errors.length).toBeGreaterThan(0);
      const statusError = errors.find(error => error.property === 'status');
      expect(statusError).toBeDefined();
    });
  });

  describe('Real World Scenarios', () => {
    it('should handle typical e-commerce order', async () => {
      createOrderDto.customerId = 'customer-john-doe-uuid';
      createOrderDto.items = [
        {
          productId: 'laptop-dell-inspiron',
          quantity: 1,
          unitPrice: 899.99
        },
        {
          productId: 'wireless-mouse',
          quantity: 1,
          unitPrice: 29.99
        },
        {
          productId: 'laptop-sleeve',
          quantity: 1,
          unitPrice: 19.99
        }
      ];
      createOrderDto.status = OrderStatus.PENDING;

      const errors = await validate(createOrderDto);
      expect(errors).toHaveLength(0);
    });

    it('should handle restaurant order scenario', async () => {
      createOrderDto.customerId = 'customer-restaurant-uuid';
      createOrderDto.items = [
        {
          productId: 'pizza-margherita-large',
          quantity: 2,
          unitPrice: 12.50
        },
        {
          productId: 'coca-cola-500ml',
          quantity: 3,
          unitPrice: 2.50
        },
        {
          productId: 'garlic-bread',
          quantity: 1,
          unitPrice: 4.99
        }
      ];

      const errors = await validate(createOrderDto);
      expect(errors).toHaveLength(0);
    });
  });
});
