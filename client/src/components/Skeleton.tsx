interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className }: SkeletonProps) {
  return (
    <div
      className={`animate-pulse rounded-md bg-gray-200 dark:bg-gray-700 ${className || ''}`}
    />
  );
}

interface ProjectCardSkeletonProps {
  count?: number;
}

export function ProjectCardSkeleton({ count = 6 }: ProjectCardSkeletonProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-5"
        >
          {/* Header with badges */}
          <div className="flex items-start justify-between mb-3">
            <Skeleton className="h-6 w-24 rounded-full" />
            <Skeleton className="h-5 w-16 rounded" />
          </div>

          {/* Title */}
          <Skeleton className="h-6 w-full mb-2" />
          <Skeleton className="h-6 w-3/4 mb-4" />

          {/* Description */}
          <Skeleton className="h-4 w-full mb-2" />
          <Skeleton className="h-4 w-5/6 mb-3" />

          {/* Genre */}
          <Skeleton className="h-4 w-24 mb-3" />

          {/* Tags */}
          <div className="flex flex-wrap gap-2 mb-3">
            <Skeleton className="h-6 w-16 rounded-full" />
            <Skeleton className="h-6 w-20 rounded-full" />
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between pt-3 border-t border-gray-100 dark:border-gray-700">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-3 w-20" />
          </div>
        </div>
      ))}
    </div>
  );
}

interface ChapterListSkeletonProps {
  count?: number;
}

export function ChapterListSkeleton({ count = 5 }: ChapterListSkeletonProps) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-3 p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700"
        >
          {/* Drag handle */}
          <Skeleton className="h-5 w-5" />

          {/* Chapter number */}
          <Skeleton className="h-8 w-8 rounded-full flex-shrink-0" />

          {/* Chapter info */}
          <div className="flex-grow">
            <Skeleton className="h-5 w-48 mb-2" />
            <Skeleton className="h-4 w-32" />
          </div>

          {/* Status badge */}
          <Skeleton className="h-5 w-16 rounded" />

          {/* Actions */}
          <Skeleton className="h-8 w-8 rounded" />
        </div>
      ))}
    </div>
  );
}

interface EditorSkeletonProps {}

export function EditorSkeleton({}: EditorSkeletonProps) {
  return (
    <div className="space-y-4">
      {/* Title */}
      <Skeleton className="h-10 w-3/4" />

      {/* Meta info */}
      <div className="flex gap-4">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-5 w-24" />
      </div>

      {/* Content lines */}
      <div className="space-y-3">
        {Array.from({ length: 15 }).map((_, i) => (
          <Skeleton
            key={i}
            className="h-4 w-full"
            style={{ maxWidth: `${85 + Math.random() * 15}%` }}
          />
        ))}
      </div>
    </div>
  );
}

interface TableSkeletonProps {
  rows?: number;
  columns?: number;
}

export function TableSkeleton({ rows = 5, columns = 4 }: TableSkeletonProps) {
  return (
    <div className="w-full">
      {/* Header */}
      <div className="flex gap-4 mb-4 pb-2 border-b border-gray-200 dark:border-gray-700">
        {Array.from({ length: columns }).map((_, i) => (
          <Skeleton key={i} className="h-6 flex-1" />
        ))}
      </div>

      {/* Rows */}
      <div className="space-y-3">
        {Array.from({ length: rows }).map((_, rowIndex) => (
          <div key={rowIndex} className="flex gap-4">
            {Array.from({ length: columns }).map((_, colIndex) => (
              <Skeleton key={colIndex} className="h-10 flex-1" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

interface StatsCardSkeletonProps {
  count?: number;
}

export function StatsCardSkeleton({ count = 4 }: StatsCardSkeletonProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6"
        >
          {/* Icon */}
          <Skeleton className="h-10 w-10 rounded-lg mb-4" />

          {/* Label */}
          <Skeleton className="h-4 w-24 mb-2" />

          {/* Value */}
          <Skeleton className="h-8 w-32 mb-2" />

          {/* Change */}
          <Skeleton className="h-4 w-20" />
        </div>
      ))}
    </div>
  );
}

interface HumanModelCardSkeletonProps {
  count?: number;
}

export function HumanModelCardSkeleton({ count = 3 }: HumanModelCardSkeletonProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-5"
        >
          {/* Header */}
          <div className="flex items-center gap-3 mb-4">
            <Skeleton className="h-12 w-12 rounded-full" />
            <div className="flex-grow">
              <Skeleton className="h-5 w-40 mb-2" />
              <Skeleton className="h-4 w-24" />
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-3 mb-4">
            <div>
              <Skeleton className="h-4 w-16 mb-1" />
              <Skeleton className="h-6 w-12" />
            </div>
            <div>
              <Skeleton className="h-4 w-16 mb-1" />
              <Skeleton className="h-6 w-12" />
            </div>
            <div>
              <Skeleton className="h-4 w-16 mb-1" />
              <Skeleton className="h-6 w-12" />
            </div>
          </div>

          {/* Description */}
          <Skeleton className="h-4 w-full mb-2" />
          <Skeleton className="h-4 w-5/6" />

          {/* Status */}
          <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
            <Skeleton className="h-5 w-20 rounded-full" />
          </div>
        </div>
      ))}
    </div>
  );
}
