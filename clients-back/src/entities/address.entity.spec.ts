import { Address } from './address.entity';

describe('Address Entity', () => {
  let address: Address;

  beforeEach(() => {
    address = new Address();
  });

  it('should be defined', () => {
    expect(address).toBeDefined();
  });

  it('should have correct properties', () => {
    expect(address).toHaveProperty('id');
    expect(address).toHaveProperty('postalCode');
    expect(address).toHaveProperty('city');
    expect(address).toHaveProperty('street');
    expect(address).toHaveProperty('country');
    expect(address).toHaveProperty('createdAt');
    expect(address).toHaveProperty('updatedAt');
  });

  it('should accept valid property assignments', () => {
    const testData = {
      id: 'addr-123',
      postalCode: '75001',
      city: 'Paris',
      street: '123 Rue de la Paix',
      country: 'France',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    Object.assign(address, testData);

    expect(address.id).toBe(testData.id);
    expect(address.postalCode).toBe(testData.postalCode);
    expect(address.city).toBe(testData.city);
    expect(address.street).toBe(testData.street);
    expect(address.country).toBe(testData.country);
    expect(address.createdAt).toBe(testData.createdAt);
    expect(address.updatedAt).toBe(testData.updatedAt);
  });

  it('should handle optional fields', () => {
    address.postalCode = '13001';
    address.city = 'Marseille';
    // street and country sont optionnels

    expect(address.postalCode).toBe('13001');
    expect(address.city).toBe('Marseille');
    expect(address.street).toBeUndefined();
    expect(address.country).toBeUndefined();
  });

  it('should serialize to JSON correctly', () => {
    address.postalCode = '75001';
    address.city = 'Paris';
    address.street = '123 Rue de la Paix';
    address.country = 'France';

    const json = JSON.stringify(address);
    const parsed = JSON.parse(json) as Record<string, unknown>;

    expect(parsed.postalCode).toBe('75001');
    expect(parsed.city).toBe('Paris');
    expect(parsed.street).toBe('123 Rue de la Paix');
    expect(parsed.country).toBe('France');
  });

  it('should handle full address data', () => {
    const completeAddress = {
      postalCode: '69001',
      city: 'Lyon',
      street: '456 Avenue de la République',
      country: 'France',
    };

    Object.assign(address, completeAddress);

    expect(address.postalCode).toBe('69001');
    expect(address.city).toBe('Lyon');
    expect(address.street).toBe('456 Avenue de la République');
    expect(address.country).toBe('France');
  });
});
