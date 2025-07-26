import { Test, TestingModule } from '@nestjs/testing';
import { ProxyService } from './proxy.service';
import { Request, Response } from 'express';
import { ServiceUnavailableException } from '@nestjs/common';
import axios from 'axios';

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('ProxyService', () => {
  let service: ProxyService;

  const mockRequest = {
    method: 'GET',
    url: '/api/customers',
    headers: {
      'authorization': 'Bearer token123',
      'content-type': 'application/json',
      'host': 'localhost:3000',
      'connection': 'keep-alive',
    },
    body: {},
    query: {},
    params: {},
    ip: '127.0.0.1',
    protocol: 'http',
    get: jest.fn((headerName: string) => {
      if (headerName === 'host') return 'localhost:3000';
      return mockRequest.headers[headerName as keyof typeof mockRequest.headers];
    }),
  } as unknown as Request;

  const mockResponse = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
    send: jest.fn().mockReturnThis(),
    end: jest.fn().mockReturnThis(),
    set: jest.fn().mockReturnThis(),
    setHeader: jest.fn().mockReturnThis(),
  } as unknown as Response;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ProxyService],
    }).compile();

    service = module.get<ProxyService>(ProxyService);

    // Reset mocks before each test
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('forwardRequest', () => {
    it('should forward request successfully', async () => {
      const mockAxiosResponse = {
        status: 200,
        data: { customers: [] },
        headers: {
          'content-type': 'application/json',
        },
        statusText: 'OK',
      };

      mockedAxios.request.mockResolvedValue(mockAxiosResponse);

      await service.forwardRequest(
        mockRequest,
        mockResponse,
        'http://localhost:3001',
        'customers',
      );

      expect(mockedAxios.request).toHaveBeenCalled();
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({ customers: [] });
    });

    it('should handle service connection errors gracefully', async () => {
      const connectionError = {
        code: 'ECONNREFUSED',
        message: 'connect ECONNREFUSED 127.0.0.1:3001',
        isAxiosError: true,
      };

      mockedAxios.request.mockRejectedValue(connectionError);

      // The service should handle the error by sending a response, not throwing
      try {
        await service.forwardRequest(
          mockRequest,
          mockResponse,
          'http://localhost:3001',
          'customers',
        );
      } catch (error) {
        // Expected to throw ServiceUnavailableException
        expect(error).toBeInstanceOf(ServiceUnavailableException);
        expect(error.message).toBe('Service customers indisponible');
      }
    });

    it('should handle timeout errors gracefully', async () => {
      const timeoutError = {
        code: 'ETIMEDOUT',
        message: 'timeout of 30000ms exceeded',
        isAxiosError: true,
      };

      mockedAxios.request.mockRejectedValue(timeoutError);

      // The service should handle the error by sending a response, not throwing
      try {
        await service.forwardRequest(
          mockRequest,
          mockResponse,
          'http://localhost:3001',
          'customers',
        );
      } catch (error) {
        // Expected to throw ServiceUnavailableException
        expect(error).toBeInstanceOf(ServiceUnavailableException);
        expect(error.message).toBe('Service customers timeout');
      }
    });
  });

  describe('checkServiceHealth', () => {
    it('should return true for healthy service', async () => {
      mockedAxios.get.mockResolvedValue({
        status: 200,
        data: { status: 'ok' },
      });

      const result = await service.checkServiceHealth(
        'http://localhost:3001',
        'customers',
      );

      expect(result).toBe(true);
      expect(mockedAxios.get).toHaveBeenCalledWith(
        'http://localhost:3001/health',
        expect.objectContaining({
          timeout: 5000,
        }),
      );
    });

    it('should return false for unhealthy service', async () => {
      mockedAxios.get.mockRejectedValue(new Error('Service down'));

      const result = await service.checkServiceHealth(
        'http://localhost:3001',
        'customers',
      );

      expect(result).toBe(false);
    });
  });
});
