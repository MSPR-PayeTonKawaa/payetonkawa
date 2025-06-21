import {
  PipeTransform,
  Injectable,
  ArgumentMetadata,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { validate } from 'class-validator';
import { plainToClass } from 'class-transformer';

/**
 * Pipe de validation renforcée selon OWASP Top 10
 * 
 * Protections implémentées :
 * - A03:2021 - Injection (SQL, NoSQL, Command Injection)
 * - A07:2021 - Identification and Authentication Failures
 * - A09:2021 - Security Logging and Monitoring Failures
 * - A10:2021 - Server-Side Request Forgery (SSRF)
 */
@Injectable()
export class OWASPValidationPipe implements PipeTransform<any> {
  private readonly logger = new Logger(OWASPValidationPipe.name);

  // Patterns dangereux pour détecter les tentatives d'injection
  private readonly INJECTION_PATTERNS = [
    // SQL Injection
    /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION|SCRIPT)\b)/i,
    /('|(\\x27)|(\\x2D\\x2D)|(%27)|(%2D%2D))/i,
    /((\%3D)|(=))[^\n]*((\%27)|(\\x27)|(\')|(\\x3B)|(;))/i,
    
    // NoSQL Injection
    /(\$where|\$ne|\$in|\$nin|\$gt|\$lt|\$gte|\$lte|\$exists|\$regex)/i,
    
    // Command Injection
    /(;|\||`|&|\$\(|\$\{|<|>)/,
    /(\b(exec|eval|system|shell_exec|passthru|popen|proc_open|file_get_contents|curl_exec)\b)/i,
    
    // Script Injection
    /(<script[^>]*>.*?<\/script>)/i,
    /(javascript:|vbscript:|onload=|onerror=|onclick=)/i,
    
    // Path Traversal
    /(\.\.\/|\.\.\\|%2e%2e%2f|%2e%2e\\)/i,
    
    // LDAP Injection
    /(\*|\)|\(|\|\||&)/,
  ];

  // Patterns pour détecter les tentatives SSRF
  private readonly SSRF_PATTERNS = [
    // Localhost variants
    /(localhost|127\.0\.0\.1|0\.0\.0\.0)/i,
    // Private IP ranges
    /(10\.|172\.(1[6-9]|2[0-9]|3[0-1])\.|192\.168\.)/,
    // Internal schemes
    /(file:|ftp:|gopher:|dict:|sftp:|ldap:|tftp:)/i,
  ];

  // Caractères interdits pour éviter les injections
  private readonly FORBIDDEN_CHARS = [
    '\x00', '\x08', '\x0b', '\x0c', '\x0e', '\x0f',
    '\x10', '\x11', '\x12', '\x13', '\x14', '\x15', '\x16', '\x17',
    '\x18', '\x19', '\x1a', '\x1b', '\x1c', '\x1d', '\x1e', '\x1f'
  ];

  async transform(value: any, metadata: ArgumentMetadata): Promise<any> {
    if (!metadata.metatype || !this.toValidate(metadata.metatype)) {
      return value;
    }

    try {
      // 1. Validation de sécurité OWASP
      this.validateSecurityThreats(value, metadata);

      // 2. Nettoyage et transformation
      const sanitizedValue = this.sanitizeInput(value);

      // 3. Validation des contraintes métier
      const object = plainToClass(metadata.metatype, sanitizedValue);
      const errors = await validate(object, {
        whitelist: true,
        forbidNonWhitelisted: true,
        forbidUnknownValues: true,
        disableErrorMessages: false,
        validationError: {
          target: false,
          value: false,
        },
      });

      if (errors.length > 0) {
        const errorMessages = this.formatValidationErrors(errors);
        this.logger.warn(`Validation échouée: ${JSON.stringify(errorMessages)}`);
        throw new BadRequestException({
          message: 'Données invalides',
          errors: errorMessages,
          timestamp: new Date().toISOString(),
        });
      }

      this.logger.debug(`Validation réussie pour ${metadata.type}`);
      return object;

    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }

      this.logger.error(`Erreur lors de la validation: ${error.message}`);
      throw new BadRequestException({
        message: 'Erreur de validation des données',
        timestamp: new Date().toISOString(),
      });
    }
  }

  private validateSecurityThreats(value: any, metadata: ArgumentMetadata): void {
    if (typeof value === 'object' && value !== null) {
      this.validateObjectSecurity(value, '', metadata);
    } else if (typeof value === 'string') {
      this.validateStringSecurity(value, 'root', metadata);
    }
  }

  private validateObjectSecurity(obj: any, path: string, metadata: ArgumentMetadata): void {
    for (const [key, val] of Object.entries(obj)) {
      const currentPath = path ? `${path}.${key}` : key;

      // Validation de la clé
      this.validateStringSecurity(key, `${currentPath}[key]`, metadata);

      // Validation de la valeur
      if (typeof val === 'string') {
        this.validateStringSecurity(val, currentPath, metadata);
      } else if (typeof val === 'object' && val !== null) {
        this.validateObjectSecurity(val, currentPath, metadata);
      } else if (Array.isArray(val)) {
        val.forEach((item, index) => {
          if (typeof item === 'string') {
            this.validateStringSecurity(item, `${currentPath}[${index}]`, metadata);
          } else if (typeof item === 'object' && item !== null) {
            this.validateObjectSecurity(item, `${currentPath}[${index}]`, metadata);
          }
        });
      }
    }
  }

  private validateStringSecurity(str: string, path: string, metadata: ArgumentMetadata): void {
    // 1. Vérification des caractères interdits
    for (const char of this.FORBIDDEN_CHARS) {
      if (str.includes(char)) {
        this.logger.warn(`Caractère interdit détecté dans ${path}: ${char.charCodeAt(0)}`);
        throw new BadRequestException({
          message: 'Caractères non autorisés détectés',
          field: path,
          code: 'FORBIDDEN_CHARACTERS',
        });
      }
    }

    // 2. Détection des tentatives d'injection
    for (const pattern of this.INJECTION_PATTERNS) {
      if (pattern.test(str)) {
        this.logger.warn(`Tentative d'injection détectée dans ${path}: ${pattern}`);
        throw new BadRequestException({
          message: 'Contenu potentiellement dangereux détecté',
          field: path,
          code: 'INJECTION_ATTEMPT',
        });
      }
    }

    // 3. Détection des tentatives SSRF (pour les URLs)
    if (this.isLikelyUrl(str)) {
      for (const pattern of this.SSRF_PATTERNS) {
        if (pattern.test(str)) {
          this.logger.warn(`Tentative SSRF détectée dans ${path}: ${str}`);
          throw new BadRequestException({
            message: 'URL non autorisée',
            field: path,
            code: 'SSRF_ATTEMPT',
          });
        }
      }
    }

    // 4. Validation de la longueur
    if (str.length > 10000) {
      this.logger.warn(`Chaîne trop longue dans ${path}: ${str.length} caractères`);
      throw new BadRequestException({
        message: 'Données trop volumineuses',
        field: path,
        code: 'PAYLOAD_TOO_LARGE',
      });
    }
  }

  private isLikelyUrl(str: string): boolean {
    return /^https?:\/\//.test(str) || str.includes('://');
  }

  private sanitizeInput(value: any): any {
    if (typeof value === 'string') {
      return this.sanitizeString(value);
    } else if (typeof value === 'object' && value !== null) {
      const sanitized = {};
      for (const [key, val] of Object.entries(value)) {
        sanitized[this.sanitizeString(key)] = this.sanitizeInput(val);
      }
      return sanitized;
    } else if (Array.isArray(value)) {
      return value.map(item => this.sanitizeInput(item));
    }

    return value;
  }

  private sanitizeString(str: string): string {
    return str
      // Suppression des caractères de contrôle
      .replace(/[\x00-\x1f\x7f]/g, '')
      // Normalisation des espaces
      .replace(/\s+/g, ' ')
      // Trim
      .trim();
  }

  private formatValidationErrors(errors: any[]): any[] {
    return errors.map(error => ({
      field: error.property,
      violations: Object.values(error.constraints || {}),
      value: error.value,
    }));
  }

  private toValidate(metatype: Function): boolean {
    const types: Function[] = [String, Boolean, Number, Array, Object];
    return !types.includes(metatype);
  }
} 