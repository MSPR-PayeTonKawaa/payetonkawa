import { Test, TestingModule } from '@nestjs/testing';
import { CustomerEventPublisher } from './customer-event.publisher';
import { RabbitMQService } from '../rabbitmq.service';
import { Customer } from '../../entities/customer.entity';

describe('CustomerEventPublisher', () => {
  let publisher: CustomerEventPublisher;
  let rabbitMQService: RabbitMQService;

  const mockRabbitMQService = {
    publish: jest.fn().mockResolvedValue(undefined),
    assertQueue: jest.fn().mockResolvedValue(undefined),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CustomerEventPublisher,
        {
          provide: RabbitMQService,
          useValue: mockRabbitMQService,
        },
      ],
    }).compile();

    publisher = module.get<CustomerEventPublisher>(CustomerEventPublisher);
    rabbitMQService = module.get<RabbitMQService>(RabbitMQService);
  });

  it('should be defined', () => {
    expect(publisher).toBeDefined();
  });

  it('should inject RabbitMQService', () => {
    expect(rabbitMQService).toBeDefined();
  });

  describe('publishCustomerCreated', () => {
    it('should publish customer created event', async () => {
      const customer = new Customer();
      customer.id = '123e4567-e89b-12d3-a456-426614174000';
      customer.username = 'testuser';
      customer.email = 'test@example.com';
      customer.name = 'Test User';

      await publisher.publishCustomerCreated(customer);

      expect(mockRabbitMQService.publish).toHaveBeenCalledWith(
        'payetonkawa.events',
        'customer.created',
        {
          eventType: 'customer.created',
          customerId: customer.id,
          name: customer.name,
          email: customer.email,
          type: 'individual',
          timestamp: expect.any(String),
        },
      );
    });

    it('should handle business type for company customer', async () => {
      const customer = new Customer();
      customer.id = '123e4567-e89b-12d3-a456-426614174000';
      customer.name = 'Test Company';
      customer.email = 'company@example.com';
      customer.company = {} as any; // Mock company

      await publisher.publishCustomerCreated(customer);

      expect(mockRabbitMQService.publish).toHaveBeenCalledWith(
        'payetonkawa.events',
        'customer.created',
        expect.objectContaining({
          type: 'business',
        }),
      );
    });

    it('should handle errors gracefully', async () => {
      const customer = new Customer();
      customer.id = '123e4567-e89b-12d3-a456-426614174000';

      mockRabbitMQService.publish.mockRejectedValueOnce(
        new Error('Publish failed'),
      );

      // Ne doit pas lever d'exception
      await expect(publisher.publishCustomerCreated(customer)).resolves.toBeUndefined();
    });
  });

  describe('publishCustomerUpdated', () => {
    it('should publish customer updated event', async () => {
      const customer = new Customer();
      customer.id = '123e4567-e89b-12d3-a456-426614174000';
      customer.username = 'updateduser';
      customer.email = 'updated@example.com';
      customer.name = 'Updated User';

      const changes = ['email', 'name'];

      await publisher.publishCustomerUpdated(customer, changes);

      expect(mockRabbitMQService.publish).toHaveBeenCalledWith(
        'payetonkawa.events',
        'customer.updated',
        {
          eventType: 'customer.updated',
          customerId: customer.id,
          name: customer.name,
          email: customer.email,
          type: 'individual',
          changes,
          timestamp: expect.any(String),
        },
      );
    });
  });

  describe('publishCustomerDeleted', () => {
    it('should publish customer deleted event', async () => {
      const customerId = '123e4567-e89b-12d3-a456-426614174000';
      const customerName = 'Deleted User';
      const email = 'deleted@example.com';

      await publisher.publishCustomerDeleted(customerId, customerName, email);

      expect(mockRabbitMQService.publish).toHaveBeenCalledWith(
        'payetonkawa.events',
        'customer.deleted',
        {
          eventType: 'customer.deleted',
          customerId,
          name: customerName,
          email,
          timestamp: expect.any(String),
        },
      );
    });
  });
});
