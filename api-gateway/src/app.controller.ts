import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AppService } from './app.service';

@ApiTags('📊 Monitoring')
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  @ApiOperation({ 
    summary: 'Point d\'entrée principal',
    description: 'Retourne les informations de base de l\'API Gateway PayeTonKawa'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Informations sur l\'API Gateway',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string' },
        version: { type: 'string' },
        services: { 
          type: 'object',
          properties: {
            clients: { type: 'string' },
            produits: { type: 'string' },
            commandes: { type: 'string' }
          }
        }
      }
    }
  })
  getWelcome() {
    return this.appService.getWelcome();
  }
}
