import {
  CustomerResponseDto,
  CustomerListResponseDto,
} from './customer-response.dto';

describe('CustomerResponseDto', () => {
  let dto: CustomerResponseDto;

  beforeEach(() => {
    dto = new CustomerResponseDto();
  });

  it('should be defined', () => {
    expect(dto).toBeDefined();
  });

  it('should accept customer properties', () => {
    const customerData = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      username: 'testuser',
      name: 'Test User',
      firstName: 'Test',
      lastName: 'User',
      email: 'test@example.com',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    Object.assign(dto, customerData);

    expect(dto.id).toBe(customerData.id);
    expect(dto.username).toBe(customerData.username);
    expect(dto.name).toBe(customerData.name);
    expect(dto.firstName).toBe(customerData.firstName);
    expect(dto.lastName).toBe(customerData.lastName);
    expect(dto.email).toBe(customerData.email);
    expect(dto.createdAt).toBe(customerData.createdAt);
    expect(dto.updatedAt).toBe(customerData.updatedAt);
  });

  it('should handle address information', () => {
    const address = {
      id: 'addr-123',
      postalCode: '12345',
      city: 'Test City',
      street: '123 Test Street',
      country: 'Test Country',
    };

    dto.address = address;
    
    expect(dto.address).toBe(address);
    expect(dto.address?.postalCode).toBe('12345');
    expect(dto.address?.city).toBe('Test City');
  });

  it('should handle profile information', () => {
    const profile = {
      id: 'profile-123',
      firstName: 'Test',
      lastName: 'User',
      phone: '+1234567890',
      gender: 'M' as const,
      birthDate: new Date(),
      profession: 'Developer',
      isActive: true,
    };

    dto.profile = profile;
    
    expect(dto.profile).toBe(profile);
    expect(dto.profile?.firstName).toBe('Test');
    expect(dto.profile?.gender).toBe('M');
  });

  it('should handle optional company', () => {
    expect(dto.company).toBeUndefined();
    
    const company = {
      id: 'company-123',
      companyName: 'Test Company',
      siret: '12345678901234',
      businessSector: 'Technology',
      website: 'https://example.com',
      employeeCount: 50,
      isActive: true,
    };
    
    dto.company = company;
    expect(dto.company).toBe(company);
    expect(dto.company?.companyName).toBe('Test Company');
  });

  it('should handle JSON serialization', () => {
    dto.id = '123e4567-e89b-12d3-a456-426614174000';
    dto.username = 'testuser';
    dto.email = 'test@example.com';
    
    const serialized = JSON.stringify(dto);
    const parsed = JSON.parse(serialized) as Record<string, unknown>;
    
    expect(parsed.id).toBe('123e4567-e89b-12d3-a456-426614174000');
    expect(parsed.username).toBe('testuser');
    expect(parsed.email).toBe('test@example.com');
  });

  describe('DTO Structure', () => {
    it('should have all required properties', () => {
      expect(dto).toHaveProperty('id');
      expect(dto).toHaveProperty('username');
      expect(dto).toHaveProperty('name');
      expect(dto).toHaveProperty('firstName');
      expect(dto).toHaveProperty('lastName');
      expect(dto).toHaveProperty('email');
      expect(dto).toHaveProperty('createdAt');
      expect(dto).toHaveProperty('updatedAt');
    });
  });
});

describe('CustomerListResponseDto', () => {
  let listDto: CustomerListResponseDto;

  beforeEach(() => {
    listDto = new CustomerListResponseDto();
  });

  it('should be defined', () => {
    expect(listDto).toBeDefined();
  });

  it('should handle pagination properties', () => {
    listDto.data = [];
    listDto.total = 100;
    listDto.page = 1;
    listDto.limit = 10;
    listDto.totalPages = 10;

    expect(listDto.data).toEqual([]);
    expect(listDto.total).toBe(100);
    expect(listDto.page).toBe(1);
    expect(listDto.limit).toBe(10);
    expect(listDto.totalPages).toBe(10);
  });

  it('should handle customer data array', () => {
    const customer1 = new CustomerResponseDto();
    customer1.id = '1';
    customer1.username = 'user1';

    const customer2 = new CustomerResponseDto();
    customer2.id = '2';
    customer2.username = 'user2';

    listDto.data = [customer1, customer2];

    expect(listDto.data).toHaveLength(2);
    expect(listDto.data[0].id).toBe('1');
    expect(listDto.data[1].id).toBe('2');
  });

  it('should calculate pagination correctly', () => {
    listDto.total = 25;
    listDto.limit = 10;
    listDto.totalPages = Math.ceil(listDto.total / listDto.limit);

    expect(listDto.totalPages).toBe(3);
  });
});
