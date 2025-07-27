import { Test, TestingModule } from '@nestjs/testing';
import { AuthModule } from './auth.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './jwt.guard';
import { JwtService } from '@nestjs/jwt';
import { ThrottlerModule } from '@nestjs/throttler';

describe('AuthModule', () => {
  let module: TestingModule;

  beforeEach(async () => {
    module = await Test.createTestingModule({
      imports: [
        ThrottlerModule.forRoot([
          {
            ttl: 60000,
            limit: 10,
          },
        ]),
        AuthModule,
      ],
    }).compile();
  });

  afterEach(async () => {
    if (module) {
      await module.close();
    }
  });

  it('should be defined', () => {
    expect(module).toBeDefined();
  });

  it('should have AuthController', () => {
    const controller = module.get<AuthController>(AuthController);
    expect(controller).toBeDefined();
  });

  it('should have AuthService', () => {
    const service = module.get<AuthService>(AuthService);
    expect(service).toBeDefined();
  });

  it('should have JwtAuthGuard', () => {
    const guard = module.get<JwtAuthGuard>(JwtAuthGuard);
    expect(guard).toBeDefined();
  });

  it('should export AuthService', () => {
    const service = module.get<AuthService>(AuthService);
    expect(service).toBeDefined();
  });

  it('should export JwtModule', () => {
    const jwtService = module.get<JwtService>(JwtService);
    expect(jwtService).toBeDefined();
  });

  it('should export JwtAuthGuard', () => {
    const guard = module.get<JwtAuthGuard>(JwtAuthGuard);
    expect(guard).toBeDefined();
  });
});
