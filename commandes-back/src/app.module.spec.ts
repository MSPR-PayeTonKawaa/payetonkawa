import { Test } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppModule } from './app.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';

// Mock all TypeORM decorators and modules
jest.mock('@nestjs/typeorm', () => ({
  TypeOrmModule: {
    forRoot: jest.fn(() => ({
      module: 'MockedTypeOrmRootModule',
      providers: [],
      exports: [],
    })),
    forFeature: jest.fn(() => ({
      module: 'MockedTypeOrmFeatureModule',
      providers: [],
      exports: [],
    })),
  },
  InjectRepository: jest.fn(() => jest.fn()),
  Repository: jest.fn(),
}));

// Mock ConfigModule
jest.mock('@nestjs/config', () => ({
  ConfigModule: {
    forRoot: jest.fn(() => ({
      module: 'MockedConfigModule',
      providers: [],
      exports: [],
    })),
  },
}));

// Mock RabbitMQ module
jest.mock('./rabbitmq/rabbitmq.module', () => ({
  RabbitMQModule: {
    module: 'MockedRabbitMQModule',
    providers: [],
    exports: [],
  },
}));

// Mock services
jest.mock('./services/orders.service', () => ({
  OrdersService: jest.fn(() => ({})),
}));

describe('AppModule', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(AppModule).toBeDefined();
  });

  it('should have proper module structure', () => {
    // Test that AppModule is properly structured
    expect(typeof AppModule).toBe('function');
    expect(AppModule.name).toBe('AppModule');
  });
});
