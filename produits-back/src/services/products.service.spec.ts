import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotFoundException, ConflictException } from '@nestjs/common';

import { ProductsService, FindProductsOptions } from './products.service';
import { Product, ProductDetails, StockStatus } from '../entities';
import { 
  CreateProductDto,
  UpdateProductDto,
  UpdateStockDto,
  SetStockDto,
} from '../dto';
import { ProductEventPublisher } from '../rabbitmq/publishers/product-event.publisher';
import { StockEventPublisher } from '../rabbitmq/publishers/stock-event.publisher';

describe('ProductsService', () => {
  let service: ProductsService;
  let productRepository: Repository<Product>;
  let productDetailsRepository: Repository<ProductDetails>;

  const mockProductDetails: ProductDetails = {
    id: 'details-uuid-1',
    price: 25.99,
    description: 'Café test description',
    color: 'Brun',
    category: 'Café en grains',
    origin: 'Test Origin',
    weight: '250g',
    intensity: 7,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    product: {} as Product, // Référence circulaire évitée
    getFormattedPrice: jest.fn().mockReturnValue('25.99 €'),
    isExpensive: jest.fn().mockReturnValue(false),
    isPremium: jest.fn().mockReturnValue(false),
  };

  const mockProduct: Product = {
    id: 'test-uuid-1',
    name: 'Café Arabica Test',
    stock: 100,
    stockStatus: StockStatus.AVAILABLE,
    isActive: true,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    details: mockProductDetails,
    updateStockStatus: jest.fn(),
    incrementStock: jest.fn(),
    decrementStock: jest.fn(),
    isAvailable: jest.fn(),
  };

  const mockProductRepository = {
    findOne: jest.fn(),
    find: jest.fn(),
    save: jest.fn(),
    create: jest.fn(),
    createQueryBuilder: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  };

  const mockProductDetailsRepository = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    createQueryBuilder: jest.fn(),
  };

  const mockProductEventPublisher = {
    publishProductCreated: jest.fn(),
    publishProductUpdated: jest.fn(),
    publishProductDeleted: jest.fn(),
  };

  const mockStockEventPublisher = {
    publishStockUpdated: jest.fn(),
    publishStockAlert: jest.fn(),
  };

  const mockQueryBuilder = {
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    getManyAndCount: jest.fn(),
    getMany: jest.fn(),
    select: jest.fn().mockReturnThis(),
    distinct: jest.fn().mockReturnThis(),
    getRawMany: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductsService,
        {
          provide: getRepositoryToken(Product),
          useValue: mockProductRepository,
        },
        {
          provide: getRepositoryToken(ProductDetails),
          useValue: mockProductDetailsRepository,
        },
        {
          provide: ProductEventPublisher,
          useValue: mockProductEventPublisher,
        },
        {
          provide: StockEventPublisher,
          useValue: mockStockEventPublisher,
        },
      ],
    }).compile();

    service = module.get<ProductsService>(ProductsService);
    productRepository = module.get<Repository<Product>>(getRepositoryToken(Product));
    productDetailsRepository = module.get<Repository<ProductDetails>>(getRepositoryToken(ProductDetails));

    // Reset mocks
    jest.clearAllMocks();
    mockProductRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);
    mockProductDetailsRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a new product successfully', async () => {
      const createDto: CreateProductDto = {
        name: 'Nouveau Café',
        stock: 100,
        details: {
          price: 25.99,
          description: 'Description test',
          color: 'Brun',
          category: 'Café en grains',
          origin: 'Test',
          weight: '250g',
          intensity: 7,
        },
      };

      mockProductRepository.findOne.mockResolvedValue(null); // Aucun produit existant
      mockProductDetailsRepository.create.mockReturnValue(mockProductDetails);
      mockProductRepository.create.mockReturnValue(mockProduct);
      mockProductRepository.save.mockResolvedValue(mockProduct);
      mockProductEventPublisher.publishProductCreated.mockResolvedValue(undefined);

      const result = await service.create(createDto);

      expect(mockProductRepository.findOne).toHaveBeenCalledWith({
        where: { name: createDto.name }
      });
      expect(mockProductDetailsRepository.create).toHaveBeenCalledWith(createDto.details);
      expect(mockProductRepository.create).toHaveBeenCalledWith({
        name: createDto.name,
        stock: createDto.stock,
        isActive: true,
        details: mockProductDetails,
      });
      expect(mockProductRepository.save).toHaveBeenCalledWith(mockProduct);
      expect(mockProductEventPublisher.publishProductCreated).toHaveBeenCalledWith(mockProduct);
      expect(result).toEqual(mockProduct);
    });

    it('should throw ConflictException when product name already exists', async () => {
      const createDto: CreateProductDto = {
        name: 'Café Existant',
        stock: 100,
        details: {
          price: 25.99,
          description: 'Description test',
          color: 'Brun',
          category: 'Café en grains',
          origin: 'Test',
          weight: '250g',
          intensity: 7,
        },
      };

      mockProductRepository.findOne.mockResolvedValue(mockProduct);

      await expect(service.create(createDto)).rejects.toThrow(ConflictException);
      expect(mockProductRepository.findOne).toHaveBeenCalledWith({
        where: { name: createDto.name }
      });
      expect(mockProductRepository.save).not.toHaveBeenCalled();
    });
  });

  describe('findAll', () => {
    it('should return paginated products with default options', async () => {
      const expectedProducts = [mockProduct];
      const expectedCount = 1;

      mockQueryBuilder.getManyAndCount.mockResolvedValue([expectedProducts, expectedCount]);

      const result = await service.findAll();

      expect(mockProductRepository.createQueryBuilder).toHaveBeenCalledWith('product');
      expect(mockQueryBuilder.leftJoinAndSelect).toHaveBeenCalledWith('product.details', 'details');
      expect(mockQueryBuilder.orderBy).toHaveBeenCalledWith('product.createdAt', 'DESC');
      expect(mockQueryBuilder.skip).toHaveBeenCalledWith(0);
      expect(mockQueryBuilder.take).toHaveBeenCalledWith(10);

      expect(result).toEqual({
        data: expectedProducts,
        total: expectedCount,
        page: 1,
        limit: 10,
        totalPages: 1,
      });
    });

    it('should apply search filter correctly', async () => {
      const options: FindProductsOptions = {
        search: 'arabica',
      };

      mockQueryBuilder.getManyAndCount.mockResolvedValue([[mockProduct], 1]);

      await service.findAll(options);

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        '(product.name ILIKE :search OR details.description ILIKE :search OR details.category ILIKE :search)',
        { search: '%arabica%' }
      );
    });
  });

  describe('findOne', () => {
    it('should return a product by id', async () => {
      const id = 'test-uuid-1';
      mockProductRepository.findOne.mockResolvedValue(mockProduct);

      const result = await service.findOne(id);

      expect(mockProductRepository.findOne).toHaveBeenCalledWith({
        where: { id },
        relations: ['details'],
      });
      expect(result).toEqual(mockProduct);
    });

    it('should throw NotFoundException when product does not exist', async () => {
      const id = 'non-existent-uuid';
      mockProductRepository.findOne.mockResolvedValue(null);

      await expect(service.findOne(id)).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('should update a product successfully', async () => {
      const id = 'test-uuid-1';
      const updateDto: UpdateProductDto = {
        name: 'Café Mis à Jour',
        details: {
          price: 29.99,
        },
      };

      const updatedProduct = { ...mockProduct, name: updateDto.name };

      mockProductRepository.findOne
        .mockResolvedValueOnce(mockProduct) // Premier appel pour trouver le produit
        .mockResolvedValueOnce(null); // Deuxième appel pour vérifier que le nouveau nom n'existe pas
      mockProductRepository.save.mockResolvedValue(updatedProduct);
      mockProductEventPublisher.publishProductUpdated.mockResolvedValue(undefined);

      const result = await service.update(id, updateDto);

      expect(mockProductRepository.findOne).toHaveBeenCalledWith({
        where: { id },
        relations: ['details'],
      });
      expect(mockProductRepository.save).toHaveBeenCalled();
      expect(mockProductEventPublisher.publishProductUpdated).toHaveBeenCalledWith(updatedProduct, ['name', 'details']);
      expect(result).toEqual(updatedProduct);
    });

    it('should throw NotFoundException when product does not exist', async () => {
      const id = 'non-existent-uuid';
      const updateDto: UpdateProductDto = { name: 'Test' };

      mockProductRepository.findOne.mockResolvedValue(null);

      await expect(service.update(id, updateDto)).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateStock', () => {
    it('should update stock by adding quantity', async () => {
      const id = 'test-uuid-1';
      const updateStockDto: UpdateStockDto = { quantity: 50 };

      const updatedProduct = { ...mockProduct, stock: 150 };

      mockProductRepository.findOne.mockResolvedValue(mockProduct);
      mockProductRepository.save.mockResolvedValue(updatedProduct);
      mockStockEventPublisher.publishStockUpdated.mockResolvedValue(undefined);

      const result = await service.updateStock(id, updateStockDto);

      expect(result.stock).toBe(150);
      expect(mockStockEventPublisher.publishStockUpdated).toHaveBeenCalledWith(updatedProduct, 100);
    });
  });

  describe('setStock', () => {
    it('should set exact stock amount', async () => {
      const id = 'test-uuid-1';
      const setStockDto: SetStockDto = { stock: 200 };

      const updatedProduct = { ...mockProduct, stock: 200 };

      mockProductRepository.findOne.mockResolvedValue(mockProduct);
      mockProductRepository.save.mockResolvedValue(updatedProduct);

      const result = await service.setStock(id, setStockDto);

      expect(result.stock).toBe(200);
    });
  });

  describe('remove', () => {
    it('should deactivate a product (soft delete)', async () => {
      const id = 'test-uuid-1';
      const deactivatedProduct = { ...mockProduct, isActive: false };

      mockProductRepository.findOne.mockResolvedValue(mockProduct);
      mockProductRepository.save.mockResolvedValue(deactivatedProduct);
      mockProductEventPublisher.publishProductDeleted.mockResolvedValue(undefined);

      await service.remove(id);

      expect(mockProductRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ isActive: false })
      );
      expect(mockProductEventPublisher.publishProductDeleted).toHaveBeenCalledWith(id, mockProduct.name);
    });
  });

  describe('searchProducts', () => {
    it('should search products by query', async () => {
      const query = 'arabica';
      const searchResults = [mockProduct];

      mockQueryBuilder.getMany.mockResolvedValue(searchResults);

      const result = await service.searchProducts(query);

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        '(product.name ILIKE :query OR details.description ILIKE :query OR details.category ILIKE :query OR details.origin ILIKE :query)',
        { query: '%arabica%' }
      );
      expect(result).toEqual(searchResults);
    });
  });

  describe('getCategories', () => {
    it('should return unique categories', async () => {
      const categories = [
        { category: 'Café en grains' },
        { category: 'Café moulu' },
        { category: 'Thé' },
      ];

      mockQueryBuilder.getRawMany.mockResolvedValue(categories);

      const result = await service.getCategories();

      expect(mockProductDetailsRepository.createQueryBuilder).toHaveBeenCalledWith('details');
      expect(mockQueryBuilder.select).toHaveBeenCalledWith('DISTINCT details.category', 'category');
      expect(result).toEqual(['Café en grains', 'Café moulu', 'Thé']);
    });
  });

  describe('getStockAlerts', () => {
    it('should return stock alerts', async () => {
      const outOfStockProducts = [{ ...mockProduct, stock: 0, stockStatus: StockStatus.RUPTURE }];
      const lowStockProducts = [{ ...mockProduct, stock: 50, stockStatus: StockStatus.LOW }];

      mockProductRepository.find
        .mockResolvedValueOnce(outOfStockProducts)
        .mockResolvedValueOnce(lowStockProducts);

      const result = await service.getStockAlerts();

      expect(result).toEqual({
        outOfStock: outOfStockProducts,
        lowStock: lowStockProducts,
        totalAlerts: 2,
      });
    });
  });

  describe('getProductsByPriceRange', () => {
    it('should return products in price range', async () => {
      const min = 20;
      const max = 30;
      const products = [mockProduct];

      mockQueryBuilder.getMany.mockResolvedValue(products);

      const result = await service.getProductsByPriceRange(min, max);

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('details.price >= :min AND details.price <= :max', { min, max });
      expect(result).toEqual(products);
    });
  });
});
