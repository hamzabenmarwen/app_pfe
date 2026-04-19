import { PrismaClient } from '@prisma/client';
import { NotFoundError, ConflictError, DatabaseError } from '../errors/AppError';

/**
 * Base service providing common database operations and error handling
 */
export abstract class BaseService<TModel, TCreate, TUpdate> {
  constructor(
    protected prisma: PrismaClient,
    protected modelName: string,
    protected modelDelegate: any
  ) {}

  /**
   * Find all records with optional filtering and pagination
   */
  async findAll(options?: {
    where?: Record<string, any>;
    include?: Record<string, any>;
    skip?: number;
    take?: number;
    orderBy?: Record<string, any>;
  }): Promise<TModel[]> {
    try {
      return await this.modelDelegate.findMany(options);
    } catch (error) {
      throw new DatabaseError(`Failed to fetch ${this.modelName} records`);
    }
  }

  /**
   * Find single record by ID
   */
  async findById(id: string, include?: Record<string, any>): Promise<TModel> {
    const record = await this.modelDelegate.findUnique({
      where: { id },
      include,
    });

    if (!record) {
      throw new NotFoundError(this.modelName, id);
    }

    return record;
  }

  /**
   * Create new record
   */
  async create(data: TCreate): Promise<TModel> {
    try {
      return await this.modelDelegate.create({ data });
    } catch (error: any) {
      if (error.code === 'P2002') {
        throw new ConflictError(
          `${this.modelName} with this identifier already exists`
        );
      }
      throw new DatabaseError(`Failed to create ${this.modelName}`);
    }
  }

  /**
   * Update existing record
   */
  async update(id: string, data: TUpdate): Promise<TModel> {
    await this.findById(id); // Ensure exists

    try {
      return await this.modelDelegate.update({
        where: { id },
        data,
      });
    } catch (error: any) {
      if (error.code === 'P2025') {
        throw new NotFoundError(this.modelName, id);
      }
      throw new DatabaseError(`Failed to update ${this.modelName}`);
    }
  }

  /**
   * Delete record
   */
  async delete(id: string): Promise<void> {
    await this.findById(id); // Ensure exists

    try {
      await this.modelDelegate.delete({ where: { id } });
    } catch (error: any) {
      if (error.code === 'P2025') {
        throw new NotFoundError(this.modelName, id);
      }
      throw new DatabaseError(`Failed to delete ${this.modelName}`);
    }
  }

  /**
   * Count records with optional filter
   */
  async count(where?: Record<string, any>): Promise<number> {
    try {
      return await this.modelDelegate.count({ where });
    } catch (error) {
      throw new DatabaseError(`Failed to count ${this.modelName} records`);
    }
  }

  /**
   * Check if record exists
   */
  async exists(id: string): Promise<boolean> {
    const count = await this.modelDelegate.count({ where: { id } });
    return count > 0;
  }

  /**
   * Execute operations within a transaction
   */
  async transaction<T>(
    operations: (tx: any) => Promise<T>
  ): Promise<T> {
    try {
      return await this.prisma.$transaction(operations);
    } catch (error) {
      throw new DatabaseError('Transaction failed');
    }
  }
}
