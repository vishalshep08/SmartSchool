import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-[6px] border px-2.5 py-0.5 text-[12px] font-body font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default: "border-transparent bg-primary text-primary-foreground hover:bg-primary/80",
        secondary: "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
        destructive: "border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80",
        outline: "text-foreground",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}

function getBadgeStyle(text: string | undefined | React.ReactNode): React.CSSProperties | undefined {
  if (typeof text !== 'string') return undefined;
  const t = text.toLowerCase().trim();
  
  if (t === 'principal') return { backgroundColor: '#eff6ff', color: '#1d4ed8', borderColor: 'transparent' };
  if (t === 'staff' || t.includes('teacher')) return { backgroundColor: '#f0fdf4', color: '#15803d', borderColor: 'transparent' };
  if (t === 'parent') return { backgroundColor: '#fdf4ff', color: '#7e22ce', borderColor: 'transparent' };
  if (t === 'super admin' || t === 'super_admin') return { backgroundColor: '#fff7ed', color: '#c2410c', borderColor: 'transparent' };
  
  if (t === 'present') return { backgroundColor: '#dcfce7', color: '#166534', borderColor: 'transparent' };
  if (t === 'absent') return { backgroundColor: '#fef2f2', color: '#991b1b', borderColor: 'transparent' };
  
  if (t.includes('due') || t === 'pending') return { backgroundColor: '#fef3c7', color: '#854d0e', borderColor: 'transparent' };
  if (t === 'paid' || t === 'active') return { backgroundColor: '#dcfce7', color: '#166534', borderColor: 'transparent' };
  if (t === 'inactive') return { backgroundColor: '#f1f5f9', color: '#475569', borderColor: 'transparent' };
  
  return undefined;
}

function Badge({ className, variant, style, children, ...props }: BadgeProps) {
  const dynamicStyle = getBadgeStyle(children);
  return (
    <div 
      className={cn(badgeVariants({ variant }), className)} 
      style={{ ...dynamicStyle, ...style }}
      {...props}
    >
      {children}
    </div>
  );
}

export { Badge, badgeVariants };
