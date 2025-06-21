import { Injectable, Logger, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { 
  CreateProductDto, 
  UpdateProductDto, 
  UpdateStockDto, 
  SetStockDto,
  ProductListResponseDto,
  StockAlertResponseDto
} from '../dto';
import { Product, ProductDetails, StockStatus } from '../entities';
import { ProductEventPublisher } from '../rabbitmq/publishers/product-event.publisher';
import { StockEventPublisher } from '../rabbitmq/publishers/stock-event.publisher';

export interface FindProductsOptions {
  page?: number;
  limit?: number;
  search?: string;
  category?: string;
  priceMin?: number;
  priceMax?: number;
  stockStatus?: StockStatus;
  isActive?: boolean;
}

@Injectable()
export class ProductsService {
  private readonly logger = new Logger(ProductsService.name);

  constructor(
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    @InjectRepository(ProductDetails)
    private readonly productDetailsRepository: Repository<ProductDetails>,
    private readonly productEventPublisher: ProductEventPublisher,
    private readonly stockEventPublisher: StockEventPublisher,
  ) {}

  async create(createProductDto: CreateProductDto): Promise<Product> {
    this.logger.log(`Création d'un nouveau produit: ${createProductDto.name}`);

    // Vérifier si un produit avec le même nom existe déjà
    const existingProduct = await this.productRepository.findOne({
      where: { name: createProductDto.name }
    });

    if (existingProduct) {
      throw new ConflictException(`Un produit avec le nom "${createProductDto.name}" existe déjà`);
    }

    try {
      // Créer les détails du produit
      const productDetails = this.productDetailsRepository.create(createProductDto.details);
      
      // Créer le produit principal
      const product = this.productRepository.create({
        name: createProductDto.name,
        stock: createProductDto.stock || 0,
        isActive: createProductDto.isActive ?? true,
        details: productDetails,
      });

      const savedProduct = await this.productRepository.save(product);
      this.logger.log(`Produit créé avec succès - ID: ${savedProduct.id}`);
      
      // Publier événement de création
      await this.productEventPublisher.publishProductCreated(savedProduct);
      
      return savedProduct;
    } catch (error) {
      this.logger.error(`Erreur lors de la création du produit: ${error.message}`);
      throw error;
    }
  }

  async findAll(options: FindProductsOptions = {}): Promise<ProductListResponseDto> {
    const {
      page = 1,
      limit = 10,
      search,
      category,
      priceMin,
      priceMax,
      stockStatus,
      isActive
    } = options;

    this.logger.log(`Récupération des produits - Page: ${page}, Limite: ${limit}`);

    const query = this.productRepository
      .createQueryBuilder('product')
      .leftJoinAndSelect('product.details', 'details')
      .orderBy('product.createdAt', 'DESC');

    // Filtres
    if (search) {
      query.andWhere(
        '(product.name ILIKE :search OR details.description ILIKE :search OR details.category ILIKE :search)',
        { search: `%${search}%` }
      );
    }

    if (category) {
      query.andWhere('details.category ILIKE :category', { category: `%${category}%` });
    }

    if (priceMin !== undefined) {
      query.andWhere('details.price >= :priceMin', { priceMin });
    }

    if (priceMax !== undefined) {
      query.andWhere('details.price <= :priceMax', { priceMax });
    }

    if (stockStatus) {
      query.andWhere('product.stockStatus = :stockStatus', { stockStatus });
    }

    if (isActive !== undefined) {
      query.andWhere('product.isActive = :isActive', { isActive });
    }

    // Pagination
    const offset = (page - 1) * limit;
    query.skip(offset).take(limit);

    const [products, total] = await query.getManyAndCount();
    const totalPages = Math.ceil(total / limit);

    return {
      data: products,
      total,
      page,
      limit,
      totalPages,
    };
  }

  async findOne(id: string): Promise<Product> {
    this.logger.log(`Récupération du produit ID: ${id}`);

    const product = await this.productRepository.findOne({
      where: { id },
      relations: ['details'],
    });

    if (!product) {
      throw new NotFoundException(`Produit avec ID ${id} non trouvé`);
    }

    return product;
  }

  async update(id: string, updateProductDto: UpdateProductDto): Promise<Product> {
    this.logger.log(`Mise à jour du produit ID: ${id}`);

    const product = await this.findOne(id);

    // Vérifier l'unicité du nom si modifié
    if (updateProductDto.name && updateProductDto.name !== product.name) {
      const existingProduct = await this.productRepository.findOne({
        where: { name: updateProductDto.name }
      });

      if (existingProduct) {
        throw new ConflictException(`Un produit avec le nom "${updateProductDto.name}" existe déjà`);
      }
    }

    try {
      // Traquer les changements pour l'événement
      const changes: string[] = [];
      const oldStock = product.stock;
      
      // Mise à jour des champs du produit principal
      if (updateProductDto.name) {
        changes.push('name');
        product.name = updateProductDto.name;
      }
      if (updateProductDto.stock !== undefined) {
        changes.push('stock');
        product.stock = updateProductDto.stock;
      }
      if (updateProductDto.isActive !== undefined) {
        changes.push('isActive');
        product.isActive = updateProductDto.isActive;
      }

      // Mise à jour des détails si fournis
      if (updateProductDto.details) {
        changes.push('details');
        Object.assign(product.details, updateProductDto.details);
      }

      const savedProduct = await this.productRepository.save(product);
      this.logger.log(`Produit mis à jour avec succès - ID: ${savedProduct.id}`);
      
      // Publier événements
      if (changes.length > 0) {
        await this.productEventPublisher.publishProductUpdated(savedProduct, changes);
        
        // Si le stock a changé, publier événement de stock
        if (changes.includes('stock') && oldStock !== savedProduct.stock) {
          await this.stockEventPublisher.publishStockUpdated(savedProduct, oldStock);
        }
      }
      
      return savedProduct;
    } catch (error) {
      this.logger.error(`Erreur lors de la mise à jour: ${error.message}`);
      throw error;
    }
  }

  async remove(id: string): Promise<void> {
    this.logger.log(`Suppression du produit ID: ${id}`);

    const product = await this.findOne(id);
    
    // Désactiver au lieu de supprimer physiquement
    product.isActive = false;
    await this.productRepository.save(product);
    
    // Publier événement de suppression
    await this.productEventPublisher.publishProductDeleted(product.id, product.name);
    
    this.logger.log(`Produit désactivé avec succès - ID: ${id}`);
  }

  async updateStock(id: string, updateStockDto: UpdateStockDto): Promise<Product> {
    this.logger.log(`Mise à jour du stock - Produit: ${id}, Quantité: ${updateStockDto.quantity}`);

    const product = await this.findOne(id);
    const oldStock = product.stock;

    if (updateStockDto.quantity > 0) {
      product.incrementStock(updateStockDto.quantity);
    } else {
      const success = product.decrementStock(Math.abs(updateStockDto.quantity));
      if (!success) {
        throw new ConflictException('Stock insuffisant pour cette opération');
      }
    }

    const savedProduct = await this.productRepository.save(product);
    this.logger.log(`Stock mis à jour - Nouveau stock: ${savedProduct.stock}`);
    
    // Publier événement de stock mis à jour
    await this.stockEventPublisher.publishStockUpdated(savedProduct, oldStock);
    
    return savedProduct;
  }

  async setStock(id: string, setStockDto: SetStockDto): Promise<Product> {
    this.logger.log(`Définition du stock - Produit: ${id}, Nouveau stock: ${setStockDto.stock}`);

    const product = await this.findOne(id);
    const oldStock = product.stock;
    
    product.stock = setStockDto.stock;
    if (setStockDto.stockStatus) {
      product.stockStatus = setStockDto.stockStatus;
    } else {
      product.updateStockStatus();
    }

    const savedProduct = await this.productRepository.save(product);
    this.logger.log(`Stock défini avec succès - Nouveau stock: ${savedProduct.stock}`);
    
    // Publier événement de stock mis à jour
    await this.stockEventPublisher.publishStockUpdated(savedProduct, oldStock);
    
    return savedProduct;
  }

  async getStockAlerts(): Promise<StockAlertResponseDto> {
    this.logger.log('Récupération des alertes de stock');

    const outOfStock = await this.productRepository.find({
      where: { stockStatus: StockStatus.RUPTURE, isActive: true },
      relations: ['details'],
      order: { name: 'ASC' }
    });

    const lowStock = await this.productRepository.find({
      where: { stockStatus: StockStatus.LOW, isActive: true },
      relations: ['details'],
      order: { stock: 'ASC' }
    });

    return {
      outOfStock,
      lowStock,
      totalAlerts: outOfStock.length + lowStock.length,
    };
  }

  async searchProducts(query: string): Promise<Product[]> {
    this.logger.log(`Recherche de produits: "${query}"`);

    return this.productRepository
      .createQueryBuilder('product')
      .leftJoinAndSelect('product.details', 'details')
      .where('product.isActive = :isActive', { isActive: true })
      .andWhere(
        '(product.name ILIKE :query OR details.description ILIKE :query OR details.category ILIKE :query OR details.origin ILIKE :query)',
        { query: `%${query}%` }
      )
      .orderBy('product.name', 'ASC')
      .getMany();
  }

  async getCategories(): Promise<string[]> {
    this.logger.log('Récupération de toutes les catégories');

    const result = await this.productDetailsRepository
      .createQueryBuilder('details')
      .select('DISTINCT details.category', 'category')
      .where('details.category IS NOT NULL')
      .andWhere('details.category != :empty', { empty: '' })
      .getRawMany();

    return result.map(r => r.category).sort();
  }

  async getProductsByPriceRange(min: number, max: number): Promise<Product[]> {
    this.logger.log(`Récupération des produits entre ${min}€ et ${max}€`);

    return this.productRepository
      .createQueryBuilder('product')
      .leftJoinAndSelect('product.details', 'details')
      .where('product.isActive = :isActive', { isActive: true })
      .andWhere('details.price >= :min AND details.price <= :max', { min, max })
      .orderBy('details.price', 'ASC')
      .getMany();
  }

  // Méthodes pour les événements RabbitMQ
  async decrementStock(id: string, quantity: number): Promise<Product> {
    this.logger.log(`Décrément stock - Produit: ${id}, Quantité: ${quantity}`);

    const product = await this.findOne(id);
    
    const success = product.decrementStock(quantity);
    if (!success) {
      this.logger.warn(`Stock insuffisant pour décrémenter ${quantity} unités du produit ${id}`);
      throw new ConflictException(`Stock insuffisant. Stock actuel: ${product.stock}, demandé: ${quantity}`);
    }

    const savedProduct = await this.productRepository.save(product);
    this.logger.log(`Stock décrémenté - Produit: ${id}, Nouveau stock: ${savedProduct.stock}`);
    
    return savedProduct;
  }

  async incrementStock(id: string, quantity: number): Promise<Product> {
    this.logger.log(`Incrément stock - Produit: ${id}, Quantité: ${quantity}`);

    const product = await this.findOne(id);
    
    product.incrementStock(quantity);

    const savedProduct = await this.productRepository.save(product);
    this.logger.log(`Stock incrémenté - Produit: ${id}, Nouveau stock: ${savedProduct.stock}`);
    
    return savedProduct;
  }
} 