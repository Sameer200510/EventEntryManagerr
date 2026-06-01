export const Skeleton = ({ className, ...props }) => {
  return (
    <div
      className={`animate-pulse bg-slate-800/50 rounded-md ${className}`}
      {...props}
    />
  );
};

export const SkeletonText = ({ lines = 3, className = "" }) => (
  <div className={`space-y-3 ${className}`}>
    {Array.from({ length: lines }).map((_, i) => (
      <Skeleton key={i} className={`h-4 ${i === lines - 1 ? 'w-2/3' : 'w-full'}`} />
    ))}
  </div>
);

export const SkeletonCard = ({ className = "" }) => (
  <div className={`card-glass p-6 ${className}`}>
    <Skeleton className="h-10 w-10 rounded-full mb-4" />
    <Skeleton className="h-6 w-3/4 mb-2" />
    <Skeleton className="h-4 w-1/2 mb-6" />
    <div className="space-y-2">
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-full" />
    </div>
  </div>
);
