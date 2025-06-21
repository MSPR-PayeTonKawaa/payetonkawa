import { Injectable, NestMiddleware, Logger, Inject, Optional } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { MetricsService } from '../monitoring/metrics.service';

interface SecurityEvent {
  timestamp: string;
  ip: string;
  userAgent: string;
  method: string;
  url: string;
  threatType: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  description: string;
  headers: any;
  blocked: boolean;
}

@Injectable()
export class SecurityMiddleware implements NestMiddleware {
  private readonly logger = new Logger(SecurityMiddleware.name);
  
  constructor(
    @Optional() private readonly metricsService?: MetricsService,
  ) {}
  
  // Cache pour le rate limiting par IP
  private readonly ipRequestCounts = new Map<string, { count: number; resetTime: number }>();
  private readonly suspiciousIPs = new Set<string>();
  private readonly blockedIPs = new Set<string>();
  
  // Configuration
  private readonly config = {
    maxRequestsPerMinute: 120,
    maxRequestsPerHour: 1000,
    suspiciousThreshold: 50,
    blockDuration: 15 * 60 * 1000, // 15 minutes
    monitoringEnabled: true,
  };

  // Patterns de détection d'attaques
  private readonly attackPatterns = {
    sqlInjection: [
      /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|UNION)\b)/i,
      /('|(\\x27)|(\\x2D\\x2D)|(%27)|(%2D%2D))/i,
      /((\%3D)|(=))[^\n]*((\%27)|(\\x27)|(\')|(\\x3B)|(;))/i,
    ],
    xss: [
      /(<script[^>]*>.*?<\/script>)/i,
      /(javascript:|vbscript:|onload=|onerror=|onclick=)/i,
      /(<iframe|<object|<embed|<link|<meta)/i,
    ],
    pathTraversal: [
      /(\.\.\/|\.\.\\|%2e%2e%2f|%2e%2e\\)/i,
      /(\/etc\/passwd|\/proc\/|C:\\Windows\\)/i,
    ],
    commandInjection: [
      /(;|\||`|&|\$\(|\$\{)/,
      /(\b(exec|eval|system|shell_exec|cmd)\b)/i,
    ],
    bruteForce: [
      /\/api\/auth\/login/,
    ],
  };

  use(req: Request, res: Response, next: NextFunction) {
    const startTime = Date.now();
    const clientIP = this.getClientIP(req);
    
    try {
      // 1. Vérification IP bloquée
      if (this.blockedIPs.has(clientIP)) {
        this.logSecurityEvent({
          timestamp: new Date().toISOString(),
          ip: clientIP,
          userAgent: req.get('User-Agent') || 'Unknown',
          method: req.method,
          url: req.url,
          threatType: 'BLOCKED_IP',
          severity: 'HIGH',
          description: 'Tentative d\'accès depuis une IP bloquée',
          headers: req.headers,
          blocked: true,
        });
        
        return res.status(403).json({
          error: 'Accès refusé',
          code: 'IP_BLOCKED',
          timestamp: new Date().toISOString(),
        });
      }

      // 2. Rate limiting
      if (!this.checkRateLimit(clientIP)) {
        this.logSecurityEvent({
          timestamp: new Date().toISOString(),
          ip: clientIP,
          userAgent: req.get('User-Agent') || 'Unknown',
          method: req.method,
          url: req.url,
          threatType: 'RATE_LIMIT_EXCEEDED',
          severity: 'MEDIUM',
          description: 'Limite de requêtes dépassée',
          headers: req.headers,
          blocked: true,
        });
        
        return res.status(429).json({
          error: 'Trop de requêtes',
          code: 'RATE_LIMIT_EXCEEDED',
          retryAfter: 60,
          timestamp: new Date().toISOString(),
        });
      }

      // 3. Détection d'attaques
      const threat = this.detectThreats(req);
      if (threat) {
        this.handleThreat(req, res, threat, clientIP);
        return;
      }

      // 4. Validation des headers de sécurité
      const headerViolation = this.checkSecurityHeaders(req);
      if (headerViolation) {
        this.logSecurityEvent({
          timestamp: new Date().toISOString(),
          ip: clientIP,
          userAgent: req.get('User-Agent') || 'Unknown',
          method: req.method,
          url: req.url,
          threatType: 'HEADER_VIOLATION',
          severity: 'LOW',
          description: headerViolation,
          headers: req.headers,
          blocked: false,
        });
      }

      // 5. Monitoring des métriques
      res.on('finish', () => {
        const duration = Date.now() - startTime;
        this.logRequestMetrics(req, res, duration, clientIP);
        
        // Enregistrer les métriques HTTP pour MSPR814
        if (this.metricsService) {
          this.metricsService.recordHttpMetric({
            timestamp: new Date().toISOString(),
            method: req.method,
            url: req.url,
            statusCode: res.statusCode,
            responseTime: duration,
            userAgent: req.get('User-Agent'),
            ip: clientIP,
            service: this.extractServiceFromUrl(req.url),
          });
        }
      });

      // 6. Ajout des headers de sécurité
      this.addSecurityHeaders(res);

      next();

    } catch (error) {
      this.logger.error(`Erreur dans le middleware de sécurité: ${error.message}`);
      next();
    }
  }

  private getClientIP(req: Request): string {
    return (
      req.headers['x-forwarded-for'] as string ||
      req.headers['x-real-ip'] as string ||
      req.connection.remoteAddress ||
      req.socket.remoteAddress ||
      'unknown'
    ).split(',')[0].trim();
  }

  private checkRateLimit(ip: string): boolean {
    const now = Date.now();
    const resetTime = Math.floor(now / 60000) * 60000 + 60000; // Prochaine minute

    const current = this.ipRequestCounts.get(ip);
    
    if (!current || now >= current.resetTime) {
      this.ipRequestCounts.set(ip, { count: 1, resetTime });
      return true;
    }

    current.count++;
    
    if (current.count > this.config.maxRequestsPerMinute) {
      // Marquer comme suspecte si trop de requêtes
      if (current.count > this.config.suspiciousThreshold) {
        this.suspiciousIPs.add(ip);
        
        // Bloquer si vraiment excessif
        if (current.count > this.config.maxRequestsPerMinute * 2) {
          this.blockedIPs.add(ip);
          
          // Débloquer automatiquement après un délai
          setTimeout(() => {
            this.blockedIPs.delete(ip);
            this.logger.log(`IP ${ip} débloquée automatiquement`);
          }, this.config.blockDuration);
        }
      }
      
      return false;
    }

    return true;
  }

  private detectThreats(req: Request): { type: string; severity: string; description: string } | null {
    const url = req.url.toLowerCase();
    const userAgent = req.get('User-Agent') || '';
    const queryString = req.url.includes('?') ? req.url.split('?')[1] : '';
    const body = JSON.stringify(req.body || {});

    // Détection SQL Injection
    for (const pattern of this.attackPatterns.sqlInjection) {
      if (pattern.test(url) || pattern.test(queryString) || pattern.test(body)) {
        return {
          type: 'SQL_INJECTION',
          severity: 'HIGH',
          description: 'Tentative d\'injection SQL détectée',
        };
      }
    }

    // Détection XSS
    for (const pattern of this.attackPatterns.xss) {
      if (pattern.test(url) || pattern.test(queryString) || pattern.test(body)) {
        return {
          type: 'XSS_ATTEMPT',
          severity: 'HIGH',
          description: 'Tentative d\'attaque XSS détectée',
        };
      }
    }

    // Détection Path Traversal
    for (const pattern of this.attackPatterns.pathTraversal) {
      if (pattern.test(url) || pattern.test(queryString)) {
        return {
          type: 'PATH_TRAVERSAL',
          severity: 'HIGH',
          description: 'Tentative de path traversal détectée',
        };
      }
    }

    // Détection Command Injection
    for (const pattern of this.attackPatterns.commandInjection) {
      if (pattern.test(queryString) || pattern.test(body)) {
        return {
          type: 'COMMAND_INJECTION',
          severity: 'CRITICAL',
          description: 'Tentative d\'injection de commande détectée',
        };
      }
    }

    // Détection Bot malveillant
    if (this.isMaliciousBot(userAgent)) {
      return {
        type: 'MALICIOUS_BOT',
        severity: 'MEDIUM',
        description: 'Bot potentiellement malveillant détecté',
      };
    }

    return null;
  }

  private isMaliciousBot(userAgent: string): boolean {
    const maliciousBots = [
      /nikto/i,
      /sqlmap/i,
      /nmap/i,
      /dirb/i,
      /dirbuster/i,
      /burpsuite/i,
      /w3af/i,
      /acunetix/i,
      /nessus/i,
      /openvas/i,
    ];

    return maliciousBots.some(pattern => pattern.test(userAgent));
  }

  private handleThreat(
    req: Request,
    res: Response,
    threat: { type: string; severity: string; description: string },
    clientIP: string,
  ): void {
    this.logSecurityEvent({
      timestamp: new Date().toISOString(),
      ip: clientIP,
      userAgent: req.get('User-Agent') || 'Unknown',
      method: req.method,
      url: req.url,
      threatType: threat.type,
      severity: threat.severity as any,
      description: threat.description,
      headers: req.headers,
      blocked: true,
    });

    // Bloquer temporairement pour les menaces critiques
    if (threat.severity === 'CRITICAL' || threat.severity === 'HIGH') {
      this.suspiciousIPs.add(clientIP);
      
      // Bloquer automatiquement après plusieurs tentatives
      const suspiciousCount = Array.from(this.suspiciousIPs).filter(ip => ip === clientIP).length;
      if (suspiciousCount >= 3) {
        this.blockedIPs.add(clientIP);
        setTimeout(() => {
          this.blockedIPs.delete(clientIP);
        }, this.config.blockDuration);
      }
    }

    res.status(403).json({
      error: 'Activité suspecte détectée',
      code: threat.type,
      timestamp: new Date().toISOString(),
      reference: `SEC-${Date.now()}`,
    });
  }

  private checkSecurityHeaders(req: Request): string | null {
    // Vérification de l'origine
    const origin = req.get('Origin');
    if (origin && this.isUnauthorizedOrigin(origin)) {
      return `Origine non autorisée: ${origin}`;
    }

    // Vérification du Content-Type pour les requêtes POST/PUT/PATCH
    if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
      const contentType = req.get('Content-Type');
      if (!contentType || !this.isValidContentType(contentType)) {
        return `Content-Type invalide: ${contentType}`;
      }
    }

    return null;
  }

  private isUnauthorizedOrigin(origin: string): boolean {
    const allowedOrigins = [
      'http://localhost:3000',
      'http://localhost:3001',
      'http://localhost:3002',
      'http://localhost:3003',
      'https://payetonkawa.fr',
      'https://api.payetonkawa.fr',
    ];

    return !allowedOrigins.includes(origin);
  }

  private isValidContentType(contentType: string): boolean {
    const validTypes = [
      'application/json',
      'application/x-www-form-urlencoded',
      'multipart/form-data',
      'text/plain',
    ];

    return validTypes.some(type => contentType.includes(type));
  }

  private addSecurityHeaders(res: Response): void {
    // Protection contre le clickjacking
    res.header('X-Frame-Options', 'DENY');
    
    // Protection contre MIME sniffing
    res.header('X-Content-Type-Options', 'nosniff');
    
    // Protection XSS
    res.header('X-XSS-Protection', '1; mode=block');
    
    // Référrer policy
    res.header('Referrer-Policy', 'strict-origin-when-cross-origin');
    
    // Content Security Policy
    res.header('Content-Security-Policy', "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline';");
    
    // Permissions Policy
    res.header('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
  }

  private logRequestMetrics(req: Request, res: Response, duration: number, clientIP: string): void {
    if (!this.config.monitoringEnabled) return;

    const metrics = {
      timestamp: new Date().toISOString(),
      ip: clientIP,
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      duration,
      userAgent: req.get('User-Agent'),
      contentLength: req.get('Content-Length') || 0,
      responseSize: res.get('Content-Length') || 0,
    };

    // Log des requêtes lentes
    if (duration > 2000) {
      this.logger.warn(`Requête lente détectée: ${duration}ms - ${req.method} ${req.url}`);
    }

    // Log des erreurs
    if (res.statusCode >= 400) {
      this.logger.warn(`Erreur HTTP: ${res.statusCode} - ${req.method} ${req.url} - IP: ${clientIP}`);
    }

    this.logger.debug(`Request metrics: ${JSON.stringify(metrics)}`);
  }

  private logSecurityEvent(event: SecurityEvent): void {
    // Log formaté pour les outils de monitoring
    this.logger.warn(`SECURITY_EVENT: ${JSON.stringify(event)}`);
    
    // En production, envoyer vers un SIEM ou service de monitoring
    if (process.env.NODE_ENV === 'production') {
      // TODO: Intégrer avec Grafana/Prometheus ou service externe
      this.sendToSecurityMonitoring(event);
    }
  }

  private sendToSecurityMonitoring(event: SecurityEvent): void {
    // Placeholder pour l'intégration avec des outils de monitoring
    // Ex: Elastic Stack, Splunk, etc.
    console.log(`[SECURITY] ${event.threatType}: ${event.description} from ${event.ip}`);
  }

  // Méthode pour obtenir les statistiques de sécurité
  getSecurityStats() {
    return {
      blockedIPs: Array.from(this.blockedIPs),
      suspiciousIPs: Array.from(this.suspiciousIPs),
      activeConnections: this.ipRequestCounts.size,
      totalBlocked: this.blockedIPs.size,
      totalSuspicious: this.suspiciousIPs.size,
    };
  }

  private extractServiceFromUrl(url: string): string {
    if (url.includes('/api/customers')) return 'clients';
    if (url.includes('/api/products')) return 'produits';
    if (url.includes('/api/orders')) return 'commandes';
    if (url.includes('/api/auth')) return 'auth';
    if (url.includes('/api/health')) return 'monitoring';
    if (url.includes('/api/monitoring')) return 'monitoring';
    return 'gateway';
  }
} 