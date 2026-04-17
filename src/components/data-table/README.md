# Unified Data Table - Usage Guide

The `DataTable` component is a comprehensive, reusable table solution built on TanStack Table with industry-standard features.

## Features

- ✅ **Server-side ready**: Sorting, filtering, pagination
- ✅ **Advanced search**: Global and column-specific search
- ✅ **Faceted filters**: Multi-select filters with counts
- ✅ **Column visibility**: Show/hide columns
- ✅ **Bulk actions**: Select rows and perform batch operations
- ✅ **Export**: CSV and PDF export support
- ✅ **Loading states**: Skeleton screens during data fetch
- ✅ **Empty states**: Customizable empty state messages
- ✅ **Responsive**: Mobile-friendly design
- ✅ **Accessible**: Keyboard navigation and ARIA labels

## Basic Usage

```tsx
import { DataTable, DataTableColumnHeader } from '@/components/data-table'
import { type ColumnDef } from '@tanstack/react-table'
import { Badge } from '@/components/ui/badge'

// 1. Define your data type
type User = {
  id: string
  name: string
  email: string
  status: 'active' | 'inactive'
  role: string
}

// 2. Define columns
const columns: ColumnDef<User>[] = [
  {
    accessorKey: 'name',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Name" />
    ),
  },
  {
    accessorKey: 'email',
    header: 'Email',
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) => {
      const status = row.getValue('status') as string
      return (
        <Badge variant={status === 'active' ? 'default' : 'secondary'}>
          {status}
        </Badge>
      )
    },
    filterFn: (row, id, value) => {
      return value.includes(row.getValue(id))
    },
  },
]

// 3. Use the table
export function UsersTable() {
  const { data, isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: fetchUsers,
  })

  return (
    <DataTable
      columns={columns}
      data={data ?? []}
      isLoading={isLoading}
      searchKey="name"
      searchPlaceholder="Search users..."
    />
  )
}
```

## Advanced Features

### Faceted Filters

```tsx
const filters: DataTableFilter[] = [
  {
    columnId: 'status',
    title: 'Status',
    options: [
      { label: 'Active', value: 'active' },
      { label: 'Inactive', value: 'inactive' },
    ],
  },
  {
    columnId: 'role',
    title: 'Role',
    options: [
      { label: 'Admin', value: 'admin' },
      { label: 'User', value: 'user' },
      { label: 'Vendor', value: 'vendor' },
    ],
  },
]

<DataTable
  columns={columns}
  data={data}
  filters={filters}
/>
```

### Bulk Actions

```tsx
import { Trash2, Mail } from 'lucide-react'
import { Button } from '@/components/ui/button'

<DataTable
  columns={columns}
  data={data}
  enableBulkActions={true}
  bulkActionsEntityName="user"
  bulkActionsContent={(selectedRows) => (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => handleSendEmail(selectedRows)}
      >
        <Mail className="mr-2 h-4 w-4" />
        Send Email
      </Button>
      <Button
        variant="destructive"
        size="sm"
        onClick={() => handleDelete(selectedRows)}
      >
        <Trash2 className="mr-2 h-4 w-4" />
        Delete
      </Button>
    </>
  )}
/>
```

### Export Functionality

```tsx
// Custom CSV export
const handleExportCSV = (data: User[]) => {
  const csv = data.map(user => 
    `${user.name},${user.email},${user.status}`
  ).join('\n')
  // Download logic
}

// Custom PDF export
const handleExportPDF = (data: User[]) => {
  // Use jsPDF or similar
  const doc = new jsPDF()
  // Generate PDF
}

<DataTable
  columns={columns}
  data={data}
  enableExport={true}
  exportFileName="users-export"
  onExportCSV={handleExportCSV}
  onExportPDF={handleExportPDF}
/>
```

### Custom Empty State

```tsx
<DataTable
  columns={columns}
  data={data}
  emptyState={
    <div className="flex flex-col items-center gap-4">
      <Users className="h-12 w-12 text-muted-foreground" />
      <div className="text-center">
        <h3 className="font-semibold">No users found</h3>
        <p className="text-sm text-muted-foreground">
          Get started by creating your first user
        </p>
      </div>
      <Button>
        <Plus className="mr-2 h-4 w-4" />
        Add User
      </Button>
    </div>
  }
/>
```

### Selection Column

```tsx
import { Checkbox } from '@/components/ui/checkbox'

const columns: ColumnDef<User>[] = [
  {
    id: 'select',
    header: ({ table }) => (
      <Checkbox
        checked={
          table.getIsAllPageRowsSelected() ||
          (table.getIsSomePageRowsSelected() && 'indeterminate')
        }
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        aria-label="Select all"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        aria-label="Select row"
      />
    ),
    enableSorting: false,
    enableHiding: false,
  },
  // ... other columns
]
```

### Actions Column

```tsx
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { MoreHorizontal } from 'lucide-react'

const columns: ColumnDef<User>[] = [
  // ... other columns
  {
    id: 'actions',
    header: 'Actions',
    cell: ({ row }) => {
      const user = row.original

      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <span className="sr-only">Open menu</span>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Actions</DropdownMenuLabel>
            <DropdownMenuItem onClick={() => navigator.clipboard.writeText(user.id)}>
              Copy user ID
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => handleEdit(user)}>
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem 
              onClick={() => handleDelete(user)}
              className="text-destructive"
            >
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )
    },
  },
]
```

## Complete Example

```tsx
import { useState } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { DataTable, DataTableColumnHeader } from '@/components/data-table'
import { type ColumnDef } from '@tanstack/react-table'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { Trash2, Mail, Users, Plus } from 'lucide-react'

type User = {
  id: string
  name: string
  email: string
  status: 'active' | 'inactive' | 'pending'
  role: 'admin' | 'user' | 'vendor'
  createdAt: string
}

export function UsersPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: () => fetch('/api/admin/users').then(res => res.json()),
  })

  const deleteMutation = useMutation({
    mutationFn: (ids: string[]) => 
      fetch('/api/admin/users/bulk-delete', {
        method: 'DELETE',
        body: JSON.stringify({ ids }),
      }),
    onSuccess: () => {
      toast.success('Users deleted successfully')
      queryClient.invalidateQueries({ queryKey: ['users'] })
    },
  })

  const columns: ColumnDef<User>[] = [
    {
      id: 'select',
      header: ({ table }) => (
        <Checkbox
          checked={
            table.getIsAllPageRowsSelected() ||
            (table.getIsSomePageRowsSelected() && 'indeterminate')
          }
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
        />
      ),
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: 'name',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Name" />
      ),
    },
    {
      accessorKey: 'email',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Email" />
      ),
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => {
        const status = row.getValue('status') as string
        const variant = status === 'active' ? 'default' : 
                       status === 'pending' ? 'secondary' : 'outline'
        return <Badge variant={variant}>{status}</Badge>
      },
      filterFn: (row, id, value) => value.includes(row.getValue(id)),
    },
    {
      accessorKey: 'role',
      header: 'Role',
      filterFn: (row, id, value) => value.includes(row.getValue(id)),
    },
  ]

  const filters = [
    {
      columnId: 'status',
      title: 'Status',
      options: [
        { label: 'Active', value: 'active' },
        { label: 'Inactive', value: 'inactive' },
        { label: 'Pending', value: 'pending' },
      ],
    },
    {
      columnId: 'role',
      title: 'Role',
      options: [
        { label: 'Admin', value: 'admin' },
        { label: 'User', value: 'user' },
        { label: 'Vendor', value: 'vendor' },
      ],
    },
  ]

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold">Users</h2>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Add User
        </Button>
      </div>

      <DataTable
        columns={columns}
        data={data?.users ?? []}
        isLoading={isLoading}
        searchKey="name"
        searchPlaceholder="Search users..."
        filters={filters}
        enableBulkActions={true}
        bulkActionsEntityName="user"
        bulkActionsContent={(selectedRows) => (
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                toast.success(`Email sent to ${selectedRows.length} users`)
              }}
            >
              <Mail className="mr-2 h-4 w-4" />
              Send Email
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => {
                deleteMutation.mutate(selectedRows.map(r => r.id))
              }}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </Button>
          </>
        )}
        enableExport={true}
        exportFileName="users"
        emptyState={
          <div className="flex flex-col items-center gap-4 py-8">
            <Users className="h-12 w-12 text-muted-foreground" />
            <div className="text-center">
              <h3 className="font-semibold text-lg">No users found</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Get started by creating your first user
              </p>
            </div>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add User
            </Button>
          </div>
        }
        pageSize={20}
      />
    </div>
  )
}
```

## Props Reference

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `columns` | `ColumnDef<TData>[]` | **required** | Column definitions |
| `data` | `TData[]` | **required** | Table data |
| `searchKey` | `string` | - | Column key for search input |
| `searchPlaceholder` | `string` | `"Filter..."` | Search input placeholder |
| `filters` | `DataTableFilter[]` | `[]` | Faceted filter configuration |
| `isLoading` | `boolean` | `false` | Show loading skeletons |
| `loadingRowCount` | `number` | `5` | Number of skeleton rows |
| `emptyState` | `ReactNode` | Default | Custom empty state |
| `enableBulkActions` | `boolean` | `false` | Enable row selection |
| `bulkActionsEntityName` | `string` | `"item"` | Entity name for bulk actions |
| `bulkActionsContent` | `(rows: TData[]) => ReactNode` | - | Bulk action buttons |
| `enableExport` | `boolean` | `false` | Show export button |
| `exportFileName` | `string` | `"export"` | Export file name |
| `onExportCSV` | `(data: TData[]) => void` | Auto | Custom CSV export |
| `onExportPDF` | `(data: TData[]) => void` | - | Custom PDF export |
| `pageSize` | `number` | `10` | Initial page size |
| `showPagination` | `boolean` | `true` | Show pagination |
| `showToolbar` | `boolean` | `true` | Show toolbar |
| `className` | `string` | - | Table className |
| `containerClassName` | `string` | - | Container className |

## Migration from Old Tables

### Before (Manual Table)

```tsx
export function OldUsersTable() {
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  
  return (
    <>
      <Input 
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search..."
      />
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Email</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filteredData.map(user => (
            <TableRow key={user.id}>
              <TableCell>{user.name}</TableCell>
              <TableCell>{user.email}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </>
  )
}
```

### After (Unified Data Table)

```tsx
export function NewUsersTable() {
  const columns: ColumnDef<User>[] = [
    {
      accessorKey: 'name',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Name" />
      ),
    },
    {
      accessorKey: 'email',
      header: 'Email',
    },
  ]

  return (
    <DataTable
      columns={columns}
      data={data}
      searchKey="name"
      searchPlaceholder="Search users..."
    />
  )
}
```

**Benefits:**
- ✅ Built-in sorting, filtering, pagination
- ✅ Loading and empty states
- ✅ Responsive design
- ✅ Accessibility features
- ✅ Less code to maintain
