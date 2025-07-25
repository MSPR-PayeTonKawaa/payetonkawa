import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CustomersService } from './customers.service';
import { Customer, Address, Profile, Company } from '../entities';
import { CustomerEventPublisher } from '../rabbitmq/publishers/customer-event.publisher';
import { CreateCustomerDto } from '../dto/create/create-customer.dto';
import { UpdateCustomerDto } from '../dto/update/update-customer.dto';
import { NotFoundException, ConflictException } from '@nestjs/common';

describe('CustomersService', () => {
  let service: CustomersService;
  let customerRepository: Repository<Customer>;
  let companyRepository: Repository<Company>;
  let customerEventPublisher: CustomerEventPublisher;

  const mockRepository = {
    findOne: jest.fn(),
    find: jest.fn(),
    save: jest.fn(),
    create: jest.fn(),
    remove: jest.fn(),
    findOneBy: jest.fn(),
    count: jest.fn(),
    createQueryBuilder: jest.fn(() => ({
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      getManyAndCount: jest.fn(),
    })),
  };

  const mockEventPublisher = {
    publishCustomerCreated: jest.fn(),
    publishCustomerUpdated: jest.fn(),
    publishCustomerDeleted: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CustomersService,
        {
          provide: getRepositoryToken(Customer),
          useValue: mockRepository,
        },
        {
          provide: getRepositoryToken(Address),
          useValue: mockRepository,
        },
        {
          provide: getRepositoryToken(Profile),
          useValue: mockRepository,
        },
        {
          provide: getRepositoryToken(Company),
          useValue: mockRepository,
        },
        {
          provide: CustomerEventPublisher,
          useValue: mockEventPublisher,
        },
      ],
    }).compile();

    service = module.get<CustomersService>(CustomersService);
    customerRepository = module.get<Repository<Customer>>(
      getRepositoryToken(Customer),
    );
    companyRepository = module.get<Repository<Company>>(
      getRepositoryToken(Company),
    );
    customerEventPublisher = module.get<CustomerEventPublisher>(
      CustomerEventPublisher,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a customer successfully', async () => {
      const createCustomerDto: CreateCustomerDto = {
        username: 'testuser',
        email: 'test@example.com',
        name: 'Test User',
        firstName: 'Test',
        lastName: 'User',
        address: {
          postalCode: '75001',
          city: 'Paris',
          street: '123 Rue de la Paix',
          country: 'France',
        },
        profile: {
          firstName: 'Test',
          lastName: 'User',
          phone: '+33123456789',
          gender: 'M',
          profession: 'Developer',
        },
      };

      const savedAddress = { id: '1', ...createCustomerDto.address };
      const savedProfile = { id: '2', ...createCustomerDto.profile };
      const savedCustomer = {
        id: '3',
        ...createCustomerDto,
        address: savedAddress,
        profile: savedProfile,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockRepository.findOne.mockResolvedValue(null); // No existing customer
      mockRepository.save
        .mockResolvedValueOnce(savedAddress) // Address save
        .mockResolvedValueOnce(savedProfile) // Profile save
        .mockResolvedValueOnce(savedCustomer); // Customer save
      mockRepository.create
        .mockReturnValueOnce(savedAddress)
        .mockReturnValueOnce(savedProfile)
        .mockReturnValueOnce(savedCustomer);

      const result = await service.create(createCustomerDto);

      expect(result).toBeDefined();
      expect(result.username).toBe('testuser');
      expect(mockEventPublisher.publishCustomerCreated).toHaveBeenCalledWith(savedCustomer);
    });

    it('should throw ConflictException when email already exists', async () => {
      const createCustomerDto: CreateCustomerDto = {
        username: 'testuser',
        email: 'existing@example.com',
        name: 'Test User',
        firstName: 'Test',
        lastName: 'User',
        address: {
          postalCode: '75001',
          city: 'Paris',
          street: '123 Rue de la Paix',
          country: 'France',
        },
        profile: {
          firstName: 'Test',
          lastName: 'User',
          phone: '+33123456789',
          gender: 'M',
          profession: 'Developer',
        },
      };

      mockRepository.findOne.mockResolvedValue({ id: '1', email: 'existing@example.com' });

      await expect(service.create(createCustomerDto)).rejects.toThrow(ConflictException);
    });
  });

  describe('findOne', () => {
    it('should return a customer when found', async () => {
      const customerId = '1';
      const expectedCustomer = {
        id: customerId,
        username: 'testuser',
        email: 'test@example.com',
        address: {},
        profile: {},
      };

      mockRepository.findOne.mockResolvedValue(expectedCustomer);

      const result = await service.findOne(customerId);

      expect(result).toEqual(expectedCustomer);
      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: { id: customerId },
        relations: ['address', 'profile', 'company'],
      });
    });

    it('should throw NotFoundException when customer not found', async () => {
      const customerId = 'non-existent';
      mockRepository.findOne.mockResolvedValue(null);

      await expect(service.findOne(customerId)).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('should update a customer successfully', async () => {
      const customerId = '1';
      const updateCustomerDto: UpdateCustomerDto = {
        username: 'updateduser',
      };

      const existingCustomer = {
        id: customerId,
        username: 'testuser',
        email: 'test@example.com',
        address: {},
        profile: {},
      };

      const updatedCustomer = {
        ...existingCustomer,
        ...updateCustomerDto,
      };

      mockRepository.findOne.mockResolvedValue(existingCustomer);
      mockRepository.save.mockResolvedValue(updatedCustomer);

      const result = await service.update(customerId, updateCustomerDto);

      expect(result).toEqual(updatedCustomer);
      expect(mockEventPublisher.publishCustomerUpdated).toHaveBeenCalled();
    });

    it('should throw NotFoundException when updating non-existent customer', async () => {
      const customerId = 'non-existent';
      const updateCustomerDto: UpdateCustomerDto = { username: 'updated' };

      mockRepository.findOne.mockResolvedValue(null);

      await expect(service.update(customerId, updateCustomerDto)).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('should remove a customer successfully', async () => {
      const customerId = '1';
      const existingCustomer = {
        id: customerId,
        username: 'testuser',
        name: 'Test User',
        email: 'test@example.com',
        profile: {
          id: '2',
          isActive: true,
        },
      };

      mockRepository.findOne.mockResolvedValue(existingCustomer);
      mockRepository.save.mockResolvedValue({ ...existingCustomer.profile, isActive: false });

      await service.remove(customerId);

      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: { id: customerId },
        relations: ['profile'],
      });
      expect(mockRepository.save).toHaveBeenCalledWith({
        ...existingCustomer.profile,
        isActive: false,
      });
      expect(mockEventPublisher.publishCustomerDeleted).toHaveBeenCalledWith(
        customerId,
        'Test User',
        'test@example.com',
      );
    });

    it('should throw NotFoundException when removing non-existent customer', async () => {
      const customerId = 'non-existent';
      mockRepository.findOne.mockResolvedValue(null);

      await expect(service.remove(customerId)).rejects.toThrow(NotFoundException);
    });
  });

  describe('findAll', () => {
    it('should return paginated customers', async () => {
      const customers = [
        { id: '1', username: 'user1', email: 'user1@example.com' },
        { id: '2', username: 'user2', email: 'user2@example.com' },
      ];

      const mockQueryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([customers, 2]),
      };

      mockRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      const result = await service.findAll({ page: 1, limit: 10 });

      expect(result.data).toEqual(customers);
      expect(result.total).toBe(2);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(10);
      expect(mockRepository.createQueryBuilder).toHaveBeenCalledWith('customer');
    });

    it('should handle search with city filter', async () => {
      const customers = [
        { id: '1', username: 'user1', email: 'user1@example.com' },
      ];

      const mockQueryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([customers, 1]),
      };

      mockRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      const result = await service.findAll({
        page: 1,
        limit: 10,
        search: 'user',
        city: 'Paris',
        isActive: true,
      });

      expect(result.data).toEqual(customers);
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledTimes(3); // search, city, isActive
    });

    it('should handle empty search results', async () => {
      const mockQueryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
      };

      mockRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      const result = await service.findAll({ page: 1, limit: 10 });

      expect(result.data).toEqual([]);
      expect(result.total).toBe(0);
      expect(result.totalPages).toBe(0);
    });
  });

  describe('Error handling and edge cases', () => {
    it('should handle username conflicts during creation', async () => {
      const createDto: CreateCustomerDto = {
        username: 'existinguser',
        name: 'New User',
        email: 'new@example.com',
        firstName: 'New',
        lastName: 'User',
        address: {
          postalCode: '75001',
          city: 'Paris',
        },
        profile: {
          firstName: 'New',
          lastName: 'User',
          phone: '+1234567890',
          gender: 'M',
          birthDate: '1990-01-01',
          profession: 'Developer',
        },
      };

      mockRepository.findOne.mockResolvedValueOnce({ username: 'existinguser' });

      await expect(service.create(createDto)).rejects.toThrow(ConflictException);
      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: { email: 'new@example.com' },
      });
    });

    it('should handle company SIRET conflicts', async () => {
      const createDto: CreateCustomerDto = {
        username: 'businessuser',
        name: 'Business User',
        email: 'business@example.com',
        firstName: 'Business',
        lastName: 'User',
        address: {
          postalCode: '75001',
          city: 'Paris',
        },
        profile: {
          firstName: 'Business',
          lastName: 'User',
          phone: '+1234567890',
          gender: 'M',
          birthDate: '1985-05-15',
          profession: 'CEO',
        },
        company: {
          companyName: 'Test Company',
          siret: '12345678901234',
          businessSector: 'Technology',
          website: 'https://example.com',
          employeeCount: 50,
        },
      };

      mockRepository.findOne
        .mockResolvedValueOnce(null) // No email conflict
        .mockResolvedValueOnce(null) // No username conflict
        .mockResolvedValueOnce({ company: { siret: '12345678901234' } }); // SIRET conflict

      await expect(service.create(createDto)).rejects.toThrow(ConflictException);
    });

    it('should handle update with email conflict', async () => {
      const updateDto: UpdateCustomerDto = {
        email: 'conflict@example.com',
      };

      mockRepository.findOneBy.mockResolvedValueOnce({ id: '1', email: 'old@example.com' });
      mockRepository.findOne.mockResolvedValueOnce({ id: '2', email: 'conflict@example.com' });

      await expect(service.update('1', updateDto)).rejects.toThrow(ConflictException);
    });

    it('should handle update with username conflict', async () => {
      const updateDto: UpdateCustomerDto = {
        username: 'conflictuser',
      };

      mockRepository.findOneBy.mockResolvedValueOnce({ id: '1', username: 'olduser' });
      mockRepository.findOne.mockResolvedValueOnce({ id: '2', username: 'conflictuser' });

      await expect(service.update('1', updateDto)).rejects.toThrow(ConflictException);
    });

    it('should handle repository errors gracefully', async () => {
      mockRepository.findOneBy.mockRejectedValue(new Error('Database error'));

      await expect(service.findOne('1')).rejects.toThrow('Database error');
    });
  });
});
