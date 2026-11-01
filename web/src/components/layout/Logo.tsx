export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="grid h-8 w-8 place-items-center rounded-[10px] bg-brand text-base text-white">
        ◍
      </span>
      {!compact && (
        <span className="text-[17px] font-bold tracking-tight text-ink">OrderFlow</span>
      )}
    </div>
  );
}
