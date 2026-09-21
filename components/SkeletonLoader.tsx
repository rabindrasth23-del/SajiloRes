import clsx from "clsx";

interface SkeletonLoaderProps {
  className?: string;
}

export function SkeletonLoader({ className }: SkeletonLoaderProps) {
  return (
    <div 
      className={clsx(
        "animate-pulse bg-mist rounded-md",
        className
      )} 
    />
  );
}
