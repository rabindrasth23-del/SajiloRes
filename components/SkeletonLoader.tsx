import { Skeleton } from "@/components/ui/skeleton";
import clsx from "clsx";

interface SkeletonLoaderProps {
  className?: string;
}

export function SkeletonLoader({ className }: SkeletonLoaderProps) {
  return (
    <Skeleton className={clsx("w-full h-24", className)} />
  );
}
