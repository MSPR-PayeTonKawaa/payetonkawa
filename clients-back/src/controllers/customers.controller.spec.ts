import { Test, TestingModule } from '@nestjs/testing';
import { CustomersController } from './customers.controller';
import { CustomersService } from '../services/customers.service';
import { CreateCustomerDto } from '../dto/create/create-customer.dto';
import { UpdateCustomerDto } from '../dto/update/update-customer.dto';

describe('CustomersController', () => {
  let controller: CustomersController;
  let service: CustomersService;

  const mockCustomersService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    search: jest.fn(),
    getStatistics: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CustomersController],
      providers: [
        {
          provide: CustomersService,
          useValue: mockCustomersService,
        },
      ],
    }).compile();

    controller = module.get<CustomersController>(CustomersController);
    service = module.get<CustomersService>(CustomersService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should create a customer', async () => {
      const createCustomerDto: Partial<CreateCustomerDto> = {
        username: 'testuser',
        email: 'test@example.com',
        name: 'Test User',
        firstName: 'Test',
        lastName: 'User',
      };

      const expectedResult = { id: '1', ...createCustomerDto };
      mockCustomersService.create.mockResolvedValue(expectedResult);

      const result = await controller.create(createCustomerDto as CreateCustomerDto);

      expect(mockCustomersService.create).toHaveBeenCalledWith(createCustomerDto);
      expect(result).toEqual(expectedResult);
    });
  });

  describe('findAll', () => {
    it('should return an array of customers', async () => {
      const expectedResult = {
        data: [{ 
          id: '1', 
          username: 'testuser', 
          email: 'test@example.com' 
        }],
        total: 1,
        page: 1,
        limit: 10,
      };
      mockCustomersService.findAll.mockResolvedValue(expectedResult);

      const result = await controller.findAll('1', '10');

      expect(mockCustomersService.findAll).toHaveBeenCalledWith({
        page: 1,
        limit: 10,
      });
      expect(result).toEqual(expectedResult);
    });
  });

  describe('findOne', () => {
    it('should return a single customer', async () => {
      const expectedResult = { 
        id: '1', 
        username: 'testuser', 
        email: 'test@example.com' 
      };
      mockCustomersService.findOne.mockResolvedValue(expectedResult);

      const result = await controller.findOne('1');

      expect(mockCustomersService.findOne).toHaveBeenCalledWith('1');
      expect(result).toEqual(expectedResult);
    });
  });

  describe('update', () => {
    it('should update a customer', async () => {
      const updateCustomerDto: UpdateCustomerDto = {
        username: 'updateduser',
      };
      const expectedResult = { 
        id: '1', 
        username: 'updateduser', 
        email: 'test@example.com' 
      };
      mockCustomersService.update.mockResolvedValue(expectedResult);

      const result = await controller.update('1', updateCustomerDto);

      expect(mockCustomersService.update).toHaveBeenCalledWith('1', updateCustomerDto);
      expect(result).toEqual(expectedResult);
    });
  });

  describe('remove', () => {
    it('should remove a customer', async () => {
      mockCustomersService.remove.mockResolvedValue(undefined);

      await controller.remove('1');

      expect(mockCustomersService.remove).toHaveBeenCalledWith('1');
    });
  });
});
