import { Customer } from './customer.entity';
import { Address } from './address.entity';
import { Profile } from './profile.entity';
import { Company } from './company.entity';

describe('Customer Entity', () => {
  let customer: Customer;

  beforeEach(() => {
    customer = new Customer();
  });

  it('should be defined', () => {
    expect(customer).toBeDefined();
  });

  it('should have default properties', () => {
    expect(customer.id).toBeUndefined();
    expect(customer.username).toBeUndefined();
    expect(customer.name).toBeUndefined();
    expect(customer.firstName).toBeUndefined();
    expect(customer.lastName).toBeUndefined();
    expect(customer.email).toBeUndefined();
  });

  it('should accept property assignments', () => {
    const testData = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      username: 'testuser',
      name: 'Test Name',
      firstName: 'Test',
      lastName: 'User',
      email: 'test@example.com',
    };

    Object.assign(customer, testData);

    expect(customer.id).toBe(testData.id);
    expect(customer.username).toBe(testData.username);
    expect(customer.name).toBe(testData.name);
    expect(customer.firstName).toBe(testData.firstName);
    expect(customer.lastName).toBe(testData.lastName);
    expect(customer.email).toBe(testData.email);
  });

  it('should handle relations properly', () => {
    const address = new Address();
    const profile = new Profile();
    const company = new Company();

    customer.address = address;
    customer.profile = profile;
    customer.company = company;

    expect(customer.address).toBe(address);
    expect(customer.profile).toBe(profile);
    expect(customer.company).toBe(company);
  });

  it('should handle timestamps', () => {
    const now = new Date();
    customer.createdAt = now;
    customer.updatedAt = now;

    expect(customer.createdAt).toBe(now);
    expect(customer.updatedAt).toBe(now);
  });

  it('should handle optional company relation', () => {
    expect(customer.company).toBeUndefined();
    
    const company = new Company();
    customer.company = company;
    expect(customer.company).toBe(company);
  });

  // Test des propriétés essentielles
  describe('Entity Properties', () => {
    it('should handle all required properties', () => {
      const customerData = {
        username: 'test-user',
        name: 'Test User',
        firstName: 'Test',
        lastName: 'User',
        email: 'test@example.com',
      };

      Object.assign(customer, customerData);

      expect(customer).toHaveProperty('id');
      expect(customer).toHaveProperty('username', customerData.username);
      expect(customer).toHaveProperty('name', customerData.name);
      expect(customer).toHaveProperty('firstName', customerData.firstName);
      expect(customer).toHaveProperty('lastName', customerData.lastName);
      expect(customer).toHaveProperty('email', customerData.email);
      expect(customer).toHaveProperty('createdAt');
      expect(customer).toHaveProperty('updatedAt');
    });
  });
});
