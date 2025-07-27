import { Test, TestingModule } from '@nestjs/testing';
import { ProductsController } from './products.controller';
import { ProductsService, FindProductsOptions } from '../services/products.service';
import { 
  CreateProductDto,
  UpdateProductDto,
  UpdateStockDto,
  SetStockDto,
  ProductResponseDto,
  ProductListResponseDto,
  StockAlertResponseDto,
} from '../dto';
import { StockStatus } from '../entities';

describe('ProductsController', () => {
  let controller: ProductsController;
  let service: ProductsService;

  const mockProduct: ProductResponseDto = {
    id: 'test-uuid-1',
    name: 'Café Arabica Test',
    stock: 100,
    stockStatus: StockStatus.AVAILABLE,
    isActive: true,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    details: {
      id: 'details-uuid-1',
      price: 25.99,
      description: 'Café test description',
      color: 'Brun',
      category: 'Café en grains',
      origin: 'Test Origin',
      weight: '250g',
      intensity: 7,
    },
  };

  const mockProductList: ProductListResponseDto = {
    data: [mockProduct],
    total: 1,
    page: 1,
    limit: 10,
    totalPages: 1,
  };

  const mockStockAlerts: StockAlertResponseDto = {
    outOfStock: [{ ...mockProduct, stock: 0, stockStatus: StockStatus.RUPTURE }],
    lowStock: [{ ...mockProduct, stock: 50, stockStatus: StockStatus.LOW }],
    totalAlerts: 2,
  };

  const mockProductsService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    updateStock: jest.fn(),
    setStock: jest.fn(),
    remove: jest.fn(),
    searchProducts: jest.fn(),
    getCategories: jest.fn(),
    getStockAlerts: jest.fn(),
    getProductsByPriceRange: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProductsController],
      providers: [
        {
          provide: ProductsService,
          useValue: mockProductsService,
        },
      ],
    }).compile();

    controller = module.get<ProductsController>(ProductsController);
    service = module.get<ProductsService>(ProductsService);

    // Reset mocks
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should create a new product', async () => {
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

      mockProductsService.create.mockResolvedValue(mockProduct);

      const result = await controller.create(createDto);

      expect(service.create).toHaveBeenCalledWith(createDto);
      expect(result).toEqual(mockProduct);
    });
  });

  describe('findAll', () => {
    it('should return paginated products with default options', async () => {
      mockProductsService.findAll.mockResolvedValue(mockProductList);

      const result = await controller.findAll();

      expect(service.findAll).toHaveBeenCalledWith({
        page: 1,
        limit: 10,
        search: undefined,
        category: undefined,
        priceMin: undefined,
        priceMax: undefined,
        stockStatus: undefined,
        isActive: undefined,
      });
      expect(result).toEqual(mockProductList);
    });

    it('should apply filters correctly', async () => {
      mockProductsService.findAll.mockResolvedValue(mockProductList);

      await controller.findAll(2, 5, 'arabica', 'Café', 10, 50, StockStatus.LOW, true);

      expect(service.findAll).toHaveBeenCalledWith({
        page: 2,
        limit: 5,
        search: 'arabica',
        category: 'Café',
        priceMin: 10,
        priceMax: 50,
        stockStatus: StockStatus.LOW,
        isActive: true,
      });
    });

    it('should handle invalid pagination values', async () => {
      mockProductsService.findAll.mockResolvedValue(mockProductList);

      await controller.findAll(-1, 150); // Invalid page and limit

      expect(service.findAll).toHaveBeenCalledWith({
        page: 1, // Should default to 1
        limit: 10, // Should default to 10 (limit capped at 100)
        search: undefined,
        category: undefined,
        priceMin: undefined,
        priceMax: undefined,
        stockStatus: undefined,
        isActive: undefined,
      });
    });
  });

  describe('search', () => {
    it('should search products by query', async () => {
      const searchResults = [mockProduct];
      mockProductsService.searchProducts.mockResolvedValue(searchResults);

      const result = await controller.search('arabica');

      expect(service.searchProducts).toHaveBeenCalledWith('arabica');
      expect(result).toEqual(searchResults);
    });
  });

  describe('getCategories', () => {
    it('should return categories list', async () => {
      const categories = ['Café en grains', 'Café moulu', 'Thé'];
      mockProductsService.getCategories.mockResolvedValue(categories);

      const result = await controller.getCategories();

      expect(service.getCategories).toHaveBeenCalled();
      expect(result).toEqual(categories);
    });
  });

  describe('getStockAlerts', () => {
    it('should return stock alerts', async () => {
      mockProductsService.getStockAlerts.mockResolvedValue(mockStockAlerts);

      const result = await controller.getStockAlerts();

      expect(service.getStockAlerts).toHaveBeenCalled();
      expect(result).toEqual(mockStockAlerts);
    });
  });

  describe('getByPriceRange', () => {
    it('should return products by price range', async () => {
      const products = [mockProduct];
      mockProductsService.getProductsByPriceRange.mockResolvedValue(products);

      const result = await controller.getByPriceRange(10, 30);

      expect(service.getProductsByPriceRange).toHaveBeenCalledWith(10, 30);
      expect(result).toEqual(products);
    });
  });

  describe('findOne', () => {
    it('should return a product by id', async () => {
      const id = 'test-uuid-1';
      mockProductsService.findOne.mockResolvedValue(mockProduct);

      const result = await controller.findOne(id);

      expect(service.findOne).toHaveBeenCalledWith(id);
      expect(result).toEqual(mockProduct);
    });
  });

  describe('update', () => {
    it('should update a product', async () => {
      const id = 'test-uuid-1';
      const updateDto: UpdateProductDto = {
        name: 'Café Mis à Jour',
        details: { price: 29.99 },
      };
      const updatedProduct = { ...mockProduct, name: updateDto.name };

      mockProductsService.update.mockResolvedValue(updatedProduct);

      const result = await controller.update(id, updateDto);

      expect(service.update).toHaveBeenCalledWith(id, updateDto);
      expect(result).toEqual(updatedProduct);
    });
  });

  describe('updateStock', () => {
    it('should update stock by quantity', async () => {
      const id = 'test-uuid-1';
      const updateStockDto: UpdateStockDto = { quantity: 50 };
      const updatedProduct = { ...mockProduct, stock: 150 };

      mockProductsService.updateStock.mockResolvedValue(updatedProduct);

      const result = await controller.updateStock(id, updateStockDto);

      expect(service.updateStock).toHaveBeenCalledWith(id, updateStockDto);
      expect(result).toEqual(updatedProduct);
    });
  });

  describe('setStock', () => {
    it('should set exact stock amount', async () => {
      const id = 'test-uuid-1';
      const setStockDto: SetStockDto = { stock: 200 };
      const updatedProduct = { ...mockProduct, stock: 200 };

      mockProductsService.setStock.mockResolvedValue(updatedProduct);

      const result = await controller.setStock(id, setStockDto);

      expect(service.setStock).toHaveBeenCalledWith(id, setStockDto);
      expect(result).toEqual(updatedProduct);
    });
  });

  describe('remove', () => {
    it('should remove (deactivate) a product', async () => {
      const id = 'test-uuid-1';
      mockProductsService.remove.mockResolvedValue(undefined);

      await controller.remove(id);

      expect(service.remove).toHaveBeenCalledWith(id);
    });
  });
});
