import { cn } from '@/utils/cn';

export function Spinner({ className }: { className?: string }) {
  return (
    <span
      role="status"
      aria-label="Loading"
      className={cn(
        'inline-block h-5 w-5 animate-spin rounded-full border-2 border-line border-t-brand',
        className,
      )}
    />
  );
}

export function FullPageSpinner() {
  return (
    <div className="grid min-h-screen place-items-center bg-canvas">
      <Spinner className="h-7 w-7" />
    </div>
  );
}
