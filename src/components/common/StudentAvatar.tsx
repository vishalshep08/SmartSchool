import { cn } from '@/lib/utils';

interface StudentAvatarProps {
  photoUrl?: string | null;
  name: string;
  size?: 'sm' | 'md' | 'lg';
}

export function StudentAvatar({ photoUrl, name, size = 'md' }: StudentAvatarProps) {
  const sizeClass = {
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-24 h-24 text-2xl',
  }[size];

  if (photoUrl) {
    return (
      <img
        src={photoUrl}
        alt={name}
        className={cn(sizeClass, 'rounded-full object-cover')}
        onError={(e) => {
          (e.currentTarget as HTMLImageElement).style.display = 'none';
          const fallback = e.currentTarget.nextElementSibling as HTMLElement;
          if (fallback) fallback.style.display = 'flex';
        }}
      />
    );
  }

  return (
    <div className={cn(sizeClass, 'rounded-full bg-primary/10 flex items-center justify-center font-semibold text-primary')}>
      {name.charAt(0).toUpperCase()}
    </div>
  );
}
