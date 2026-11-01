import type { Timestamps } from './common';

export interface Product extends Timestamps {
  name: string;
  description: string;
  price: number;
  stock: number;
  category: string;
  imageUrl: string | null;
  imagePath: string | null;
  active: boolean;
}
