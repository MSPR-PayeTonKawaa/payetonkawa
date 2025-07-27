import { Test, TestingModule } from '@nestjs/testing';
import { Request, Response, NextFunction } from 'express';
import { SecurityMiddleware } from './security.middleware';
import { MetricsService } from '../monitoring/metrics.service';

describe('SecurityMiddleware', () => {
  let middleware: SecurityMiddleware;
  let metricsService: jest.Mocked<MetricsService>;
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let nextFunction: NextFunction;

  beforeEach(async () => {
    const mockMetricsService = {
      incrementCounter: jest.fn(),
      recordGauge: jest.fn(),
      recordHistogram: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SecurityMiddleware,
        {
          provide: MetricsService,
          useValue: mockMetricsService,
        },
      ],
    }).compile();

    middleware = module.get<SecurityMiddleware>(SecurityMiddleware);
    metricsService = module.get(MetricsService);

    mockRequest = {
      method: 'GET',
      url: '/test',
      headers: {
        'user-agent': 'Test Agent',
        'x-forwarded-for': '192.168.1.1',
      },
      get: jest.fn((header: string) => {
        if (header === 'User-Agent') return 'Test Agent';
        if (header === 'X-Forwarded-For') return '192.168.1.1';
        return undefined;
      }) as any,
      connection: {
        remoteAddress: '192.168.1.1',
      } as any,
    };

    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      setHeader: jest.fn().mockReturnThis(),
    };

    nextFunction = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(middleware).toBeDefined();
  });

  it('should allow normal requests', () => {
    middleware.use(mockRequest as Request, mockResponse as Response, nextFunction);
    expect(nextFunction).toHaveBeenCalled();
  });

  it('should work without MetricsService', () => {
    const middlewareWithoutMetrics = new SecurityMiddleware();
    expect(middlewareWithoutMetrics).toBeDefined();
    
    middlewareWithoutMetrics.use(mockRequest as Request, mockResponse as Response, nextFunction);
    expect(nextFunction).toHaveBeenCalled();
  });

  it('should detect SQL injection attempts', () => {
    mockRequest.url = '/test?query=SELECT * FROM users';
    
    middleware.use(mockRequest as Request, mockResponse as Response, nextFunction);
    
    expect(mockResponse.status).toHaveBeenCalledWith(403);
    expect(mockResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: 'Requête bloquée par le système de sécurité',
        code: 'THREAT_DETECTED',
      })
    );
  });

  it('should detect XSS attempts', () => {
    mockRequest.url = '/test?script=<script>alert("xss")</script>';
    
    middleware.use(mockRequest as Request, mockResponse as Response, nextFunction);
    
    expect(mockResponse.status).toHaveBeenCalledWith(403);
    expect(mockResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: 'Requête bloquée par le système de sécurité',
        code: 'THREAT_DETECTED',
      })
    );
  });

  it('should detect path traversal attempts', () => {
    mockRequest.url = '/test/../../../etc/passwd';
    
    middleware.use(mockRequest as Request, mockResponse as Response, nextFunction);
    
    expect(mockResponse.status).toHaveBeenCalledWith(403);
    expect(mockResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: 'Requête bloquée par le système de sécurité',
        code: 'THREAT_DETECTED',
      })
    );
  });

  it('should handle rate limiting', () => {
    // Simuler de nombreuses requêtes de la même IP
    for (let i = 0; i < 150; i++) {
      middleware.use(mockRequest as Request, mockResponse as Response, nextFunction);
    }
    
    // La dernière requête devrait être bloquée
    expect(mockResponse.status).toHaveBeenCalledWith(429);
    expect(mockResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: 'Trop de requêtes',
        code: 'RATE_LIMIT_EXCEEDED',
      })
    );
  });

  it('should extract client IP correctly', () => {
    const middleware = new SecurityMiddleware();
    
    // Test avec X-Forwarded-For
    const req1 = {
      get: jest.fn((header) => header === 'X-Forwarded-For' ? '192.168.1.100' : undefined),
      connection: { remoteAddress: '127.0.0.1' },
    } as any;
    
    const ip1 = (middleware as any).getClientIP(req1);
    expect(ip1).toBe('192.168.1.100');

    // Test avec X-Real-IP
    const req2 = {
      get: jest.fn((header) => header === 'X-Real-IP' ? '192.168.1.200' : undefined),
      connection: { remoteAddress: '127.0.0.1' },
    } as any;
    
    const ip2 = (middleware as any).getClientIP(req2);
    expect(ip2).toBe('192.168.1.200');

    // Test avec connection.remoteAddress
    const req3 = {
      get: jest.fn(() => undefined),
      connection: { remoteAddress: '192.168.1.300' },
    } as any;
    
    const ip3 = (middleware as any).getClientIP(req3);
    expect(ip3).toBe('192.168.1.300');
  });

  it('should validate request size', () => {
    mockRequest.headers = {
      'content-length': '1000000000', // 1GB - trop large
    };
    
    middleware.use(mockRequest as Request, mockResponse as Response, nextFunction);
    
    expect(mockResponse.status).toHaveBeenCalledWith(413);
    expect(mockResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: 'Requête trop volumineuse',
        code: 'PAYLOAD_TOO_LARGE',
      })
    );
  });

  it('should validate headers', () => {
    mockRequest.headers = {
      'x-custom': 'a'.repeat(10000), // Header trop long
    };
    
    middleware.use(mockRequest as Request, mockResponse as Response, nextFunction);
    
    expect(mockResponse.status).toHaveBeenCalledWith(400);
    expect(mockResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: 'En-têtes non valides',
        code: 'INVALID_HEADERS',
      })
    );
  });

  it('should add security headers', () => {
    middleware.use(mockRequest as Request, mockResponse as Response, nextFunction);
    
    expect(mockResponse.setHeader).toHaveBeenCalledWith('X-Security-Scan', 'passed');
    expect(mockResponse.setHeader).toHaveBeenCalledWith('X-Request-ID', expect.any(String));
  });
});
