import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';

// Interface pour les utilisateurs (mock)
interface User {
  id: string;
  email: string;
  password: string;
  role: string;
  permissions: string[];
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  // Base d'utilisateurs mockée (en production, viendraient d'une base de données)
  private readonly users: User[] = [
    {
      id: '1',
      email: 'admin@payetonkawa.fr',
      password: '$2b$10$8Q7K4ZQfRoaP0yQ3K4ZQfOqKH8Q7K4ZQfRoaP0yQ3K4ZQfOqKH8', // admin123
      role: 'admin',
      permissions: ['read:all', 'write:all', 'delete:all']
    },
    {
      id: '2',
      email: 'manager@payetonkawa.fr',
      password: '$2b$10$8Q7K4ZQfRoaP0yQ3K4ZQfOqKH8Q7K4ZQfRoaP0yQ3K4ZQfOqKH8', // manager123
      role: 'manager',
      permissions: ['read:all', 'write:orders', 'write:products']
    },
    {
      id: '3',
      email: 'user@payetonkawa.fr',
      password: '$2b$10$8Q7K4ZQfRoaP0yQ3K4ZQfOqKH8Q7K4ZQfRoaP0yQ3K4ZQfOqKH8', // user123
      role: 'user',
      permissions: ['read:products', 'write:orders']
    }
  ];

  constructor(private readonly jwtService: JwtService) {}

  async login(loginDto: { email: string; password: string }) {
    const { email, password } = loginDto;

    this.logger.log(`Tentative de connexion pour: ${email}`);

    // Recherche de l'utilisateur
    const user = this.users.find(u => u.email === email);
    if (!user) {
      this.logger.warn(`Utilisateur non trouvé: ${email}`);
      throw new UnauthorizedException('Credentials invalides');
    }

    // Vérification du mot de passe
    // Pour le mock, on accepte des mots de passe simples
    const validPassword = await this.validatePassword(password, user);
    if (!validPassword) {
      this.logger.warn(`Mot de passe invalide pour: ${email}`);
      throw new UnauthorizedException('Credentials invalides');
    }

    // Génération du token JWT
    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      permissions: user.permissions
    };

    const access_token = this.jwtService.sign(payload);

    this.logger.log(`Connexion réussie pour: ${email}`);

    return {
      access_token,
      token_type: 'Bearer',
      expires_in: 86400, // 24 heures
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        permissions: user.permissions
      }
    };
  }

  async validateToken(token: string) {
    try {
      const decoded = this.jwtService.verify(token);
      
      // Vérification que l'utilisateur existe toujours
      const user = this.users.find(u => u.id === decoded.sub);
      if (!user) {
        throw new UnauthorizedException('Utilisateur non trouvé');
      }

      return {
        valid: true,
        user: {
          id: decoded.sub,
          email: decoded.email,
          role: decoded.role,
          permissions: decoded.permissions,
          iat: decoded.iat,
          exp: decoded.exp
        }
      };
    } catch (error) {
      this.logger.warn(`Token invalide: ${error.message}`);
      throw new UnauthorizedException('Token invalide ou expiré');
    }
  }

  private async validatePassword(plainPassword: string, user: User): Promise<boolean> {
    // Pour le mock, on accepte les mots de passe sécurisés suivants:
    const mockPasswords = {
      'admin@payetonkawa.fr': ['admin123', 'Admin123!'], // Ancien + nouveau
      'manager@payetonkawa.fr': ['manager123', 'Manager123!'],
      'user@payetonkawa.fr': ['user123', 'User123!']
    };

    const allowedPasswords = mockPasswords[user.email] || [];
    if (allowedPasswords.includes(plainPassword)) {
      return true;
    }

    // En production, utiliser bcrypt pour hacher les mots de passe:
    // return bcrypt.compare(plainPassword, user.password);
    return false;
  }

  async refreshToken(currentUser: any) {
    // Recherche de l'utilisateur pour vérifier qu'il existe toujours
    const user = this.users.find(u => u.id === currentUser.sub);
    if (!user) {
      throw new UnauthorizedException('Utilisateur non trouvé');
    }

    this.logger.log(`Rafraîchissement du token pour: ${user.email}`);

    // Génération d'un nouveau token avec les informations à jour
    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      permissions: user.permissions
    };

    const access_token = this.jwtService.sign(payload);

    return {
      access_token,
      token_type: 'Bearer',
      expires_in: 86400, // 24 heures
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        permissions: user.permissions
      }
    };
  }

  async getUserById(id: string): Promise<Omit<User, 'password'> | null> {
    const user = this.users.find(u => u.id === id);
    if (!user) {
      return null;
    }

    const { password, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  // Méthode utilitaire pour hasher les mots de passe (pour la production)
  async hashPassword(password: string): Promise<string> {
    const saltRounds = 10;
    return bcrypt.hash(password, saltRounds);
  }
} 