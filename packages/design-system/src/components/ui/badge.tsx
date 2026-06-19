import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../lib/utils';

/**
 * Badge — Foundation/Badge (representar estados).
 * Variantes: success | warning | danger | info | neutral (default).
 */
const badgeVariants = cva(
  'inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-caption font-semibold transition-colors',
  {
    variants: {
      variant: {
        neutral: 'border-transparent bg-neutral-100 text-neutral-700',
        success: 'border-transparent bg-success-50 text-success-700',
        warning: 'border-transparent bg-warning-50 text-warning-700',
        danger: 'border-transparent bg-danger-50 text-danger-700',
        info: 'border-transparent bg-info-50 text-info-700',
        outline: 'border-border bg-transparent text-foreground',
      },
    },
    defaultVariants: {
      variant: 'neutral',
    },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
