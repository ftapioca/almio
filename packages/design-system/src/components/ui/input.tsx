import * as React from 'react';
import { cn } from '../../lib/utils';

/**
 * Input — Foundation/Input
 * Variantes via type (text, email, password, number, ...). Estado error via aria-invalid.
 * Altura tactil minima 40px (44px en mobile recomendado por contenedor).
 */
export type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type = 'text', ...props }, ref) => {
    return (
      <input
        type={type}
        ref={ref}
        className={cn(
          'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-body-sm text-foreground transition-colors duration-fast',
          'placeholder:text-muted-foreground',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
          'disabled:cursor-not-allowed disabled:opacity-50',
          'aria-[invalid=true]:border-destructive aria-[invalid=true]:focus-visible:ring-destructive',
          'file:border-0 file:bg-transparent file:text-body-sm file:font-medium',
          className,
        )}
        {...props}
      />
    );
  },
);
Input.displayName = 'Input';

export { Input };
