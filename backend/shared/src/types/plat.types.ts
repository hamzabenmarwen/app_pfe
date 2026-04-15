export interface Category {
  id: string;
  name: string;
  description?: string;
  imageUrl?: string;
  displayOrder: number;
  isActive: boolean;
  createdAt: Date;
}

export interface CreateCategoryDto {
  name: string;
  description?: string;
  imageUrl?: string;
  displayOrder?: number;
}

export interface UpdateCategoryDto {
  name?: string;
  description?: string;
  imageUrl?: string;
  displayOrder?: number;
  isActive?: boolean;
}

export interface Plat {
  id: string;
  categoryId: string;
  name: string;
  description?: string;
  price: number;
  images: string[];
  preparationTime?: number;
  isAvailable: boolean;
  isVegetarian: boolean;
  isVegan: boolean;
  isHalal: boolean;
  isGlutenFree: boolean;
  spiceLevel: number;
  calories?: number;
  ingredients?: string;
  allergens: Allergen[];
  createdAt: Date;
  updatedAt: Date;
}

export interface Allergen {
  id: string;
  name: string;
  icon?: string;
}

export interface CreatePlatDto {
  categoryId: string;
  name: string;
  description?: string;
  price: number;
  images?: string[];
  preparationTime?: number;
  isVegetarian?: boolean;
  isVegan?: boolean;
  isHalal?: boolean;
  isGlutenFree?: boolean;
  spiceLevel?: number;
  calories?: number;
  ingredients?: string;
  allergenIds?: string[];
}

export interface UpdatePlatDto {
  categoryId?: string;
  name?: string;
  description?: string;
  price?: number;
  images?: string[];
  preparationTime?: number;
  isAvailable?: boolean;
  isVegetarian?: boolean;
  isVegan?: boolean;
  isHalal?: boolean;
  isGlutenFree?: boolean;
  spiceLevel?: number;
  calories?: number;
  ingredients?: string;
  allergenIds?: string[];
}

export interface PlatFilters {
  categoryId?: string;
  isVegetarian?: boolean;
  isVegan?: boolean;
  isHalal?: boolean;
  isGlutenFree?: boolean;
  maxSpiceLevel?: number;
  minPrice?: number;
  maxPrice?: number;
  search?: string;
}
