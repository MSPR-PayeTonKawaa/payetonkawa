import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like, FindManyOptions } from 'typeorm';
import { plainToClass } from 'class-transformer';

import { Customer, Address, Profile, Company } from '../entities';
import {
  CreateCustomerDto,
  UpdateCustomerDto,
  CustomerResponseDto,
  CustomerListResponseDto,
} from '../dto';
import { CustomerEventPublisher } from '../rabbitmq/publishers/customer-event.publisher';

export interface FindCustomersOptions {
  page?: number;
  limit?: number;
  search?: string;
  city?: string;
  isActive?: boolean;
}

@Injectable()
export class CustomersService {
  private readonly logger = new Logger(CustomersService.name);

  constructor(
    @InjectRepository(Customer)
    private readonly customerRepository: Repository<Customer>,
    @InjectRepository(Address)
    private readonly addressRepository: Repository<Address>,
    @InjectRepository(Profile)
    private readonly profileRepository: Repository<Profile>,
    @InjectRepository(Company)
    private readonly companyRepository: Repository<Company>,
    private readonly customerEventPublisher: CustomerEventPublisher,
  ) {}

  /**
   * Créer un nouveau client avec toutes ses relations
   */
  async create(createCustomerDto: CreateCustomerDto): Promise<CustomerResponseDto> {
    this.logger.log(`Création d'un nouveau client: ${createCustomerDto.email}`);

    // Vérifier l'unicité de l'email et du username
    await this.checkUniqueFields(createCustomerDto.email, createCustomerDto.username);

    // Créer et sauvegarder l'adresse
    const address = this.addressRepository.create({
      ...createCustomerDto.address,
      country: createCustomerDto.address.country || 'France',
    });
    const savedAddress = await this.addressRepository.save(address);

    // Créer et sauvegarder le profil
    const profile = this.profileRepository.create({
      ...createCustomerDto.profile,
      isActive: createCustomerDto.profile.isActive ?? true,
      birthDate: createCustomerDto.profile.birthDate 
        ? new Date(createCustomerDto.profile.birthDate) 
        : undefined,
    });
    const savedProfile = await this.profileRepository.save(profile);

    // Créer et sauvegarder l'entreprise si fournie
    let savedCompany: Company | undefined;
    if (createCustomerDto.company) {
      // Vérifier l'unicité du SIRET si fourni
      if (createCustomerDto.company.siret) {
        await this.checkUniqueSiret(createCustomerDto.company.siret);
      }
      
      const company = this.companyRepository.create({
        ...createCustomerDto.company,
        isActive: createCustomerDto.company.isActive ?? true,
      });
      savedCompany = await this.companyRepository.save(company);
    }

    // Créer et sauvegarder le client principal
    const customer = this.customerRepository.create({
      username: createCustomerDto.username,
      name: createCustomerDto.name,
      firstName: createCustomerDto.firstName,
      lastName: createCustomerDto.lastName,
      email: createCustomerDto.email,
      address: savedAddress,
      profile: savedProfile,
      company: savedCompany,
    });

    const savedCustomer = await this.customerRepository.save(customer);
    
    // Publier événement de création
    await this.customerEventPublisher.publishCustomerCreated(savedCustomer);
    
    this.logger.log(`Client créé avec succès: ${savedCustomer.id}`);
    return this.toResponseDto(savedCustomer);
  }

  /**
   * Récupérer tous les clients avec pagination et filtres
   */
  async findAll(options: FindCustomersOptions = {}): Promise<CustomerListResponseDto> {
    const { page = 1, limit = 10, search, city, isActive } = options;
    
    this.logger.log(`Récupération des clients - Page: ${page}, Limite: ${limit}`);

    const queryBuilder = this.customerRepository
      .createQueryBuilder('customer')
      .leftJoinAndSelect('customer.address', 'address')
      .leftJoinAndSelect('customer.profile', 'profile')
      .leftJoinAndSelect('customer.company', 'company');

    // Filtres
    if (search) {
      queryBuilder.andWhere(
        '(customer.name ILIKE :search OR customer.email ILIKE :search OR customer.username ILIKE :search)',
        { search: `%${search}%` }
      );
    }

    if (city) {
      queryBuilder.andWhere('address.city ILIKE :city', { city: `%${city}%` });
    }

    if (isActive !== undefined) {
      queryBuilder.andWhere('profile.isActive = :isActive', { isActive });
    }

    // Pagination
    const offset = (page - 1) * limit;
    queryBuilder.skip(offset).take(limit);

    // Tri par date de création décroissante
    queryBuilder.orderBy('customer.createdAt', 'DESC');

    const [customers, total] = await queryBuilder.getManyAndCount();
    const totalPages = Math.ceil(total / limit);

    const data = customers.map(customer => this.toResponseDto(customer));

    return {
      data,
      total,
      page,
      limit,
      totalPages,
    };
  }

  /**
   * Récupérer un client par son ID
   */
  async findOne(id: string): Promise<CustomerResponseDto> {
    this.logger.log(`Récupération du client: ${id}`);

    const customer = await this.customerRepository.findOne({
      where: { id },
      relations: ['address', 'profile', 'company'],
    });

    if (!customer) {
      throw new NotFoundException(`Client avec l'ID ${id} non trouvé`);
    }

    return this.toResponseDto(customer);
  }

  /**
   * Mettre à jour un client
   */
  async update(id: string, updateCustomerDto: UpdateCustomerDto): Promise<CustomerResponseDto> {
    this.logger.log(`Mise à jour du client: ${id}`);

    const customer = await this.customerRepository.findOne({
      where: { id },
      relations: ['address', 'profile', 'company'],
    });

    if (!customer) {
      throw new NotFoundException(`Client avec l'ID ${id} non trouvé`);
    }

    // Vérifier l'unicité des champs modifiés
    if (updateCustomerDto.email && updateCustomerDto.email !== customer.email) {
      await this.checkUniqueFields(updateCustomerDto.email, undefined, id);
    }
    
    if (updateCustomerDto.username && updateCustomerDto.username !== customer.username) {
      await this.checkUniqueFields(undefined, updateCustomerDto.username, id);
    }

    // Mettre à jour l'adresse
    if (updateCustomerDto.address) {
      Object.assign(customer.address, updateCustomerDto.address);
      await this.addressRepository.save(customer.address);
    }

    // Mettre à jour le profil
    if (updateCustomerDto.profile) {
      const profileUpdate = { ...updateCustomerDto.profile };
      if (profileUpdate.birthDate) {
        profileUpdate.birthDate = new Date(profileUpdate.birthDate) as any;
      }
      Object.assign(customer.profile, profileUpdate);
      await this.profileRepository.save(customer.profile);
    }

    // Mettre à jour l'entreprise
    if (updateCustomerDto.company) {
      if (updateCustomerDto.company.siret && 
          (!customer.company || updateCustomerDto.company.siret !== customer.company.siret)) {
        await this.checkUniqueSiret(updateCustomerDto.company.siret, customer.company?.id);
      }

      if (customer.company) {
        Object.assign(customer.company, updateCustomerDto.company);
        await this.companyRepository.save(customer.company);
      } else {
        // Créer une nouvelle entreprise
        const newCompany = this.companyRepository.create({
          ...updateCustomerDto.company,
          isActive: updateCustomerDto.company.isActive ?? true,
        });
        customer.company = await this.companyRepository.save(newCompany);
      }
    }

    // Mettre à jour le client principal
    if (updateCustomerDto.username) customer.username = updateCustomerDto.username;
    if (updateCustomerDto.name) customer.name = updateCustomerDto.name;
    if (updateCustomerDto.firstName) customer.firstName = updateCustomerDto.firstName;
    if (updateCustomerDto.lastName) customer.lastName = updateCustomerDto.lastName;
    if (updateCustomerDto.email) customer.email = updateCustomerDto.email;

    const updatedCustomer = await this.customerRepository.save(customer);
    
    // Publier événement de mise à jour
    const changes = Object.keys(updateCustomerDto);
    await this.customerEventPublisher.publishCustomerUpdated(updatedCustomer, changes);
    
    this.logger.log(`Client mis à jour avec succès: ${id}`);
    return this.toResponseDto(updatedCustomer);
  }

  /**
   * Supprimer un client (soft delete par désactivation)
   */
  async remove(id: string): Promise<void> {
    this.logger.log(`Suppression du client: ${id}`);

    const customer = await this.customerRepository.findOne({
      where: { id },
      relations: ['profile'],
    });

    if (!customer) {
      throw new NotFoundException(`Client avec l'ID ${id} non trouvé`);
    }

    // Soft delete : désactiver le profil
    customer.profile.isActive = false;
    await this.profileRepository.save(customer.profile);
    
    // Publier événement de suppression
    await this.customerEventPublisher.publishCustomerDeleted(customer.id, customer.name, customer.email);
    
    this.logger.log(`Client désactivé avec succès: ${id}`);
  }

  /**
   * Vérifier l'unicité de l'email et du username
   */
  private async checkUniqueFields(
    email?: string, 
    username?: string, 
    excludeId?: string
  ): Promise<void> {
    if (email) {
      const existingEmail = await this.customerRepository.findOne({
        where: { email },
      });
      
      if (existingEmail && existingEmail.id !== excludeId) {
        throw new ConflictException(`L'email ${email} est déjà utilisé`);
      }
    }

    if (username) {
      const existingUsername = await this.customerRepository.findOne({
        where: { username },
      });
      
      if (existingUsername && existingUsername.id !== excludeId) {
        throw new ConflictException(`Le nom d'utilisateur ${username} est déjà utilisé`);
      }
    }
  }

  /**
   * Vérifier l'unicité du SIRET
   */
  private async checkUniqueSiret(siret: string, excludeId?: string): Promise<void> {
    const existingSiret = await this.companyRepository.findOne({
      where: { siret },
    });
    
    if (existingSiret && existingSiret.id !== excludeId) {
      throw new ConflictException(`Le SIRET ${siret} est déjà utilisé`);
    }
  }

  /**
   * Convertir une entité Customer en DTO de réponse
   */
  private toResponseDto(customer: Customer): CustomerResponseDto {
    return plainToClass(CustomerResponseDto, customer, {
      excludeExtraneousValues: true,
    });
  }
} 