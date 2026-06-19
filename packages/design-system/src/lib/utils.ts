import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * cn — combina clases condicionales (clsx) y resuelve conflictos Tailwind (twMerge).
 * Convencion estandar shadcn/ui.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
