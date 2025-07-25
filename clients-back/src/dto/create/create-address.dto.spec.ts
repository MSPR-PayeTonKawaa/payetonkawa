import { validate } from 'class-validator';
import { CreateAddressDto } from './create-address.dto';

describe('CreateAddressDto', () => {
  let dto: CreateAddressDto;

  beforeEach(() => {
    dto = new CreateAddressDto();
  });

  it('should be defined', () => {
    expect(dto).toBeDefined();
  });

  describe('postalCode validation', () => {
    it('should accept valid postal code', async () => {
      dto.postalCode = '75001';
      dto.city = 'Paris';

      const errors = await validate(dto);
      const postalCodeErrors = errors.find(
        (error) => error.property === 'postalCode',
      );

      expect(postalCodeErrors).toBeUndefined();
    });

    it('should reject empty postal code', async () => {
      dto.postalCode = '';
      dto.city = 'Paris';

      const errors = await validate(dto);
      const postalCodeErrors = errors.find(
        (error) => error.property === 'postalCode',
      );

      expect(postalCodeErrors).toBeDefined();
      expect(postalCodeErrors?.constraints).toHaveProperty('isNotEmpty');
    });

    it('should reject invalid postal code format', async () => {
      dto.postalCode = '1234'; // Too short
      dto.city = 'Paris';

      const errors = await validate(dto);
      const postalCodeErrors = errors.find(
        (error) => error.property === 'postalCode',
      );

      expect(postalCodeErrors).toBeDefined();
      expect(postalCodeErrors?.constraints).toHaveProperty('matches');
    });

    it('should reject postal code with letters', async () => {
      dto.postalCode = '7500A';
      dto.city = 'Paris';

      const errors = await validate(dto);
      const postalCodeErrors = errors.find(
        (error) => error.property === 'postalCode',
      );

      expect(postalCodeErrors).toBeDefined();
      expect(postalCodeErrors?.constraints).toHaveProperty('matches');
    });

    it('should reject postal code too long', async () => {
      dto.postalCode = '750001'; // Too long
      dto.city = 'Paris';

      const errors = await validate(dto);
      const postalCodeErrors = errors.find(
        (error) => error.property === 'postalCode',
      );

      expect(postalCodeErrors).toBeDefined();
      expect(postalCodeErrors?.constraints).toHaveProperty('matches');
    });
  });

  describe('city validation', () => {
    it('should accept valid city', async () => {
      dto.postalCode = '75001';
      dto.city = 'Paris';

      const errors = await validate(dto);
      const cityErrors = errors.find((error) => error.property === 'city');

      expect(cityErrors).toBeUndefined();
    });

    it('should reject empty city', async () => {
      dto.postalCode = '75001';
      dto.city = '';

      const errors = await validate(dto);
      const cityErrors = errors.find((error) => error.property === 'city');

      expect(cityErrors).toBeDefined();
      expect(cityErrors?.constraints).toHaveProperty('isNotEmpty');
    });

    it('should reject city too short', async () => {
      dto.postalCode = '75001';
      dto.city = 'A'; // Too short

      const errors = await validate(dto);
      const cityErrors = errors.find((error) => error.property === 'city');

      expect(cityErrors).toBeDefined();
      expect(cityErrors?.constraints).toHaveProperty('minLength');
    });

    it('should reject city too long', async () => {
      dto.postalCode = '75001';
      dto.city = 'A'.repeat(101); // Too long

      const errors = await validate(dto);
      const cityErrors = errors.find((error) => error.property === 'city');

      expect(cityErrors).toBeDefined();
      expect(cityErrors?.constraints).toHaveProperty('maxLength');
    });

    it('should accept city at minimum length', async () => {
      dto.postalCode = '75001';
      dto.city = 'AB'; // Minimum length

      const errors = await validate(dto);
      const cityErrors = errors.find((error) => error.property === 'city');

      expect(cityErrors).toBeUndefined();
    });

    it('should accept city at maximum length', async () => {
      dto.postalCode = '75001';
      dto.city = 'A'.repeat(100); // Maximum length

      const errors = await validate(dto);
      const cityErrors = errors.find((error) => error.property === 'city');

      expect(cityErrors).toBeUndefined();
    });
  });

  describe('street validation (optional)', () => {
    it('should accept valid street', async () => {
      dto.postalCode = '75001';
      dto.city = 'Paris';
      dto.street = '123 Rue de la Paix';

      const errors = await validate(dto);
      const streetErrors = errors.find((error) => error.property === 'street');

      expect(streetErrors).toBeUndefined();
    });

    it('should accept undefined street', async () => {
      dto.postalCode = '75001';
      dto.city = 'Paris';
      // street is undefined

      const errors = await validate(dto);
      const streetErrors = errors.find((error) => error.property === 'street');

      expect(streetErrors).toBeUndefined();
    });

    it('should accept empty string street', async () => {
      dto.postalCode = '75001';
      dto.city = 'Paris';
      dto.street = '';

      const errors = await validate(dto);
      const streetErrors = errors.find((error) => error.property === 'street');

      expect(streetErrors).toBeUndefined();
    });

    it('should reject street too long', async () => {
      dto.postalCode = '75001';
      dto.city = 'Paris';
      dto.street = 'A'.repeat(256); // Too long

      const errors = await validate(dto);
      const streetErrors = errors.find((error) => error.property === 'street');

      expect(streetErrors).toBeDefined();
      expect(streetErrors?.constraints).toHaveProperty('maxLength');
    });

    it('should accept street at maximum length', async () => {
      dto.postalCode = '75001';
      dto.city = 'Paris';
      dto.street = 'A'.repeat(255); // Maximum length

      const errors = await validate(dto);
      const streetErrors = errors.find((error) => error.property === 'street');

      expect(streetErrors).toBeUndefined();
    });
  });

  describe('country validation (optional)', () => {
    it('should accept valid country', async () => {
      dto.postalCode = '75001';
      dto.city = 'Paris';
      dto.country = 'France';

      const errors = await validate(dto);
      const countryErrors = errors.find(
        (error) => error.property === 'country',
      );

      expect(countryErrors).toBeUndefined();
    });

    it('should accept undefined country', async () => {
      dto.postalCode = '75001';
      dto.city = 'Paris';
      // country is undefined

      const errors = await validate(dto);
      const countryErrors = errors.find(
        (error) => error.property === 'country',
      );

      expect(countryErrors).toBeUndefined();
    });

    it('should reject country too long', async () => {
      dto.postalCode = '75001';
      dto.city = 'Paris';
      dto.country = 'A'.repeat(101); // Too long

      const errors = await validate(dto);
      const countryErrors = errors.find(
        (error) => error.property === 'country',
      );

      expect(countryErrors).toBeDefined();
      expect(countryErrors?.constraints).toHaveProperty('maxLength');
    });

    it('should accept country at maximum length', async () => {
      dto.postalCode = '75001';
      dto.city = 'Paris';
      dto.country = 'A'.repeat(100); // Maximum length

      const errors = await validate(dto);
      const countryErrors = errors.find(
        (error) => error.property === 'country',
      );

      expect(countryErrors).toBeUndefined();
    });
  });

  describe('Complete DTO validation', () => {
    it('should pass with all valid required fields', async () => {
      dto.postalCode = '75001';
      dto.city = 'Paris';

      const errors = await validate(dto);

      expect(errors).toHaveLength(0);
    });

    it('should pass with all valid fields including optional ones', async () => {
      dto.postalCode = '75001';
      dto.city = 'Paris';
      dto.street = '123 Rue de la Paix';
      dto.country = 'France';

      const errors = await validate(dto);

      expect(errors).toHaveLength(0);
    });

    it('should fail with multiple invalid fields', async () => {
      dto.postalCode = '1234'; // Invalid
      dto.city = 'A'; // Too short

      const errors = await validate(dto);

      expect(errors).toHaveLength(2);
      expect(errors.some((e) => e.property === 'postalCode')).toBe(true);
      expect(errors.some((e) => e.property === 'city')).toBe(true);
    });
  });

  describe('Property assignment', () => {
    it('should allow property assignment', () => {
      dto.postalCode = '13001';
      dto.city = 'Marseille';
      dto.street = '456 Boulevard de la Liberté';
      dto.country = 'France';

      expect(dto.postalCode).toBe('13001');
      expect(dto.city).toBe('Marseille');
      expect(dto.street).toBe('456 Boulevard de la Liberté');
      expect(dto.country).toBe('France');
    });
  });
});
