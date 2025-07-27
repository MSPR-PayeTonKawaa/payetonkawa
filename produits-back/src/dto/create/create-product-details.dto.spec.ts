import { validate } from 'class-validator';
import { plainToClass } from 'class-transformer';
import { CreateProductDetailsDto } from './create-product-details.dto';

describe('CreateProductDetailsDto Validation', () => {
  it('should pass validation with valid data', async () => {
    const dto = plainToClass(CreateProductDetailsDto, {
      price: 25.99,
      description: 'Description test',
      color: 'Brun',
      category: 'Café en grains',
      origin: 'Test Origin',
      weight: '250g',
      intensity: 7,
    });

    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });

  it('should pass validation with only required price field', async () => {
    const dto = plainToClass(CreateProductDetailsDto, {
      price: 10.50,
    });

    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });

  it('should fail validation when price is missing', async () => {
    const dto = plainToClass(CreateProductDetailsDto, {
      description: 'Description test',
    });

    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].property).toBe('price');
  });

  it('should fail validation when price is negative', async () => {
    const dto = plainToClass(CreateProductDetailsDto, {
      price: -5.99,
    });

    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].property).toBe('price');
  });

  it('should fail validation when price is zero', async () => {
    const dto = plainToClass(CreateProductDetailsDto, {
      price: 0,
    });

    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].property).toBe('price');
  });

  it('should fail validation when price has too many decimals', async () => {
    const dto = plainToClass(CreateProductDetailsDto, {
      price: 25.999,
    });

    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].property).toBe('price');
  });

  it('should fail validation when description is too long', async () => {
    const dto = plainToClass(CreateProductDetailsDto, {
      price: 25.99,
      description: 'A'.repeat(2001), // Too long
    });

    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].property).toBe('description');
  });

  it('should fail validation when color is too long', async () => {
    const dto = plainToClass(CreateProductDetailsDto, {
      price: 25.99,
      color: 'A'.repeat(51), // Too long
    });

    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].property).toBe('color');
  });

  it('should fail validation when category is too long', async () => {
    const dto = plainToClass(CreateProductDetailsDto, {
      price: 25.99,
      category: 'A'.repeat(101), // Too long
    });

    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].property).toBe('category');
  });

  it('should fail validation when origin is too long', async () => {
    const dto = plainToClass(CreateProductDetailsDto, {
      price: 25.99,
      origin: 'A'.repeat(256), // Too long
    });

    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].property).toBe('origin');
  });

  it('should fail validation when weight is too long', async () => {
    const dto = plainToClass(CreateProductDetailsDto, {
      price: 25.99,
      weight: 'A'.repeat(51), // Too long
    });

    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].property).toBe('weight');
  });

  it('should fail validation when intensity is below minimum', async () => {
    const dto = plainToClass(CreateProductDetailsDto, {
      price: 25.99,
      intensity: 0, // Below minimum of 1
    });

    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].property).toBe('intensity');
  });

  it('should fail validation when intensity is above maximum', async () => {
    const dto = plainToClass(CreateProductDetailsDto, {
      price: 25.99,
      intensity: 11, // Above maximum of 10
    });

    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].property).toBe('intensity');
  });

  it('should fail validation when intensity is not an integer', async () => {
    const dto = plainToClass(CreateProductDetailsDto, {
      price: 25.99,
      intensity: 7.5, // Not an integer
    });

    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].property).toBe('intensity');
  });

  it('should pass validation with valid intensity range', async () => {
    const validIntensities = [1, 5, 10];
    
    for (const intensity of validIntensities) {
      const dto = plainToClass(CreateProductDetailsDto, {
        price: 25.99,
        intensity,
      });

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    }
  });

  it('should handle empty optional string fields', async () => {
    const dto = plainToClass(CreateProductDetailsDto, {
      price: 25.99,
      description: '',
      color: '',
      category: '',
      origin: '',
      weight: '',
    });

    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });
});
