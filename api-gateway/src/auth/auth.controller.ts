import { Controller, Post, Body, Get, UseGuards, Request, UsePipes } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody, ApiBearerAuth, ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MinLength, IsNotEmpty, Matches } from 'class-validator';
import { AuthService } from './auth.service';
import { ThrottlerGuard } from '@nestjs/throttler';
import { JwtAuthGuard, Roles, Permissions } from './jwt.guard';
import { OWASPValidationPipe } from '../security/owasp-validation.pipe';

// DTOs pour la validation renforcée OWASP
class LoginDto {
  @ApiProperty({ 
    example: 'admin@payetonkawa.fr',
    description: 'Adresse email de l\'utilisateur'
  })
  @IsEmail({}, { message: 'Format d\'email invalide' })
  @IsNotEmpty({ message: 'L\'email est obligatoire' })
  @Matches(/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/, {
    message: 'Format d\'email non autorisé'
  })
  email: string;

  @ApiProperty({ 
    example: 'admin123',
    description: 'Mot de passe de l\'utilisateur (min 8 caractères, doit contenir majuscule, minuscule, chiffre)',
    minLength: 8
  })
  @IsString({ message: 'Le mot de passe doit être une chaîne de caractères' })
  @IsNotEmpty({ message: 'Le mot de passe est obligatoire' })
  @MinLength(8, { message: 'Le mot de passe doit contenir au moins 8 caractères' })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/, {
    message: 'Le mot de passe doit contenir au moins une majuscule, une minuscule, un chiffre et un caractère spécial'
  })
  password: string;
}

class TokenValidationDto {
  @ApiProperty({ 
    description: 'Token JWT à valider'
  })
  @IsString()
  token: string;
}

@ApiTags('🔐 Authentication')
@Controller('api/auth')
@UseGuards(ThrottlerGuard)
@UsePipes(new OWASPValidationPipe())
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @ApiOperation({
    summary: 'Connexion utilisateur sécurisée',
    description: 'Authentifie un utilisateur avec validation OWASP et retourne un token JWT sécurisé'
  })
  @ApiBody({
    type: LoginDto,
    description: 'Credentials de connexion',
    examples: {
      admin: {
        summary: 'Administrateur',
        value: {
          email: 'admin@payetonkawa.fr',
          password: 'admin123'
        }
      },
      user: {
        summary: 'Utilisateur standard',
        value: {
          email: 'user@payetonkawa.fr',
          password: 'user123'
        }
      }
    }
  })
  @ApiResponse({
    status: 200,
    description: 'Connexion réussie',
    schema: {
      type: 'object',
      properties: {
        access_token: { type: 'string' },
        token_type: { type: 'string', example: 'Bearer' },
        expires_in: { type: 'number', example: 86400 },
        user: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            email: { type: 'string' },
            role: { type: 'string' }
          }
        }
      }
    }
  })
  @ApiResponse({
    status: 401,
    description: 'Credentials invalides'
  })
  @ApiResponse({
    status: 429,
    description: 'Trop de tentatives de connexion'
  })
  async login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @Post('validate')
  @ApiOperation({
    summary: 'Validation de token',
    description: 'Valide un token JWT et retourne les informations utilisateur'
  })
  @ApiBody({
    type: TokenValidationDto,
    description: 'Token JWT à valider'
  })
  @ApiResponse({
    status: 200,
    description: 'Token valide',
    schema: {
      type: 'object',
      properties: {
        valid: { type: 'boolean' },
        user: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            email: { type: 'string' },
            role: { type: 'string' },
            iat: { type: 'number' },
            exp: { type: 'number' }
          }
        }
      }
    }
  })
  @ApiResponse({
    status: 401,
    description: 'Token invalide ou expiré'
  })
  async validateToken(@Body() tokenDto: TokenValidationDto) {
    return this.authService.validateToken(tokenDto.token);
  }

  @Get('profile')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Profil utilisateur authentifié',
    description: 'Retourne le profil de l\'utilisateur connecté avec validation JWT complète'
  })
  @ApiResponse({
    status: 200,
    description: 'Profil utilisateur',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        email: { type: 'string' },
        role: { type: 'string' },
        permissions: {
          type: 'array',
          items: { type: 'string' }
        },
        tokenInfo: {
          type: 'object',
          properties: {
            issuedAt: { type: 'string' },
            expiresAt: { type: 'string' },
            issuer: { type: 'string' }
          }
        }
      }
    }
  })
  @ApiResponse({
    status: 401,
    description: 'Token manquant ou invalide'
  })
  async getProfile(@Request() req: any) {
    const user = req.user; // Extrait par le JwtAuthGuard
    
    return {
      id: user.sub,
      email: user.email,
      role: user.role,
      permissions: user.permissions,
      tokenInfo: {
        issuedAt: new Date(user.iat * 1000).toISOString(),
        expiresAt: new Date(user.exp * 1000).toISOString(),
        issuer: user.iss,
        audience: user.aud
      },
      securityLevel: 'AUTHENTICATED',
      lastAccess: new Date().toISOString()
    };
  }

  @Post('refresh')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Refresh token sécurisé',
    description: 'Génère un nouveau token JWT avec validation complète'
  })
  @ApiResponse({
    status: 200,
    description: 'Nouveau token généré',
    schema: {
      type: 'object',
      properties: {
        access_token: { type: 'string' },
        token_type: { type: 'string', example: 'Bearer' },
        expires_in: { type: 'number', example: 86400 },
        refreshed_at: { type: 'string' },
        user: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            email: { type: 'string' },
            role: { type: 'string' }
          }
        }
      }
    }
  })
  @ApiResponse({
    status: 401,
    description: 'Token manquant ou invalide'
  })
  async refresh(@Request() req: any) {
    const user = req.user;
    
    // Générer un nouveau token avec les informations actuelles
    const newToken = await this.authService.refreshToken(user);
    
    return {
      ...newToken,
      refreshed_at: new Date().toISOString(),
      security_note: 'Token rafraîchi avec validation OWASP'
    };
  }

  @Get('security-stats')
  @UseGuards(JwtAuthGuard)
  @Roles('admin')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Statistiques de sécurité',
    description: 'Retourne les statistiques de sécurité (admin uniquement)'
  })
  @ApiResponse({
    status: 200,
    description: 'Statistiques de sécurité',
    schema: {
      type: 'object',
      properties: {
        blockedIPs: { type: 'array', items: { type: 'string' } },
        suspiciousIPs: { type: 'array', items: { type: 'string' } },
        totalRequests: { type: 'number' },
        blockedRequests: { type: 'number' },
        threatsSummary: { type: 'object' }
      }
    }
  })
  async getSecurityStats(@Request() req: any) {
    // En production, récupérer depuis le SecurityMiddleware
    return {
      user: req.user.email,
      timestamp: new Date().toISOString(),
      securityStats: {
        blockedIPs: [],
        suspiciousIPs: [],
        totalRequests: 0,
        blockedRequests: 0,
        threatsSummary: {
          sqlInjection: 0,
          xss: 0,
          pathTraversal: 0,
          bruteForce: 0
        }
      },
      note: 'Statistiques temps réel - Intégration avec SecurityMiddleware'
    };
  }
} 