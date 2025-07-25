import { validate } from 'class-validator';
import { CreateCustomerDto } from './create-customer.dto';
import { CreateAddressDto } from './create-address.dto';
import { CreateProfileDto } from './create-profile.dto';
import { CreateCompanyDto } from './create-company.dto';

describe('CreateCustomerDto', () => {
  let dto: CreateCustomerDto;

  beforeEach(() => {
    dto = new CreateCustomerDto();
  });

  it('should be defined', () => {
    expect(dto).toBeDefined();
  });

  describe('Validation', () => {
    it('should validate a complete valid customer DTO', async () => {
      dto.username = 'testuser';
      dto.name = 'Test User';
      dto.firstName = 'Test';
      dto.lastName = 'User';
      dto.email = 'test@example.com';
      
      dto.address = new CreateAddressDto();
      dto.address.postalCode = '12345';
      dto.address.city = 'Test City';
      dto.address.street = '123 Test Street';
      dto.address.country = 'Test Country';

      dto.profile = new CreateProfileDto();
      dto.profile.firstName = 'Test';
      dto.profile.lastName = 'User';
      dto.profile.phone = '+1234567890';
      dto.profile.gender = 'M';

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should fail validation with invalid email', async () => {
      dto.username = 'testuser';
      dto.name = 'Test User';
      dto.firstName = 'Test';
      dto.lastName = 'User';
      dto.email = 'invalid-email';

      dto.address = new CreateAddressDto();
      dto.address.postalCode = '12345';
      dto.address.city = 'Test City';
      dto.address.street = '123 Test Street';
      dto.address.country = 'Test Country';

      dto.profile = new CreateProfileDto();
      dto.profile.firstName = 'Test';
      dto.profile.lastName = 'User';
      dto.profile.phone = '+1234567890';
      dto.profile.gender = 'M';

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some((error) => error.property === 'email')).toBe(true);
    });

    it('should fail validation with missing required fields', async () => {
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should fail validation with short username', async () => {
      dto.username = 'ab'; // Too short
      dto.name = 'Test User';
      dto.firstName = 'Test';
      dto.lastName = 'User';
      dto.email = 'test@example.com';

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some((error) => error.property === 'username')).toBe(true);
    });
  });

  describe('Nested DTOs', () => {
    it('should properly handle address DTO', () => {
      const address = new CreateAddressDto();
      address.postalCode = '12345';
      address.city = 'Test City';
      address.street = '123 Test Street';
      address.country = 'Test Country';
      
      dto.address = address;
      
      expect(dto.address).toBe(address);
      expect(dto.address.city).toBe('Test City');
    });

    it('should properly handle profile DTO', () => {
      const profile = new CreateProfileDto();
      profile.firstName = 'Test';
      profile.lastName = 'User';
      profile.phone = '+1234567890';
      profile.gender = 'M';
      
      dto.profile = profile;
      
      expect(dto.profile).toBe(profile);
      expect(dto.profile.firstName).toBe('Test');
    });

    it('should properly handle optional company DTO', () => {
      expect(dto.company).toBeUndefined();
      
      const company = new CreateCompanyDto();
      company.companyName = 'Test Company';
      company.siret = '12345678901234';
      company.businessSector = 'Technology';
      
      dto.company = company;
      
      expect(dto.company).toBe(company);
      expect(dto.company.companyName).toBe('Test Company');
    });
  });

  describe('DTO Properties', () => {
    it('should accept all customer properties', () => {
      const customerData = {
        username: 'testuser',
        name: 'Test User',
        firstName: 'Test',
        lastName: 'User',
        email: 'test@example.com',
      };

      Object.assign(dto, customerData);

      expect(dto.username).toBe(customerData.username);
      expect(dto.name).toBe(customerData.name);
      expect(dto.firstName).toBe(customerData.firstName);
      expect(dto.lastName).toBe(customerData.lastName);
      expect(dto.email).toBe(customerData.email);
    });

    it('should handle long field validation', async () => {
      dto.username = 'a'.repeat(101); // Too long
      dto.name = 'Test User';
      dto.firstName = 'Test';
      dto.lastName = 'User';
      dto.email = 'test@example.com';

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some((error) => error.property === 'username')).toBe(true);
    });
  });

  describe('Company Integration', () => {
    it('should handle business customers with company', async () => {
      dto.username = 'businessuser';
      dto.name = 'Business User';
      dto.firstName = 'Business';
      dto.lastName = 'User';
      dto.email = 'business@company.com';
      
      dto.address = new CreateAddressDto();
      dto.address.postalCode = '12345';
      dto.address.city = 'Business City';
      dto.address.street = '123 Business Street';
      dto.address.country = 'Business Country';

      dto.profile = new CreateProfileDto();
      dto.profile.firstName = 'Business';
      dto.profile.lastName = 'User';
      dto.profile.phone = '+1234567890';
      dto.profile.gender = 'M';

      dto.company = new CreateCompanyDto();
      dto.company.companyName = 'Test Company Ltd';
      dto.company.siret = '12345678901234';
      dto.company.businessSector = 'Technology';

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
      expect(dto.company).toBeDefined();
      expect(dto.company.companyName).toBe('Test Company Ltd');
    });
  });
});
