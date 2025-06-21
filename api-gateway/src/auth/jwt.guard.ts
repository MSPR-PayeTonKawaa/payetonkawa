import { 
  Injectable, 
  CanActivate, 
  ExecutionContext, 
  UnauthorizedException,
  Logger,
  ForbiddenException 
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';
import { Reflector } from '@nestjs/core';

// Interface pour les permissions
export interface JwtPayload {
  sub: string;
  email: string;
  role: string;
  permissions: string[];
  iat: number;
  exp: number;
  iss: string;
  aud: string;
}

// Interface pour les metadata de rôles
export const ROLES_KEY = 'roles';
export const PERMISSIONS_KEY = 'permissions';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  private readonly logger = new Logger(JwtAuthGuard.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    
    try {
      // 1. Extraction du token
      const token = this.extractTokenFromHeader(request);
      if (!token) {
        this.logger.warn(`Token manquant dans la requête ${request.method} ${request.url}`);
        throw new UnauthorizedException('Token d\'authentification requis');
      }

      // 2. Validation du token JWT
      const payload = await this.validateToken(token);
      
      // 3. Vérification de l'expiration
      this.checkTokenExpiration(payload);
      
      // 4. Vérification des claims obligatoires
      this.validateRequiredClaims(payload);
      
      // 5. Ajout des informations utilisateur à la requête
      request['user'] = payload;
      
      // 6. Vérification des rôles/permissions si requis
      await this.checkRolesAndPermissions(context, payload);
      
      this.logger.debug(`Authentification réussie pour ${payload.email}`);
      return true;

    } catch (error) {
      this.logger.warn(`Échec authentification: ${error.message}`);
      
      if (error instanceof UnauthorizedException || error instanceof ForbiddenException) {
        throw error;
      }
      
      throw new UnauthorizedException('Token invalide');
    }
  }

  private extractTokenFromHeader(request: Request): string | null {
    const authHeader = request.headers.authorization;
    
    if (!authHeader) {
      return null;
    }

    // Support Bearer token uniquement
    const [type, token] = authHeader.split(' ');
    
    if (type !== 'Bearer' || !token) {
      this.logger.warn(`Format d'authentification invalide: ${type}`);
      return null;
    }

    return token;
  }

  private async validateToken(token: string): Promise<JwtPayload> {
    try {
      const payload = this.jwtService.verify<JwtPayload>(token, {
        issuer: 'payetonkawa-api-gateway',
        audience: 'payetonkawa-services',
      });

      return payload;
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        throw new UnauthorizedException('Token expiré');
      } else if (error.name === 'JsonWebTokenError') {
        throw new UnauthorizedException('Token malformé');
      } else if (error.name === 'NotBeforeError') {
        throw new UnauthorizedException('Token pas encore valide');
      }
      
      throw new UnauthorizedException('Token invalide');
    }
  }

  private checkTokenExpiration(payload: JwtPayload): void {
    const now = Math.floor(Date.now() / 1000);
    
    if (payload.exp && payload.exp < now) {
      throw new UnauthorizedException('Token expiré');
    }

    // Alerte si le token expire dans moins de 5 minutes
    if (payload.exp && (payload.exp - now) < 300) {
      this.logger.warn(`Token expire bientôt pour ${payload.email}`);
    }
  }

  private validateRequiredClaims(payload: JwtPayload): void {
    const requiredFields = ['sub', 'email', 'role', 'permissions'];
    
    for (const field of requiredFields) {
      if (!payload[field]) {
        throw new UnauthorizedException(`Claim obligatoire manquant: ${field}`);
      }
    }

    // Validation de l'email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(payload.email)) {
      throw new UnauthorizedException('Email invalide dans le token');
    }

    // Validation du rôle
    const validRoles = ['admin', 'manager', 'user'];
    if (!validRoles.includes(payload.role)) {
      throw new UnauthorizedException('Rôle invalide dans le token');
    }
  }

  private async checkRolesAndPermissions(
    context: ExecutionContext,
    payload: JwtPayload,
  ): Promise<void> {
    // Vérification des rôles requis
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (requiredRoles && requiredRoles.length > 0) {
      const hasRequiredRole = requiredRoles.some(role => payload.role === role);
      
      if (!hasRequiredRole) {
        this.logger.warn(
          `Accès refusé: rôle ${payload.role} insuffisant. Requis: ${requiredRoles.join(', ')}`
        );
        throw new ForbiddenException(
          `Rôle insuffisant. Rôles requis: ${requiredRoles.join(', ')}`
        );
      }
    }

    // Vérification des permissions requises
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (requiredPermissions && requiredPermissions.length > 0) {
      const hasAllPermissions = requiredPermissions.every(permission =>
        payload.permissions.includes(permission)
      );

      if (!hasAllPermissions) {
        const missingPermissions = requiredPermissions.filter(
          permission => !payload.permissions.includes(permission)
        );

        this.logger.warn(
          `Accès refusé: permissions manquantes pour ${payload.email}: ${missingPermissions.join(', ')}`
        );
        throw new ForbiddenException(
          `Permissions insuffisantes. Permissions requises: ${requiredPermissions.join(', ')}`
        );
      }
    }
  }
}

// Décorateurs pour les rôles et permissions
import { SetMetadata } from '@nestjs/common';

export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);
export const Permissions = (...permissions: string[]) => SetMetadata(PERMISSIONS_KEY, permissions);

// Décorateur pour extraire l'utilisateur de la requête
export const CurrentUser = () => {
  return (target: any, key: string, descriptor: PropertyDescriptor) => {
    return descriptor;
  };
}; 