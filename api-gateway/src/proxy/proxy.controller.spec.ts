import { Test, TestingModule } from '@nestjs/testing';
import { ProxyController } from './proxy.controller';
import { ProxyService } from './proxy.service';
import { Request, Response } from 'express';
import { HttpStatus } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Reflector } from '@nestjs/core';
import { ThrottlerModule } from '@nestjs/throttler';

describe('ProxyController', () => {
  let controller: ProxyController;
  let proxyService: ProxyService;

  const mockProxyService = {
    forwardRequest: jest.fn(),
  };

  const mockJwtService = {
    sign: jest.fn(),
    verify: jest.fn(),
    decode: jest.fn(),
  };

  const mockReflector = {
    get: jest.fn(),
    getAll: jest.fn(),
    getAllAndMerge: jest.fn(),
    getAllAndOverride: jest.fn(),
  };

  // Mock Express Request and Response
  const mockRequest = {
    method: 'GET',
    url: '/api/customers',
    path: '/api/customers',
    headers: {},
    body: {},
    query: {},
    params: {},
  } as unknown as Request;

  const mockResponse = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
    send: jest.fn().mockReturnThis(),
    end: jest.fn().mockReturnThis(),
  } as unknown as Response;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        ThrottlerModule.forRoot([{
          ttl: 60000,
          limit: 10,
        }]),
      ],
      controllers: [ProxyController],
      providers: [
        {
          provide: ProxyService,
          useValue: mockProxyService,
        },
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
        {
          provide: Reflector,
          useValue: mockReflector,
        },
      ],
    }).compile();

    controller = module.get<ProxyController>(ProxyController);
    proxyService = module.get<ProxyService>(ProxyService);

    // Reset mocks before each test
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('proxyToClients', () => {
    it('should forward request to clients service', async () => {
      const expectedTargetUrl = process.env.CLIENTS_API_URL || 'http://localhost:3001';
      mockProxyService.forwardRequest.mockResolvedValue(undefined);

      await controller.proxyToClients(mockRequest, mockResponse);

      expect(mockProxyService.forwardRequest).toHaveBeenCalledWith(
        mockRequest,
        mockResponse,
        expectedTargetUrl,
        'customers',
      );
    });
  });

  describe('proxyToProducts', () => {
    it('should forward request to products service', async () => {
      const expectedTargetUrl = process.env.PRODUITS_API_URL || 'http://localhost:3002';
      const productsRequest = {
        ...mockRequest,
        url: '/api/products',
        path: '/api/products',
      } as unknown as Request;

      mockProxyService.forwardRequest.mockResolvedValue(undefined);

      await controller.proxyToProducts(productsRequest, mockResponse);

      expect(mockProxyService.forwardRequest).toHaveBeenCalledWith(
        productsRequest,
        mockResponse,
        expectedTargetUrl,
        'products',
      );
    });
  });

  describe('proxyToOrders', () => {
    it('should forward request to orders service', async () => {
      const expectedTargetUrl = process.env.COMMANDES_API_URL || 'http://localhost:3003';
      const ordersRequest = {
        ...mockRequest,
        url: '/api/orders',
        path: '/api/orders',
      } as unknown as Request;

      mockProxyService.forwardRequest.mockResolvedValue(undefined);

      await controller.proxyToOrders(ordersRequest, mockResponse);

      expect(mockProxyService.forwardRequest).toHaveBeenCalledWith(
        ordersRequest,
        mockResponse,
        expectedTargetUrl,
        'orders',
      );
    });
  });

  describe('catchAll', () => {
    it('should return 404 for unknown routes', async () => {
      const unknownRequest = {
        method: 'GET',
        url: '/api/unknown/route',
        path: '/api/unknown/route',
      } as unknown as Request;

      await controller.catchAll(unknownRequest, mockResponse);

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.NOT_FOUND);
      expect(mockResponse.json).toHaveBeenCalledWith({
        statusCode: 404,
        message: 'Route non trouvée',
        error: 'Not Found',
        path: '/api/unknown/route',
        timestamp: expect.any(String),
        suggestion: 'Consultez la documentation API : /api-docs',
        availableRoutes: [
          '/api/customers - Service Clients',
          '/api/products - Service Produits',
          '/api/orders - Service Commandes',
          '/api/auth - Authentification',
          '/api/health - Health checks',
        ],
      });
    });

    it('should log warning for unknown routes', async () => {
      const loggerSpy = jest.spyOn(controller['logger'], 'warn');
      const unknownRequest = {
        method: 'POST',
        url: '/api/invalid/path',
        path: '/api/invalid/path',
      } as unknown as Request;

      await controller.catchAll(unknownRequest, mockResponse);

      expect(loggerSpy).toHaveBeenCalledWith(
        'Route non trouvée: POST /api/invalid/path',
      );
    });
  });
});
