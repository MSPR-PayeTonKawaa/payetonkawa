import { validate } from 'class-validator';
import { plainToClass } from 'class-transformer';
import { CreateOrderItemDto } from './create-order-item.dto';

describe('CreateOrderItemDto', () => {
  let createOrderItemDto: CreateOrderItemDto;

  beforeEach(() => {
    createOrderItemDto = new CreateOrderItemDto();
  });

  describe('DTO Structure', () => {
    it('should be defined', () => {
      expect(createOrderItemDto).toBeDefined();
      expect(createOrderItemDto).toBeInstanceOf(CreateOrderItemDto);
    });

    it('should have correct properties', () => {
      expect(createOrderItemDto).toHaveProperty('productId');
      expect(createOrderItemDto).toHaveProperty('quantity');
      expect(createOrderItemDto).toHaveProperty('unitPrice');
    });
  });

  describe('Validation', () => {
    it('should validate a complete and valid order item', async () => {
      createOrderItemDto.productId = '550e8400-e29b-41d4-a716-446655440000';
      createOrderItemDto.quantity = 2;
      createOrderItemDto.unitPrice = 24.99;

      const errors = await validate(createOrderItemDto);
      expect(errors).toHaveLength(0);
    });

    it('should validate with minimum valid values', async () => {
      createOrderItemDto.productId = '550e8400-e29b-41d4-a716-446655440001';
      createOrderItemDto.quantity = 1;
      createOrderItemDto.unitPrice = 0.01;

      const errors = await validate(createOrderItemDto);
      expect(errors).toHaveLength(0);
    });

    it('should fail validation with invalid product ID', async () => {
      createOrderItemDto.productId = 'invalid-uuid';
      createOrderItemDto.quantity = 1;
      createOrderItemDto.unitPrice = 10.00;

      const errors = await validate(createOrderItemDto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('productId');
    });

    it('should fail validation with missing product ID', async () => {
      createOrderItemDto.quantity = 1;
      createOrderItemDto.unitPrice = 10.00;

      const errors = await validate(createOrderItemDto);
      expect(errors.length).toBeGreaterThan(0);
      const productIdError = errors.find(error => error.property === 'productId');
      expect(productIdError).toBeDefined();
    });

    it('should fail validation with zero quantity', async () => {
      createOrderItemDto.productId = '550e8400-e29b-41d4-a716-446655440000';
      createOrderItemDto.quantity = 0;
      createOrderItemDto.unitPrice = 10.00;

      const errors = await validate(createOrderItemDto);
      expect(errors.length).toBeGreaterThan(0);
      const quantityError = errors.find(error => error.property === 'quantity');
      expect(quantityError).toBeDefined();
    });

    it('should fail validation with negative quantity', async () => {
      createOrderItemDto.productId = '550e8400-e29b-41d4-a716-446655440000';
      createOrderItemDto.quantity = -1;
      createOrderItemDto.unitPrice = 10.00;

      const errors = await validate(createOrderItemDto);
      expect(errors.length).toBeGreaterThan(0);
      const quantityError = errors.find(error => error.property === 'quantity');
      expect(quantityError).toBeDefined();
    });

    it('should fail validation with zero unit price', async () => {
      createOrderItemDto.productId = '550e8400-e29b-41d4-a716-446655440000';
      createOrderItemDto.quantity = 1;
      createOrderItemDto.unitPrice = 0;

      const errors = await validate(createOrderItemDto);
      expect(errors.length).toBeGreaterThan(0);
      const priceError = errors.find(error => error.property === 'unitPrice');
      expect(priceError).toBeDefined();
    });

    it('should fail validation with negative unit price', async () => {
      createOrderItemDto.productId = '550e8400-e29b-41d4-a716-446655440000';
      createOrderItemDto.quantity = 1;
      createOrderItemDto.unitPrice = -5.99;

      const errors = await validate(createOrderItemDto);
      expect(errors.length).toBeGreaterThan(0);
      const priceError = errors.find(error => error.property === 'unitPrice');
      expect(priceError).toBeDefined();
    });

    it('should fail validation with price below minimum', async () => {
      createOrderItemDto.productId = '550e8400-e29b-41d4-a716-446655440000';
      createOrderItemDto.quantity = 1;
      createOrderItemDto.unitPrice = 0.005; // Below 0.01 minimum

      const errors = await validate(createOrderItemDto);
      expect(errors.length).toBeGreaterThan(0);
      const priceError = errors.find(error => error.property === 'unitPrice');
      expect(priceError).toBeDefined();
    });

    it('should fail validation with non-numeric quantity', async () => {
      createOrderItemDto.productId = '550e8400-e29b-41d4-a716-446655440000';
      createOrderItemDto.quantity = 'not-a-number' as any;
      createOrderItemDto.unitPrice = 10.00;

      const errors = await validate(createOrderItemDto);
      expect(errors.length).toBeGreaterThan(0);
      const quantityError = errors.find(error => error.property === 'quantity');
      expect(quantityError).toBeDefined();
    });

    it('should fail validation with non-numeric unit price', async () => {
      createOrderItemDto.productId = '550e8400-e29b-41d4-a716-446655440000';
      createOrderItemDto.quantity = 1;
      createOrderItemDto.unitPrice = 'not-a-number' as any;

      const errors = await validate(createOrderItemDto);
      expect(errors.length).toBeGreaterThan(0);
      const priceError = errors.find(error => error.property === 'unitPrice');
      expect(priceError).toBeDefined();
    });

    it('should validate with valid decimal prices', async () => {
      const validPrices = [0.01, 0.99, 1.00, 99.99, 999.99, 1234.56];
      
      for (const price of validPrices) {
        createOrderItemDto.productId = '550e8400-e29b-41d4-a716-446655440000';
        createOrderItemDto.quantity = 1;
        createOrderItemDto.unitPrice = price;

        const errors = await validate(createOrderItemDto);
        expect(errors).toHaveLength(0);
      }
    });

    it('should validate with various valid quantities', async () => {
      const validQuantities = [1, 2, 10, 50, 100, 999];
      
      for (const quantity of validQuantities) {
        createOrderItemDto.productId = '550e8400-e29b-41d4-a716-446655440000';
        createOrderItemDto.quantity = quantity;
        createOrderItemDto.unitPrice = 10.00;

        const errors = await validate(createOrderItemDto);
        expect(errors).toHaveLength(0);
      }
    });
  });

  describe('Transformation', () => {
    it('should transform from plain object correctly', () => {
      const plainObject = {
        productId: '550e8400-e29b-41d4-a716-446655440000',
        quantity: 3,
        unitPrice: 15.99
      };

      const dto = plainToClass(CreateOrderItemDto, plainObject);

      expect(dto).toBeInstanceOf(CreateOrderItemDto);
      expect(dto.productId).toBe(plainObject.productId);
      expect(dto.quantity).toBe(plainObject.quantity);
      expect(dto.unitPrice).toBe(plainObject.unitPrice);
    });

    it('should handle string numbers correctly', () => {
      const plainObject = {
        productId: '550e8400-e29b-41d4-a716-446655440000',
        quantity: 5,
        unitPrice: 29.99
      };

      const dto = plainToClass(CreateOrderItemDto, plainObject);

      expect(dto.quantity).toBe(5);
      expect(dto.unitPrice).toBe(29.99);
    });
  });

  describe('Business Rules', () => {
    it('should enforce minimum quantity of 1', async () => {
      createOrderItemDto.productId = '550e8400-e29b-41d4-a716-446655440000';
      createOrderItemDto.quantity = 1;
      createOrderItemDto.unitPrice = 10.00;

      const errors = await validate(createOrderItemDto);
      expect(errors).toHaveLength(0);
    });

    it('should enforce minimum price of 0.01', async () => {
      createOrderItemDto.productId = '550e8400-e29b-41d4-a716-446655440000';
      createOrderItemDto.quantity = 1;
      createOrderItemDto.unitPrice = 0.01;

      const errors = await validate(createOrderItemDto);
      expect(errors).toHaveLength(0);
    });

    it('should support high-value items', async () => {
      createOrderItemDto.productId = '550e8400-e29b-41d4-a716-446655440001';
      createOrderItemDto.quantity = 1;
      createOrderItemDto.unitPrice = 9999.99;

      const errors = await validate(createOrderItemDto);
      expect(errors).toHaveLength(0);
    });

    it('should support bulk quantities', async () => {
      createOrderItemDto.productId = '550e8400-e29b-41d4-a716-446655440002';
      createOrderItemDto.quantity = 1000;
      createOrderItemDto.unitPrice = 0.50;

      const errors = await validate(createOrderItemDto);
      expect(errors).toHaveLength(0);
    });
  });

  describe('Edge Cases', () => {
    it('should handle decimal precision correctly', async () => {
      createOrderItemDto.productId = '550e8400-e29b-41d4-a716-446655440000';
      createOrderItemDto.quantity = 1;
      createOrderItemDto.unitPrice = 12.99;

      const errors = await validate(createOrderItemDto);
      expect(errors).toHaveLength(0);
    });

    it('should reject prices with too many decimal places', async () => {
      createOrderItemDto.productId = '550e8400-e29b-41d4-a716-446655440000';
      createOrderItemDto.quantity = 1;
      createOrderItemDto.unitPrice = 12.999; // 3 decimal places

      const errors = await validate(createOrderItemDto);
      expect(errors.length).toBeGreaterThan(0);
      const priceError = errors.find(error => error.property === 'unitPrice');
      expect(priceError).toBeDefined();
    });
  });

  describe('Real World Scenarios', () => {
    it('should handle typical product item', async () => {
      createOrderItemDto.productId = '550e8400-e29b-41d4-a716-446655440003';
      createOrderItemDto.quantity = 1;
      createOrderItemDto.unitPrice = 1199.99;

      const errors = await validate(createOrderItemDto);
      expect(errors).toHaveLength(0);
    });

    it('should handle consumable items', async () => {
      createOrderItemDto.productId = '550e8400-e29b-41d4-a716-446655440004';
      createOrderItemDto.quantity = 10;
      createOrderItemDto.unitPrice = 2.49;

      const errors = await validate(createOrderItemDto);
      expect(errors).toHaveLength(0);
    });

    it('should handle low-cost items', async () => {
      createOrderItemDto.productId = '550e8400-e29b-41d4-a716-446655440005';
      createOrderItemDto.quantity = 1;
      createOrderItemDto.unitPrice = 0.99;

      const errors = await validate(createOrderItemDto);
      expect(errors).toHaveLength(0);
    });

    it('should handle digital products', async () => {
      createOrderItemDto.productId = '550e8400-e29b-41d4-a716-446655440006';
      createOrderItemDto.quantity = 1;
      createOrderItemDto.unitPrice = 29.99;

      const errors = await validate(createOrderItemDto);
      expect(errors).toHaveLength(0);
    });
  });
});

