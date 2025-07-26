import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  let service: AuthService;
  let jwtService: JwtService;

  const mockJwtService = {
    sign: jest.fn(),
    verify: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    jwtService = module.get<JwtService>(JwtService);

    // Reset mocks before each test
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('login', () => {
    it('should successfully login with valid admin credentials', async () => {
      const loginDto = {
        email: 'admin@payetonkawa.fr',
        password: 'admin123',
      };

      const mockToken = 'mock.jwt.token';
      mockJwtService.sign.mockReturnValue(mockToken);

      const result = await service.login(loginDto);

      expect(result).toEqual({
        access_token: mockToken,
        token_type: 'Bearer',
        expires_in: 86400,
        user: {
          id: '1',
          email: 'admin@payetonkawa.fr',
          role: 'admin',
          permissions: ['read:all', 'write:all', 'delete:all'],
        },
      });

      expect(mockJwtService.sign).toHaveBeenCalledWith({
        sub: '1',
        email: 'admin@payetonkawa.fr',
        role: 'admin',
        permissions: ['read:all', 'write:all', 'delete:all'],
      });
    });

    it('should successfully login with valid manager credentials', async () => {
      const loginDto = {
        email: 'manager@payetonkawa.fr',
        password: 'manager123',
      };

      const mockToken = 'mock.manager.token';
      mockJwtService.sign.mockReturnValue(mockToken);

      const result = await service.login(loginDto);

      expect(result).toEqual({
        access_token: mockToken,
        token_type: 'Bearer',
        expires_in: 86400,
        user: {
          id: '2',
          email: 'manager@payetonkawa.fr',
          role: 'manager',
          permissions: ['read:all', 'write:orders', 'write:products'],
        },
      });
    });

    it('should successfully login with valid user credentials', async () => {
      const loginDto = {
        email: 'user@payetonkawa.fr',
        password: 'user123',
      };

      const mockToken = 'mock.user.token';
      mockJwtService.sign.mockReturnValue(mockToken);

      const result = await service.login(loginDto);

      expect(result).toEqual({
        access_token: mockToken,
        token_type: 'Bearer',
        expires_in: 86400,
        user: {
          id: '3',
          email: 'user@payetonkawa.fr',
          role: 'user',
          permissions: ['read:products', 'write:orders'],
        },
      });
    });

    it('should throw UnauthorizedException for non-existent user', async () => {
      const loginDto = {
        email: 'nonexistent@example.com',
        password: 'password123',
      };

      await expect(service.login(loginDto)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException for invalid password', async () => {
      const loginDto = {
        email: 'admin@payetonkawa.fr',
        password: 'wrongpassword',
      };

      await expect(service.login(loginDto)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException for empty password', async () => {
      const loginDto = {
        email: 'admin@payetonkawa.fr',
        password: '',
      };

      await expect(service.login(loginDto)).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('validateToken', () => {
    it('should successfully validate a valid token', async () => {
      const mockToken = 'valid.jwt.token';
      const mockDecoded = {
        sub: '1',
        email: 'admin@payetonkawa.fr',
        role: 'admin',
        permissions: ['read:all', 'write:all', 'delete:all'],
        iat: 1640995200,
        exp: 1641081600,
      };

      mockJwtService.verify.mockReturnValue(mockDecoded);

      const result = await service.validateToken(mockToken);

      expect(result).toEqual({
        valid: true,
        user: {
          id: '1',
          email: 'admin@payetonkawa.fr',
          role: 'admin',
          permissions: ['read:all', 'write:all', 'delete:all'],
          iat: 1640995200,
          exp: 1641081600,
        },
      });

      expect(mockJwtService.verify).toHaveBeenCalledWith(mockToken);
    });

    it('should throw UnauthorizedException for invalid token', async () => {
      const mockToken = 'invalid.jwt.token';
      mockJwtService.verify.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      await expect(service.validateToken(mockToken)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException for token with non-existent user', async () => {
      const mockToken = 'valid.jwt.token';
      const mockDecoded = {
        sub: '999', // Non-existent user ID
        email: 'deleted@example.com',
        role: 'user',
        permissions: [],
        iat: 1640995200,
        exp: 1641081600,
      };

      mockJwtService.verify.mockReturnValue(mockDecoded);

      await expect(service.validateToken(mockToken)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException for expired token', async () => {
      const mockToken = 'expired.jwt.token';
      mockJwtService.verify.mockImplementation(() => {
        throw new Error('Token expired');
      });

      await expect(service.validateToken(mockToken)).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('error handling', () => {
    it('should handle case-insensitive email lookup', async () => {
      const loginDto = {
        email: 'ADMIN@PAYETONKAWA.FR',
        password: 'admin123',
      };

      // Ce test vérifie si le service gère la casse des emails
      await expect(service.login(loginDto)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should handle null/undefined credentials', async () => {
      const loginDto = {
        email: null as any,
        password: null as any,
      };

      await expect(service.login(loginDto)).rejects.toThrow();
    });
  });

  describe('security features', () => {
    it('should include proper token payload structure', async () => {
      const loginDto = {
        email: 'admin@payetonkawa.fr',
        password: 'admin123',
      };

      mockJwtService.sign.mockReturnValue('test.token');

      await service.login(loginDto);

      expect(mockJwtService.sign).toHaveBeenCalledWith({
        sub: expect.any(String),
        email: expect.any(String),
        role: expect.any(String),
        permissions: expect.any(Array),
      });
    });

    it('should not expose sensitive user data in response', async () => {
      const loginDto = {
        email: 'admin@payetonkawa.fr',
        password: 'admin123',
      };

      mockJwtService.sign.mockReturnValue('test.token');

      const result = await service.login(loginDto);

      // Vérifier que le mot de passe n'est pas exposé
      expect(result.user).not.toHaveProperty('password');
      expect(result).toHaveProperty('access_token');
      expect(result).toHaveProperty('token_type', 'Bearer');
      expect(result).toHaveProperty('expires_in', 86400);
    });
  });
});
