import { Injectable, Logger, HttpStatus, ServiceUnavailableException } from '@nestjs/common';
import { Request, Response } from 'express';
import axios, { AxiosError, AxiosResponse } from 'axios';

@Injectable()
export class ProxyService {
  private readonly logger = new Logger(ProxyService.name);

  constructor() {}

  async forwardRequest(
    req: Request,
    res: Response,
    targetBaseUrl: string,
    serviceName: string
  ): Promise<void> {
    const startTime = Date.now();
    
    try {
      // Construction de l'URL cible
      const targetPath = req.url.replace('/api/', '/');
      const targetUrl = `${targetBaseUrl}${targetPath}`;

      this.logger.log(`${req.method} ${req.url} -> ${targetUrl}`);

      // Préparation des headers (en excluant certains headers)
      const forwardHeaders = this.prepareHeaders(req);

      // Configuration de la requête
      const axiosConfig = {
        method: req.method.toLowerCase() as any,
        url: targetUrl,
        headers: forwardHeaders,
        data: req.body,
        timeout: 30000,
        validateStatus: () => true, // Accepter toutes les réponses pour les transmettre
      };

      // Exécution de la requête
      const response: AxiosResponse = await axios.request(axiosConfig);

      const responseTime = Date.now() - startTime;

      // Log de la réponse
      this.logger.log(
        `${req.method} ${req.url} -> ${response.status} (${responseTime}ms)`
      );

      // Transmission de la réponse
      this.forwardResponse(res, response, serviceName);

    } catch (error: any) {
      const responseTime = Date.now() - startTime;
      
      // Gestion des erreurs Axios
      if (error.isAxiosError) {
        const targetPath = req.url.replace('/api/', '/');
        const targetUrl = `${targetBaseUrl}${targetPath}`;
        this.handleProxyError(error as AxiosError, serviceName, targetUrl);
      }
      
      this.handleServiceError(req, res, error, serviceName, responseTime);
    }
  }

  private prepareHeaders(req: Request): Record<string, string> {
    const headers = { ...req.headers };

    // Suppression des headers problématiques
    delete headers.host;
    delete headers['content-length'];
    delete headers.connection;
    delete headers['transfer-encoding'];

    // Ajout d'headers pour le tracing
    headers['x-forwarded-for'] = req.ip;
    headers['x-forwarded-proto'] = req.protocol;
    headers['x-forwarded-host'] = req.get('host');
    headers['x-gateway-request-id'] = this.generateRequestId();
    headers['user-agent'] = `PayeTonKawa-Gateway/1.0.0 (${headers['user-agent'] || 'Unknown'})`;

    return headers as Record<string, string>;
  }

  private forwardResponse(res: Response, axiosResponse: any, serviceName: string): void {
    try {
      // Préparation des headers de réponse
      const responseHeaders = { ...axiosResponse.headers };
      
      // Suppression des headers problématiques
      delete responseHeaders['content-length'];
      delete responseHeaders['transfer-encoding'];
      delete responseHeaders.connection;

      // Ajout d'headers pour le debugging
      responseHeaders['x-served-by'] = serviceName;
      responseHeaders['x-gateway'] = 'payetonkawa-api-gateway';
      responseHeaders['x-response-time'] = Date.now().toString();

      // Application des headers
      Object.entries(responseHeaders).forEach(([key, value]) => {
        if (value) {
          res.set(key, value as string);
        }
      });

      // Envoi de la réponse
      res.status(axiosResponse.status).json(axiosResponse.data);

    } catch (error) {
      this.logger.error(`Erreur lors du forwarding de la réponse: ${error.message}`);
      res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        statusCode: 500,
        message: 'Erreur interne du gateway',
        error: 'Internal Server Error'
      });
    }
  }

  private handleProxyError(error: AxiosError, serviceName: string, targetUrl: string): void {
    if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
      this.logger.error(`Service ${serviceName} indisponible: ${targetUrl}`);
      throw new ServiceUnavailableException(`Service ${serviceName} indisponible`);
    }

    if (error.code === 'ETIMEDOUT') {
      this.logger.error(`Timeout du service ${serviceName}: ${targetUrl}`);
      throw new ServiceUnavailableException(`Service ${serviceName} timeout`);
    }

    this.logger.error(`Erreur proxy vers ${serviceName}: ${error.message}`);
  }

  private handleServiceError(
    req: Request,
    res: Response,
    error: any,
    serviceName: string,
    responseTime: number
  ): void {
    this.logger.error(
      `Erreur ${req.method} ${req.url} -> ${serviceName} (${responseTime}ms): ${error.message}`
    );

    // Détermination du status code approprié
    let statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Erreur interne du service';

    if (error instanceof ServiceUnavailableException) {
      statusCode = HttpStatus.SERVICE_UNAVAILABLE;
      message = error.message;
    } else if (error.code === 'ECONNREFUSED') {
      statusCode = HttpStatus.SERVICE_UNAVAILABLE;
      message = `Service ${serviceName} indisponible`;
    } else if (error.code === 'ETIMEDOUT') {
      statusCode = HttpStatus.GATEWAY_TIMEOUT;
      message = `Timeout du service ${serviceName}`;
    }

    // Réponse d'erreur structurée
    res.status(statusCode).json({
      statusCode,
      message,
      error: this.getErrorName(statusCode),
      service: serviceName,
      timestamp: new Date().toISOString(),
      path: req.url,
      method: req.method,
      requestId: this.generateRequestId()
    });
  }

  private getErrorName(statusCode: number): string {
    switch (statusCode) {
      case 503: return 'Service Unavailable';
      case 504: return 'Gateway Timeout';
      case 500: return 'Internal Server Error';
      default: return 'Unknown Error';
    }
  }

  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Méthode utilitaire pour vérifier la santé d'un service
  async checkServiceHealth(serviceUrl: string, serviceName: string): Promise<boolean> {
    try {
      const response: AxiosResponse = await axios.get(`${serviceUrl}/health`, {
        timeout: 5000,
        headers: {
          'User-Agent': 'PayeTonKawa-Gateway-HealthCheck'
        }
      });

      return response.status === 200;
    } catch (error) {
      this.logger.warn(`Health check failed for ${serviceName}: ${error.message}`);
      return false;
    }
  }
} 