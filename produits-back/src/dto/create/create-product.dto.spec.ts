import { validate } from 'class-validator';
import { plainToClass } from 'class-transformer';
import { CreateProductDto } from './create-product.dto';

describe('CreateProductDto Validation', () => {
  it('should pass validation with valid data', async () => {
    const dto = plainToClass(CreateProductDto, {
      name: 'Café Arabica Test',
      stock: 100,
      isActive: true,
      details: {
        price: 25.99,
        description: 'Description test',
        color: 'Brun',
        category: 'Café en grains',
        origin: 'Test Origin',
        weight: '250g',
        intensity: 7,
      },
    });

    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });

  it('should fail validation when name is empty', async () => {
    const dto = plainToClass(CreateProductDto, {
      name: '',
      details: {
        price: 25.99,
      },
    });

    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].property).toBe('name');
  });

  it('should fail validation when name is too short', async () => {
    const dto = plainToClass(CreateProductDto, {
      name: 'A',
      details: {
        price: 25.99,
      },
    });

    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].property).toBe('name');
    expect(errors[0].constraints).toBeDefined();
  });

  it('should fail validation when name is too long', async () => {
    const dto = plainToClass(CreateProductDto, {
      name: 'A'.repeat(256),
      details: {
        price: 25.99,
      },
    });

    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].property).toBe('name');
  });

  it('should fail validation when stock is negative', async () => {
    const dto = plainToClass(CreateProductDto, {
      name: 'Café Test',
      stock: -10,
      details: {
        price: 25.99,
      },
    });

    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].property).toBe('stock');
  });

  it('should fail validation when stock is not an integer', async () => {
    const dto = plainToClass(CreateProductDto, {
      name: 'Café Test',
      stock: 10.5,
      details: {
        price: 25.99,
      },
    });

    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].property).toBe('stock');
  });

  it('should use default values when optional fields are not provided', () => {
    const dto = plainToClass(CreateProductDto, {
      name: 'Café Test',
      details: {
        price: 25.99,
      },
    }) as CreateProductDto;

    expect(dto.stock).toBe(0);
    expect(dto.isActive).toBe(true);
  });

  it('should fail validation when details are missing', async () => {
    const dto = plainToClass(CreateProductDto, {
      name: 'Café Test',
      stock: 100,
      // details manquants
    });

    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    
    // Chercher l'erreur liée aux détails
    const detailsError = errors.find(error => error.property === 'details');
    expect(detailsError).toBeDefined();
  });

  it('should validate nested details object', async () => {
    const dto = plainToClass(CreateProductDto, {
      name: 'Café Test',
      details: {
        price: -10, // Invalid price
      },
    });

    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    
    // Find the error related to details
    const detailsError = errors.find(error => error.property === 'details');
    expect(detailsError).toBeDefined();
  });

  it('should pass validation with minimal valid data', async () => {
    const dto = plainToClass(CreateProductDto, {
      name: 'Café Minimal',
      details: {
        price: 10.00,
      },
    }) as CreateProductDto;

    const errors = await validate(dto);
    expect(errors.length).toBe(0);
    expect(dto.stock).toBe(0);
    expect(dto.isActive).toBe(true);
  });
});
