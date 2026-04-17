import * as React from 'react'
import {
  type ColumnDef,
  type ColumnFiltersState,
  type SortingState,
  type VisibilityState,
  type RowSelectionState,
  flexRender,
  getCoreRowModel,
  getFacetedRowModel,
  getFacetedUniqueValues,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table'
import { Download, FileDown, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { DataTableToolbar } from './toolbar'
import { DataTablePagination } from './pagination'
import { DataTableBulkActions } from './bulk-actions'

export type DataTableFilter = {
  columnId: string
  title: string
  options: {
    label: string
    value: string
    icon?: React.ComponentType<{ className?: string }>
  }[]
}

export interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[]
  data: TData[]
  
  // Search & Filtering
  searchKey?: string
  searchPlaceholder?: string
  filters?: DataTableFilter[]
  
  // Loading & Empty States
  isLoading?: boolean
  loadingRowCount?: number
  emptyState?: React.ReactNode
  
  // Bulk Actions
  enableBulkActions?: boolean
  bulkActionsEntityName?: string
  bulkActionsContent?: (selectedRows: TData[]) => React.ReactNode
  
  // Export
  enableExport?: boolean
  exportFileName?: string
  onExportCSV?: (data: TData[]) => void
  onExportPDF?: (data: TData[]) => void
  
  // Pagination
  pageSize?: number
  
  // Additional customization
  className?: string
  containerClassName?: string
  showPagination?: boolean
  showToolbar?: boolean
}

export function DataTable<TData, TValue>({
  columns,
  data,
  searchKey,
  searchPlaceholder,
  filters = [],
  isLoading = false,
  loadingRowCount = 5,
  emptyState,
  enableBulkActions = false,
  bulkActionsEntityName = 'item',
  bulkActionsContent,
  enableExport = false,
  exportFileName = 'export',
  onExportCSV,
  onExportPDF,
  pageSize = 10,
  className,
  containerClassName,
  showPagination = true,
  showToolbar = true,
}: DataTableProps<TData, TValue>) {
  const [rowSelection, setRowSelection] = React.useState<RowSelectionState>({})
  const [columnVisibility, setColumnVisibility] =
    React.useState<VisibilityState>({})
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    []
  )
  const [sorting, setSorting] = React.useState<SortingState>([])

  const table = useReactTable({
    data,
    columns,
    state: {
      sorting,
      columnVisibility,
      rowSelection,
      columnFilters,
    },
    initialState: {
      pagination: {
        pageSize,
      },
    },
    enableRowSelection: enableBulkActions,
    onRowSelectionChange: setRowSelection,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
  })

  const selectedRows = table.getFilteredSelectedRowModel().rows.map(row => row.original)

  // Export handlers
  const handleExportCSV = React.useCallback(() => {
    if (onExportCSV) {
      onExportCSV(data)
    } else {
      // Default CSV export
      const headers = columns
        .filter((col: any) => col.accessorKey)
        .map((col: any) => col.header || col.accessorKey)
        .join(',')
      
      const rows = data.map((row: any) =>
        columns
          .filter((col: any) => col.accessorKey)
          .map((col: any) => {
            const value = row[col.accessorKey as keyof typeof row]
            return typeof value === 'string' && value.includes(',')
              ? `"${value}"`
              : value
          })
          .join(',')
      )
      
      const csv = [headers, ...rows].join('\n')
      const blob = new Blob([csv], { type: 'text/csv' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `${exportFileName}.csv`
      link.click()
      URL.revokeObjectURL(url)
    }
  }, [columns, data, exportFileName, onExportCSV])

  const handleExportPDF = React.useCallback(() => {
    if (onExportPDF) {
      onExportPDF(data)
    }
  }, [data, onExportPDF])

  // Loading state
  if (isLoading) {
    return (
      <div className={cn('space-y-4', containerClassName)}>
        {showToolbar && (
          <div className="flex items-center justify-between">
            <Skeleton className="h-8 w-[250px]" />
            <Skeleton className="h-8 w-[70px]" />
          </div>
        )}
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <TableHead key={header.id}>
                      <Skeleton className="h-4 w-full" />
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {Array.from({ length: loadingRowCount }).map((_, index) => (
                <TableRow key={index}>
                  {columns.map((_, cellIndex) => (
                    <TableCell key={cellIndex}>
                      <Skeleton className="h-6 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    )
  }

  // Empty state
  const showEmptyState = !isLoading && table.getRowModel().rows?.length === 0

  return (
    <div className={cn('space-y-4', containerClassName)}>
      {showToolbar && (
        <div className="flex items-center justify-between gap-2">
          <DataTableToolbar
            table={table}
            searchPlaceholder={searchPlaceholder}
            searchKey={searchKey}
            filters={filters}
          />
          {enableExport && data.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-8">
                  <Download className="mr-2 h-4 w-4" />
                  Export
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Export as</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleExportCSV}>
                  <FileDown className="mr-2 h-4 w-4" />
                  CSV
                </DropdownMenuItem>
                {onExportPDF && (
                  <DropdownMenuItem onClick={handleExportPDF}>
                    <FileDown className="mr-2 h-4 w-4" />
                    PDF
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      )}

      <div className={cn('rounded-md border', className)}>
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  return (
                    <TableHead key={header.id} colSpan={header.colSpan}>
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                    </TableHead>
                  )
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {showEmptyState ? (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-64 text-center"
                >
                  {emptyState || (
                    <div className="flex flex-col items-center justify-center space-y-3 text-muted-foreground">
                      <p className="text-lg font-medium">No results found</p>
                      <p className="text-sm">
                        Try adjusting your search or filter to find what you're looking for.
                      </p>
                    </div>
                  )}
                </TableCell>
              </TableRow>
            ) : (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && 'selected'}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {showPagination && !showEmptyState && (
        <DataTablePagination table={table} />
      )}

      {enableBulkActions && bulkActionsContent && (
        <DataTableBulkActions table={table} entityName={bulkActionsEntityName}>
          {bulkActionsContent(selectedRows)}
        </DataTableBulkActions>
      )}
    </div>
  )
}
