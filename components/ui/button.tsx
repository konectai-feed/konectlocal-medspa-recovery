import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';
const buttonVariants = cva('inline-flex items-center justify-center rounded-xl font-semibold transition focus-visible:outline-aqua disabled:pointer-events-none disabled:opacity-50', { variants: { variant: { default: 'bg-aqua text-navy hover:bg-aqua/80', secondary: 'bg-navy-secondary text-white hover:bg-navy', outline: 'border border-navy text-navy hover:bg-white' }, size: { default: 'h-11 px-5', lg: 'h-14 px-8 text-lg' } }, defaultVariants: { variant: 'default', size: 'default' } });
export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> { asChild?: boolean }
export function Button({ className, variant, size, asChild = false, ...props }: ButtonProps) { const Comp = asChild ? Slot : 'button'; return <Comp className={cn(buttonVariants({ variant, size, className }))} {...props} />; }
