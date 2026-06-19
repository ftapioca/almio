import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../lib/utils';

/**
 * Alert — Feedback/Alert. Comunica situaciones que requieren atencion.
 * Variantes: info (default) | success | warning | danger.
 * Regla: nunca comunicar solo por color; incluir titulo/texto.
 */
const alertVariants = cva(
  'relative w-full rounded-md border p-4 text-body-sm [&>svg]:absolute [&>svg]:left-4 [&>svg]:top-4 [&>svg]:size-5 [&>svg~*]:pl-7',
  {
    variants: {
      variant: {
        info: 'border-info-100 bg-info-50 text-info-700 [&>svg]:text-info-500',
        success: 'border-success-100 bg-success-50 text-success-700 [&>svg]:text-success-500',
        warning: 'border-warning-100 bg-warning-50 text-warning-700 [&>svg]:text-warning-500',
        danger: 'border-danger-100 bg-danger-50 text-danger-700 [&>svg]:text-danger-500',
      },
    },
    defaultVariants: {
      variant: 'info',
    },
  },
);

const Alert = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & VariantProps<typeof alertVariants>
>(({ className, variant, ...props }, ref) => (
  <div ref={ref} role="alert" className={cn(alertVariants({ variant }), className)} {...props} />
));
Alert.displayName = 'Alert';

const AlertTitle = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <h5 ref={ref} className={cn('mb-1 font-semibold leading-none tracking-tight', className)} {...props} />
  ),
);
AlertTitle.displayName = 'AlertTitle';

const AlertDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn('text-body-sm leading-6 [&_p]:leading-6', className)} {...props} />
));
AlertDescription.displayName = 'AlertDescription';

export { Alert, AlertTitle, AlertDescription, alertVariants };
