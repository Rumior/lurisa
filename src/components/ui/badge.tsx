import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2',
  {
    variants: {
      variant: {
        default: 'border-transparent bg-indigo-500 text-parchment-100 hover:bg-indigo-700',
        secondary: 'border-transparent bg-sage-500 text-parchment-100 hover:bg-sage-700',
        outline: 'text-charcoal-700 border-parchment-700 dark:text-parchment-100 dark:border-indigo-800',
        amber: 'border-transparent bg-amber-500 text-parchment-100 hover:bg-amber-700',
        terracotta: 'border-transparent bg-terracotta-500 text-parchment-100 hover:bg-terracotta-700',
        muted: 'border-transparent bg-parchment-500 text-charcoal-500 dark:bg-indigo-800 dark:text-parchment-300',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
