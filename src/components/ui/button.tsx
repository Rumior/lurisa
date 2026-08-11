import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-indigo-500 disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default: 'bg-indigo-500 text-parchment-100 shadow hover:bg-indigo-700',
        destructive: 'bg-error text-parchment-100 shadow-sm hover:bg-error/90',
        outline: 'border border-parchment-700 bg-transparent shadow-sm hover:bg-parchment-500 hover:text-charcoal-700',
        secondary: 'bg-sage-500 text-parchment-100 shadow-sm hover:bg-sage-700',
        ghost: 'hover:bg-parchment-500 hover:text-charcoal-700',
        link: 'text-indigo-500 underline-offset-4 hover:underline',
        amber: 'bg-amber-500 text-parchment-100 shadow-sm hover:bg-amber-700',
        terracotta: 'bg-terracotta-500 text-parchment-100 shadow-sm hover:bg-terracotta-700',
      },
      size: {
        default: 'h-9 px-4 py-2',
        sm: 'h-8 rounded-md px-3 text-xs',
        lg: 'h-10 rounded-md px-8',
        icon: 'h-9 w-9',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => {
    return (
      <button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = 'Button';

export { Button, buttonVariants };
