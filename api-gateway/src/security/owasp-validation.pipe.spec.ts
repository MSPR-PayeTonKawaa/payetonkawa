import { Test, TestingModule } from '@nestjs/testing';
import { ArgumentMetadata, BadRequestException } from '@nestjs/common';
import { OWASPValidationPipe } from './owasp-validation.pipe';
import { IsString, IsEmail, IsOptional } from 'class-validator';

// Classe de test pour les validations
class TestDto {
  @IsString()
  name: string;

  @IsEmail()
  email: string;

  @IsOptional()
  @IsString()
  description?: string;
}

describe('OWASPValidationPipe', () => {
  let pipe: OWASPValidationPipe;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [OWASPValidationPipe],
    }).compile();

    pipe = module.get<OWASPValidationPipe>(OWASPValidationPipe);
  });

  it('should be defined', () => {
    expect(pipe).toBeDefined();
  });

  it('should allow valid data', async () => {
    const validData = {
      name: 'John Doe',
      email: 'john@example.com',
      description: 'A normal description',
    };

    const metadata: ArgumentMetadata = {
      type: 'body',
      metatype: TestDto,
      data: '',
    };

    const result = await pipe.transform(validData, metadata);
    expect(result).toEqual(validData);
  });

  it('should reject SQL injection attempts', async () => {
    const maliciousData = {
      name: "John'; DROP TABLE users; --",
      email: 'john@example.com',
    };

    const metadata: ArgumentMetadata = {
      type: 'body',
      metatype: TestDto,
      data: '',
    };

    await expect(pipe.transform(maliciousData, metadata)).rejects.toThrow(BadRequestException);
  });

  it('should reject XSS attempts', async () => {
    const maliciousData = {
      name: '<script>alert("xss")</script>',
      email: 'john@example.com',
    };

    const metadata: ArgumentMetadata = {
      type: 'body',
      metatype: TestDto,
      data: '',
    };

    await expect(pipe.transform(maliciousData, metadata)).rejects.toThrow(BadRequestException);
  });

  it('should reject command injection attempts', async () => {
    const maliciousData = {
      name: 'John; exec rm -rf /',
      email: 'john@example.com',
    };

    const metadata: ArgumentMetadata = {
      type: 'body',
      metatype: TestDto,
      data: '',
    };

    await expect(pipe.transform(maliciousData, metadata)).rejects.toThrow(BadRequestException);
  });

  it('should reject NoSQL injection attempts', async () => {
    const maliciousData = {
      name: 'John',
      email: 'john@example.com',
      description: '{"$where": "this.username == this.password"}',
    };

    const metadata: ArgumentMetadata = {
      type: 'body',
      metatype: TestDto,
      data: '',
    };

    await expect(pipe.transform(maliciousData, metadata)).rejects.toThrow(BadRequestException);
  });

  it('should reject path traversal attempts', async () => {
    const maliciousData = {
      name: '../../../etc/passwd',
      email: 'john@example.com',
    };

    const metadata: ArgumentMetadata = {
      type: 'body',
      metatype: TestDto,
      data: '',
    };

    await expect(pipe.transform(maliciousData, metadata)).rejects.toThrow(BadRequestException);
  });

  it('should reject SSRF attempts', async () => {
    const maliciousData = {
      name: 'John',
      email: 'john@example.com',
      description: 'http://localhost:8080/admin',
    };

    const metadata: ArgumentMetadata = {
      type: 'body',
      metatype: TestDto,
      data: '',
    };

    await expect(pipe.transform(maliciousData, metadata)).rejects.toThrow(BadRequestException);
  });

  it('should handle non-object inputs', async () => {
    const metadata: ArgumentMetadata = {
      type: 'param',
      metatype: String,
      data: '',
    };

    const result = await pipe.transform('test-string', metadata);
    expect(result).toBe('test-string');
  });

  it('should handle null/undefined inputs', async () => {
    const metadata: ArgumentMetadata = {
      type: 'body',
      metatype: TestDto,
      data: '',
    };

    const result1 = await pipe.transform(null, metadata);
    expect(result1).toBeNull();

    const result2 = await pipe.transform(undefined, metadata);
    expect(result2).toBeUndefined();
  });

  it('should handle inputs without metatype', async () => {
    const data = { test: 'value' };
    const metadata: ArgumentMetadata = {
      type: 'body',
      data: '',
    };

    const result = await pipe.transform(data, metadata);
    expect(result).toEqual(data);
  });

  it('should validate nested objects', async () => {
    const data = {
      name: 'John',
      email: 'john@example.com',
      nested: {
        malicious: "'; DROP TABLE users; --",
      },
    };

    const metadata: ArgumentMetadata = {
      type: 'body',
      metatype: TestDto,
      data: '',
    };

    await expect(pipe.transform(data, metadata)).rejects.toThrow(BadRequestException);
  });

  it('should validate arrays', async () => {
    const data = {
      name: 'John',
      email: 'john@example.com',
      tags: ['normal', '<script>alert("xss")</script>'],
    };

    const metadata: ArgumentMetadata = {
      type: 'body',
      metatype: TestDto,
      data: '',
    };

    await expect(pipe.transform(data, metadata)).rejects.toThrow(BadRequestException);
  });

  it('should handle very long inputs', async () => {
    const longString = 'a'.repeat(100000); // String très long
    const data = {
      name: longString,
      email: 'john@example.com',
    };

    const metadata: ArgumentMetadata = {
      type: 'body',
      metatype: TestDto,
      data: '',
    };

    await expect(pipe.transform(data, metadata)).rejects.toThrow(BadRequestException);
  });

  it('should sanitize valid data', async () => {
    const data = {
      name: '  John Doe  ', // Espaces à supprimer
      email: 'JOHN@EXAMPLE.COM', // Casse à normaliser
    };

    const metadata: ArgumentMetadata = {
      type: 'body',
      metatype: TestDto,
      data: '',
    };

    const result = await pipe.transform(data, metadata);
    expect(result.name).toBe('John Doe');
    expect(result.email).toBe('john@example.com');
  });
});
