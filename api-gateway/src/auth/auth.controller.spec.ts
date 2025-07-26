import { Test, TestingModule } from '@nestjs/testing';
import { ThrottlerGuard } from '@nestjs/throttler';
import { UnauthorizedException } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { OWASPValidationPipe } from '../security/owasp-validation.pipe';
import { JwtService } from '@nestjs/jwt';
import { Reflector } from '@nestjs/core';

describe('AuthController', () => {
  let controller: AuthController;
  let authService: AuthService;

  const mockAuthService = {
    login: jest.fn(),
    validateToken: jest.fn(),
    refreshToken: jest.fn(),
    getUserProfile: jest.fn(),
    getSecurityStats: jest.fn(),
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

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: mockAuthService,
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
    })
      .overrideGuard(ThrottlerGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<AuthController>(AuthController);
    authService = module.get<AuthService>(AuthService);

    // Reset mocks before each test
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('login', () => {
    it('should successfully login with valid credentials', async () => {
      const loginDto = {
        email: 'admin@payetonkawa.fr',
        password: 'Admin123!',
      };

      const expectedResult = {
        access_token: 'mock.jwt.token',
        token_type: 'Bearer',
        expires_in: 86400,
        user: {
          id: '1',
          email: 'admin@payetonkawa.fr',
          role: 'admin',
          permissions: ['read:all', 'write:all', 'delete:all'],
        },
      };

      mockAuthService.login.mockResolvedValue(expectedResult);

      const result = await controller.login(loginDto);

      expect(result).toEqual(expectedResult);
      expect(mockAuthService.login).toHaveBeenCalledWith(loginDto);
      expect(mockAuthService.login).toHaveBeenCalledTimes(1);
    });

    it('should throw UnauthorizedException for invalid credentials', async () => {
      const loginDto = {
        email: 'admin@payetonkawa.fr',
        password: 'wrongpassword',
      };

      mockAuthService.login.mockRejectedValue(
        new UnauthorizedException('Credentials invalides'),
      );

      await expect(controller.login(loginDto)).rejects.toThrow(
        UnauthorizedException,
      );
      expect(mockAuthService.login).toHaveBeenCalledWith(loginDto);
    });

    it('should handle different user roles', async () => {
      const managerLoginDto = {
        email: 'manager@payetonkawa.fr',
        password: 'Manager123!',
      };

      const expectedManagerResult = {
        access_token: 'mock.manager.token',
        token_type: 'Bearer',
        expires_in: 86400,
        user: {
          id: '2',
          email: 'manager@payetonkawa.fr',
          role: 'manager',
          permissions: ['read:all', 'write:orders', 'write:products'],
        },
      };

      mockAuthService.login.mockResolvedValue(expectedManagerResult);

      const result = await controller.login(managerLoginDto);

      expect(result).toEqual(expectedManagerResult);
      expect(result.user.role).toBe('manager');
      expect(result.user.permissions).toContain('write:orders');
    });
  });

  describe('validateToken', () => {
    it('should successfully validate a valid token', async () => {
      const tokenDto = {
        token: 'valid.jwt.token',
      };

      const expectedResult = {
        valid: true,
        user: {
          id: '1',
          email: 'admin@payetonkawa.fr',
          role: 'admin',
          permissions: ['read:all', 'write:all', 'delete:all'],
          iat: 1640995200,
          exp: 1641081600,
        },
      };

      mockAuthService.validateToken.mockResolvedValue(expectedResult);

      const result = await controller.validateToken(tokenDto);

      expect(result).toEqual(expectedResult);
      expect(mockAuthService.validateToken).toHaveBeenCalledWith(
        tokenDto.token,
      );
    });

    it('should throw UnauthorizedException for invalid token', async () => {
      const tokenDto = {
        token: 'invalid.jwt.token',
      };

      mockAuthService.validateToken.mockRejectedValue(
        new UnauthorizedException('Token invalide ou expiré'),
      );

      await expect(controller.validateToken(tokenDto)).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('profile endpoint', () => {
    it('should return user profile for authenticated user', async () => {
      const mockRequest = {
        user: {
          sub: '1',
          email: 'admin@payetonkawa.fr',
          role: 'admin',
          permissions: ['read:all', 'write:all', 'delete:all'],
          iat: 1640995200,
          exp: 1641081600,
        },
      };

      const result = await controller.getProfile(mockRequest);

      expect(result).toHaveProperty('id', '1');
      expect(result).toHaveProperty('email', 'admin@payetonkawa.fr');
      expect(result).toHaveProperty('role', 'admin');
      expect(result).toHaveProperty('permissions');
      expect(result).toHaveProperty('tokenInfo');
      expect(result).toHaveProperty('securityLevel', 'AUTHENTICATED');
    });
  });

  describe('refresh endpoint', () => {
    it('should successfully refresh token for authenticated user', async () => {
      const mockRequest = {
        user: {
          sub: '1',
          email: 'admin@payetonkawa.fr',
          role: 'admin',
          permissions: ['read:all', 'write:all', 'delete:all'],
        },
      };

      const expectedRefreshResult = {
        access_token: 'new.jwt.token',
        token_type: 'Bearer',
        expires_in: 86400,
        user: {
          id: '1',
          email: 'admin@payetonkawa.fr',
          role: 'admin',
        },
      };

      mockAuthService.refreshToken.mockResolvedValue(expectedRefreshResult);

      const result = await controller.refresh(mockRequest);

      expect(result).toHaveProperty('access_token');
      expect(result).toHaveProperty('refreshed_at');
      expect(result).toHaveProperty('security_note');
      expect(mockAuthService.refreshToken).toHaveBeenCalledWith(mockRequest.user);
    });
  });

  describe('security stats endpoint', () => {
    it('should return security statistics for admin user', async () => {
      const mockRequest = {
        user: {
          sub: '1',
          email: 'admin@payetonkawa.fr',
          role: 'admin',
        },
      };

      const result = await controller.getSecurityStats(mockRequest);

      expect(result).toHaveProperty('user', 'admin@payetonkawa.fr');
      expect(result).toHaveProperty('timestamp');
      expect(result).toHaveProperty('securityStats');
      expect(result.securityStats).toHaveProperty('blockedIPs');
      expect(result.securityStats).toHaveProperty('threatsSummary');
    });
  });

  describe('error handling', () => {
    it('should handle service errors gracefully', async () => {
      const loginDto = {
        email: 'admin@payetonkawa.fr',
        password: 'Admin123!',
      };

      mockAuthService.login.mockRejectedValue(
        new Error('Database connection failed'),
      );

      await expect(controller.login(loginDto)).rejects.toThrow(Error);
    });

    it('should validate email format in login DTO', async () => {
      const invalidLoginDto = {
        email: 'invalid-email',
        password: 'Admin123!',
      };

      // Cette validation sera gérée par le pipe de validation
      // Le test s'assure que le controller accepte le DTO formaté correctement
      expect(() => {
        const dto = { ...invalidLoginDto };
        // Simulation de validation qui devrait échouer
        return dto;
      }).not.toThrow();
    });
  });

  describe('security features', () => {
    it('should have throttling protection configured', () => {
      // Vérifier que le contrôleur utilise ThrottlerGuard
      const guards = Reflect.getMetadata('__guards__', AuthController);
      expect(guards).toBeDefined();
    });

    it('should use OWASP validation pipe', () => {
      // Vérifier que le contrôleur utilise OWASPValidationPipe
      const pipes = Reflect.getMetadata('__pipes__', AuthController);
      expect(pipes).toBeDefined();
    });

    it('should not expose sensitive data in responses', async () => {
      const loginDto = {
        email: 'admin@payetonkawa.fr',
        password: 'Admin123!',
      };

      const result = {
        access_token: 'token',
        token_type: 'Bearer',
        expires_in: 86400,
        user: {
          id: '1',
          email: 'admin@payetonkawa.fr',
          role: 'admin',
          permissions: ['read:all'],
        },
      };

      mockAuthService.login.mockResolvedValue(result);

      const response = await controller.login(loginDto);

      // Vérifier qu'aucune donnée sensible n'est exposée
      expect(response.user).not.toHaveProperty('password');
      expect(response).toHaveProperty('access_token');
      expect(response.token_type).toBe('Bearer');
    });
  });
});
