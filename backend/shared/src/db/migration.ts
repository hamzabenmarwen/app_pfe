/**
 * Database Migration Strategy
 * 
 * This module provides utilities for managing database migrations across
 * all microservices using Prisma Migrate.
 */

import { execSync } from 'child_process';
import path from 'path';
import fs from 'fs';

export interface MigrationConfig {
  serviceName: string;
  prismaSchemaPath: string;
  databaseUrl: string;
}

export interface MigrationStatus {
  serviceName: string;
  status: 'up_to_date' | 'pending' | 'error';
  pendingMigrations: number;
  lastMigration?: string;
  error?: string;
}

/**
 * Run pending migrations for a service
 */
export async function runMigrations(config: MigrationConfig): Promise<void> {
  console.log(`[Migration] Running migrations for ${config.serviceName}...`);
  
  try {
    const cwd = path.dirname(config.prismaSchemaPath);
    
    // Set DATABASE_URL for this command
    const env = { ...process.env, DATABASE_URL: config.databaseUrl };
    
    // Run prisma migrate deploy (production-safe)
    execSync('npx prisma migrate deploy', {
      cwd,
      env,
      stdio: 'inherit',
    });
    
    console.log(`[Migration] ✓ ${config.serviceName} migrations completed`);
  } catch (error) {
    console.error(`[Migration] ✗ ${config.serviceName} migrations failed:`, error);
    throw error;
  }
}

/**
 * Create a new migration (development only)
 */
export async function createMigration(
  config: MigrationConfig,
  migrationName: string
): Promise<void> {
  console.log(`[Migration] Creating migration '${migrationName}' for ${config.serviceName}...`);
  
  try {
    const cwd = path.dirname(config.prismaSchemaPath);
    const env = { ...process.env, DATABASE_URL: config.databaseUrl };
    
    execSync(`npx prisma migrate dev --name ${migrationName}`, {
      cwd,
      env,
      stdio: 'inherit',
    });
    
    console.log(`[Migration] ✓ Migration '${migrationName}' created`);
  } catch (error) {
    console.error(`[Migration] ✗ Failed to create migration:`, error);
    throw error;
  }
}

/**
 * Reset database (development only - DANGEROUS!)
 */
export async function resetDatabase(config: MigrationConfig): Promise<void> {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Cannot reset database in production!');
  }
  
  console.warn(`[Migration] ⚠️ Resetting database for ${config.serviceName}...`);
  
  try {
    const cwd = path.dirname(config.prismaSchemaPath);
    const env = { ...process.env, DATABASE_URL: config.databaseUrl };
    
    execSync('npx prisma migrate reset --force', {
      cwd,
      env,
      stdio: 'inherit',
    });
    
    console.log(`[Migration] ✓ Database reset completed`);
  } catch (error) {
    console.error(`[Migration] ✗ Database reset failed:`, error);
    throw error;
  }
}

/**
 * Check migration status
 */
export async function checkMigrationStatus(
  config: MigrationConfig
): Promise<MigrationStatus> {
  try {
    const cwd = path.dirname(config.prismaSchemaPath);
    const env = { ...process.env, DATABASE_URL: config.databaseUrl };
    
    const output = execSync('npx prisma migrate status --json', {
      cwd,
      env,
      encoding: 'utf-8',
    });
    
    const status = JSON.parse(output);
    
    return {
      serviceName: config.serviceName,
      status: status.migrations.length > 0 ? 'up_to_date' : 'pending',
      pendingMigrations: status.migrations?.length || 0,
      lastMigration: status.migrations?.[status.migrations.length - 1]?.name,
    };
  } catch (error) {
    return {
      serviceName: config.serviceName,
      status: 'error',
      pendingMigrations: 0,
      error: (error as Error).message,
    };
  }
}

/**
 * Seed database with initial data
 */
export async function seedDatabase(
  config: MigrationConfig,
  seedScriptPath: string
): Promise<void> {
  console.log(`[Migration] Seeding database for ${config.serviceName}...`);
  
  if (!fs.existsSync(seedScriptPath)) {
    console.log(`[Migration] No seed script found at ${seedScriptPath}, skipping...`);
    return;
  }
  
  try {
    const cwd = path.dirname(config.prismaSchemaPath);
    const env = { ...process.env, DATABASE_URL: config.databaseUrl };
    
    execSync(`npx ts-node ${seedScriptPath}`, {
      cwd,
      env,
      stdio: 'inherit',
    });
    
    console.log(`[Migration] ✓ Database seeded successfully`);
  } catch (error) {
    console.error(`[Migration] ✗ Seeding failed:`, error);
    throw error;
  }
}

/**
 * Run migrations for all services
 */
export async function runAllMigrations(
  configs: MigrationConfig[]
): Promise<MigrationStatus[]> {
  const results: MigrationStatus[] = [];
  
  for (const config of configs) {
    try {
      await runMigrations(config);
      results.push({
        serviceName: config.serviceName,
        status: 'up_to_date',
        pendingMigrations: 0,
      });
    } catch (error) {
      results.push({
        serviceName: config.serviceName,
        status: 'error',
        pendingMigrations: 0,
        error: (error as Error).message,
      });
    }
  }
  
  return results;
}

/**
 * Migration helper for service initialization
 */
export async function initializeServiceDatabase(
  config: MigrationConfig,
  options?: {
    seedScript?: string;
    skipMigrations?: boolean;
  }
): Promise<void> {
  if (!options?.skipMigrations) {
    await runMigrations(config);
  }
  
  if (options?.seedScript) {
    await seedDatabase(config, options.seedScript);
  }
}
