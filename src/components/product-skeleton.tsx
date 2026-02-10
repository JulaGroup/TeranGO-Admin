import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

export function ProductCardSkeleton() {
  return (
    <Card>
      <CardContent className='space-y-3 p-4'>
        <Skeleton className='h-40 w-full rounded-lg' />
        <div className='flex items-start justify-between gap-4'>
          <div className='flex-1 space-y-2'>
            <Skeleton className='h-5 w-3/4' />
            <Skeleton className='h-4 w-full' />
            <Skeleton className='h-4 w-2/3' />
            <Skeleton className='h-4 w-1/2' />
            <Skeleton className='h-3 w-1/3' />
          </div>
          <Skeleton className='h-6 w-11 rounded-full' />
        </div>
        <div className='flex gap-2 pt-2'>
          <Skeleton className='h-9 flex-1' />
          <Skeleton className='h-9 flex-1' />
        </div>
      </CardContent>
    </Card>
  )
}

export function ProductsGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className='grid gap-4 md:grid-cols-2 lg:grid-cols-3'>
      {Array.from({ length: count }).map((_, i) => (
        <ProductCardSkeleton key={i} />
      ))}
    </div>
  )
}
