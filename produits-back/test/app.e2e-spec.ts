import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { App } from 'supertest/types';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { AppModule } from './../src/app.module';
import { Product, ProductDetails, StockStatus } from '../src/entities';
import { CreateProductDto } from '../src/dto';

describe('Products API (e2e)', () => {
  let app: INestApplication<App>;

  // Mock repositories pour éviter la connexion à la vraie DB
  const mockProductRepository = {
    find: jest.fn(),
    findOne: jest.fn(),
    save: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    createQueryBuilder: jest.fn(),
  };

  const mockProductDetailsRepository = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
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

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
    .overrideProvider(getRepositoryToken(Product))
    .useValue(mockProductRepository)
    .overrideProvider(getRepositoryToken(ProductDetails))
    .useValue(mockProductDetailsRepository)
    .overrideProvider('ProductEventPublisher')
    .useValue(mockProductEventPublisher)
    .overrideProvider('StockEventPublisher')
    .useValue(mockStockEventPublisher)
    .compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    // Setup des mocks
    mockProductRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('App Controller', () => {
    it('/ (GET) - should return service info', () => {
      return request(app.getHttpServer())
        .get('/')
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('service', 'PayeTonKawa - API Produits');
          expect(res.body).toHaveProperty('version', '1.0.0');
          expect(res.body).toHaveProperty('status', 'running');
          expect(res.body).toHaveProperty('database');
          expect(res.body).toHaveProperty('endpoints');
        });
    });

    it('/health (GET) - should return health status', () => {
      return request(app.getHttpServer())
        .get('/health')
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('status', 'healthy');
          expect(res.body).toHaveProperty('timestamp');
          expect(res.body).toHaveProperty('uptime');
          expect(res.body).toHaveProperty('memory');
        });
    });
  });

  describe('Products Controller', () => {
    const mockProduct = {
      id: 'test-uuid-1',
      name: 'Café Arabica Test E2E',
      stock: 100,
      stockStatus: StockStatus.AVAILABLE,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      details: {
        id: 'details-uuid-1',
        price: 25.99,
        description: 'Café test e2e',
        color: 'Brun',
        category: 'Café en grains',
        origin: 'Test Origin',
        weight: '250g',
        intensity: 7,
      },
    };

    it('/products (GET) - should return products list', async () => {
      const mockProductList = [mockProduct];
      mockQueryBuilder.getManyAndCount.mockResolvedValue([mockProductList, 1]);

      return request(app.getHttpServer())
        .get('/products')
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('data');
          expect(res.body).toHaveProperty('total');
          expect(res.body).toHaveProperty('page');
          expect(res.body).toHaveProperty('limit');
          expect(res.body).toHaveProperty('totalPages');
        });
    });

    it('/products (GET) - should support pagination', async () => {
      mockQueryBuilder.getManyAndCount.mockResolvedValue([[], 0]);

      return request(app.getHttpServer())
        .get('/products?page=2&limit=5')
        .expect(200)
        .expect((res) => {
          expect(res.body.page).toBe(2);
          expect(res.body.limit).toBe(5);
        });
    });

    it('/products (POST) - should create a new product', async () => {
      const createProductDto: CreateProductDto = {
        name: 'Nouveau Café E2E',
        stock: 100,
        details: {
          price: 29.99,
          description: 'Description E2E',
          color: 'Brun foncé',
          category: 'Café en grains',
          origin: 'Colombia',
          weight: '500g',
          intensity: 8,
        },
      };

      mockProductRepository.findOne.mockResolvedValue(null); // Aucun produit existant
      mockProductDetailsRepository.create.mockReturnValue(mockProduct.details);
      mockProductRepository.create.mockReturnValue(mockProduct);
      mockProductRepository.save.mockResolvedValue(mockProduct);

      return request(app.getHttpServer())
        .post('/products')
        .send(createProductDto)
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty('id');
          expect(res.body).toHaveProperty('name');
          expect(res.body).toHaveProperty('stock');
          expect(res.body).toHaveProperty('details');
        });
    });

    it('/products (POST) - should return 409 when product name exists', async () => {
      const createProductDto: CreateProductDto = {
        name: 'Café Existant',
        stock: 100,
        details: {
          price: 29.99,
          description: 'Description E2E',
          color: 'Brun foncé',
          category: 'Café en grains',
          origin: 'Colombia',
          weight: '500g',
          intensity: 8,
        },
      };

      mockProductRepository.findOne.mockResolvedValue(mockProduct); // Produit existant

      return request(app.getHttpServer())
        .post('/products')
        .send(createProductDto)
        .expect(409);
    });

    it('/products/search (GET) - should search products', async () => {
      const searchResults = [mockProduct];
      mockQueryBuilder.getMany.mockResolvedValue(searchResults);

      return request(app.getHttpServer())
        .get('/products/search?q=arabica')
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
        });
    });

    it('/products/categories (GET) - should return categories', async () => {
      const categories = [
        { details_category: 'Café en grains' },
        { details_category: 'Café moulu' },
      ];
      mockQueryBuilder.getRawMany.mockResolvedValue(categories);

      return request(app.getHttpServer())
        .get('/products/categories')
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
        });
    });

    it('/products/alerts/stock (GET) - should return stock alerts', async () => {
      const outOfStockProducts = [];
      const lowStockProducts = [mockProduct];

      mockQueryBuilder.getMany
        .mockResolvedValueOnce(outOfStockProducts)
        .mockResolvedValueOnce(lowStockProducts);

      return request(app.getHttpServer())
        .get('/products/alerts/stock')
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('outOfStock');
          expect(res.body).toHaveProperty('lowStock');
          expect(res.body).toHaveProperty('totalAlerts');
        });
    });

    it('/products/price-range (GET) - should return products by price range', async () => {
      const products = [mockProduct];
      mockQueryBuilder.getMany.mockResolvedValue(products);

      return request(app.getHttpServer())
        .get('/products/price-range?min=20&max=30')
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
        });
    });
  });
});
