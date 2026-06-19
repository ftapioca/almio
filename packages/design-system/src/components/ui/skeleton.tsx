import * as React from 'react';
import { cn } from '../../lib/utils';

/**
 * Skeleton — Foundation/Skeleton. Toda operacion > 300ms debe mostrar Skeleton.
 */
function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('animate-pulse rounded-md bg-neutral-200', className)}
      aria-hidden="true"
      {...props}
    />
  );
}

export { Skeleton };
