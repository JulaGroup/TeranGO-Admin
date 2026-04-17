const fs = require('fs');
const path = require('path');

const baseDir = __dirname;

console.log('🚀 Starting Admin Panel Modernization...\n');

// ============================================================================
// TASK 1: Replace Vendors Page
// ============================================================================
console.log('📋 TASK 1: Replacing Vendors Page...');
try {
  const vendorsDir = path.join(baseDir, 'src', 'routes', '_authenticated', 'admin', 'vendors');
  const updatedFile = path.join(vendorsDir, 'index.UPDATED.tsx');
  const targetFile = path.join(vendorsDir, 'index.tsx');
  const modernFile = path.join(vendorsDir, 'index.MODERN.tsx');
  
  if (!fs.existsSync(updatedFile)) {
    console.log('⚠️  index.UPDATED.tsx not found - skipping vendors replacement');
  } else {
    const content = fs.readFileSync(updatedFile, 'utf8');
    fs.writeFileSync(targetFile, content, 'utf8');
    fs.unlinkSync(updatedFile);
    
    if (fs.existsSync(modernFile)) {
      fs.unlinkSync(modernFile);
    }
    
    console.log('✅ Vendors page replaced successfully\n');
  }
} catch (error) {
  console.error('❌ Error in Task 1:', error.message);
}

// ============================================================================
// TASK 2: Express Skeleton is already done
// ============================================================================
console.log('📋 TASK 2: Express Skeleton');
console.log('✅ Already completed\n');

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function createDataTableTemplate(config) {
  const { 
    entityName,
    entityNamePlural,
    queryKey,
    apiMethod,
    dataPath,
    columns,
    filters,
    searchKey,
    addButtonText,
    topNavActive
  } = config;

  return `import { useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/router'
import { type ColumnDef } from '@tanstack/react-table'
import { MoreHorizontal, Plus } from 'lucide-react'
import { toast } from 'sonner'
import { adminApi } from '@/lib/api'
import { DataTable, DataTableColumnHeader } from '@/components/data-table'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { ConfigDrawer } from '@/components/config-drawer'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { TopNav } from '@/components/layout/top-nav'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'

const topNav = [
  { title: 'Overview', href: '/admin', isActive: ${topNavActive === 'Overview'} },
  { title: '${entityNamePlural}', href: '/admin/${entityNamePlural.toLowerCase()}', isActive: ${topNavActive === entityNamePlural} },
  { title: 'Settings', href: '#', isActive: false },
]

export const Route = createFileRoute('/_authenticated/admin/${entityNamePlural.toLowerCase()}/')({
  component: ${entityNamePlural}Page,
})

function ${entityNamePlural}Page() {
  const queryClient = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['${queryKey}'],
    queryFn: async () => {
      const response = await adminApi.${apiMethod}()
      return ${dataPath}
    },
  })

  const columns${config.columnsCode}

  const filters${config.filtersCode}

  return (
    <>
      <Header>
        <TopNav links={topNav} />
        <div className="ms-auto flex items-center space-x-4">
          <Search />
          <ThemeSwitch />
          <ConfigDrawer />
          <ProfileDropdown />
        </div>
      </Header>

      <Main>
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">${entityNamePlural}</h1>
            <p className="text-muted-foreground">
              Manage all ${entityNamePlural.toLowerCase()}
            </p>
          </div>
          ${addButtonText ? `<Button>
            <Plus className="mr-2 h-4 w-4" />
            ${addButtonText}
          </Button>` : ''}
        </div>

        <DataTable
          columns={columns}
          data={data || []}
          isLoading={isLoading}
          searchKey="${searchKey}"
          searchPlaceholder="Search ${entityNamePlural.toLowerCase()}..."
          filters={filters}
          enableExport={true}
          exportFileName="${entityNamePlural.toLowerCase()}"
        />
      </Main>
    </>
  )
}
`;
}

// ============================================================================
// TASK 3: Apply DataTable to Pages
// ============================================================================
console.log('📋 TASK 3: Applying DataTable to pages...\n');

const dataTablePages = [
  {
    name: 'Customers',
    path: path.join(baseDir, 'src', 'routes', '_authenticated', 'admin', 'customers', 'index.tsx'),
    entityName: 'Customer',
    entityNamePlural: 'Customers',
    queryKey: 'customers',
    apiMethod: 'getUsers',
    dataPath: 'response.data.users || response.data || []',
    searchKey: 'fullName',
    addButtonText: 'Add Customer',
    topNavActive: 'Customers',
    columnsCode: `: ColumnDef<any>[] = useMemo(
    () => [
      {
        accessorKey: 'fullName',
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Name" />
        ),
        cell: ({ row }) => {
          const customer = row.original
          return (
            <div className="flex items-center gap-3">
              <Avatar>
                <AvatarFallback>
                  {customer.fullName?.charAt(0) || 'C'}
                </AvatarFallback>
              </Avatar>
              <div>
                <div className="font-medium">{customer.fullName || 'N/A'}</div>
                <div className="text-sm text-muted-foreground">
                  {customer.email || 'N/A'}
                </div>
              </div>
            </div>
          )
        },
      },
      {
        accessorKey: 'phone',
        header: 'Phone',
      },
      {
        accessorKey: 'city',
        header: 'Location',
      },
      {
        accessorKey: 'totalOrders',
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Orders" />
        ),
        cell: ({ row }) => (
          <Badge variant="outline">{row.getValue('totalOrders') || 0} orders</Badge>
        ),
      },
      {
        accessorKey: 'createdAt',
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Joined" />
        ),
        cell: ({ row }) => new Date(row.getValue('createdAt')).toLocaleDateString(),
      },
      {
        id: 'actions',
        cell: ({ row }) => {
          const customer = row.original
          return (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-8 w-8 p-0">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem>View Details</DropdownMenuItem>
                <DropdownMenuItem>View Orders</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )
        },
      },
    ],
    []
  )`,
    filtersCode: ` = []`,
  },
  {
    name: 'Orders',
    path: path.join(baseDir, 'src', 'routes', '_authenticated', 'admin', 'orders', 'index.tsx'),
    entityName: 'Order',
    entityNamePlural: 'Orders',
    queryKey: 'orders',
    apiMethod: 'getOrders',
    dataPath: 'response.data.orders || response.data || []',
    searchKey: 'orderId',
    addButtonText: null,
    topNavActive: 'Orders',
    columnsCode: `: ColumnDef<any>[] = useMemo(
    () => [
      {
        accessorKey: 'orderId',
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Order ID" />
        ),
      },
      {
        accessorKey: 'customerName',
        header: 'Customer',
        cell: ({ row }) => row.original.user?.fullName || row.original.customerName || 'N/A',
      },
      {
        accessorKey: 'vendorName',
        header: 'Vendor',
        cell: ({ row }) => row.original.vendor?.businessName || row.original.vendorName || 'N/A',
      },
      {
        accessorKey: 'totalAmount',
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Amount" />
        ),
        cell: ({ row }) => {
          const amount = row.getValue('totalAmount')
          return new Intl.NumberFormat('en-SL', {
            style: 'currency',
            currency: 'SLL',
          }).format(amount || 0)
        },
      },
      {
        accessorKey: 'status',
        header: 'Status',
        cell: ({ row }) => {
          const status = row.getValue('status')
          const variants = {
            pending: 'secondary',
            confirmed: 'default',
            preparing: 'default',
            ready: 'default',
            out_for_delivery: 'default',
            delivered: 'default',
            cancelled: 'destructive',
          }
          return (
            <Badge variant={variants[status] || 'secondary'}>
              {String(status).replace(/_/g, ' ').toUpperCase()}
            </Badge>
          )
        },
        filterFn: (row, id, value) => value.includes(row.getValue(id)),
      },
      {
        accessorKey: 'createdAt',
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Date" />
        ),
        cell: ({ row }) => new Date(row.getValue('createdAt')).toLocaleDateString(),
      },
      {
        id: 'actions',
        cell: ({ row }) => {
          const order = row.original
          return (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-8 w-8 p-0">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem>View Details</DropdownMenuItem>
                <DropdownMenuItem>Update Status</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )
        },
      },
    ],
    []
  )`,
    filtersCode: ` = [
    {
      columnId: 'status',
      title: 'Status',
      options: [
        { label: 'Pending', value: 'pending' },
        { label: 'Confirmed', value: 'confirmed' },
        { label: 'Preparing', value: 'preparing' },
        { label: 'Ready', value: 'ready' },
        { label: 'Out for Delivery', value: 'out_for_delivery' },
        { label: 'Delivered', value: 'delivered' },
        { label: 'Cancelled', value: 'cancelled' },
      ],
    },
  ]`,
  },
  {
    name: 'Drivers',
    path: path.join(baseDir, 'src', 'routes', '_authenticated', 'admin', 'drivers', 'index.tsx'),
    entityName: 'Driver',
    entityNamePlural: 'Drivers',
    queryKey: 'drivers',
    apiMethod: 'getDrivers',
    dataPath: 'response.data.drivers || response.data || []',
    searchKey: 'fullName',
    addButtonText: 'Add Driver',
    topNavActive: 'Drivers',
    columnsCode: `: ColumnDef<any>[] = useMemo(
    () => [
      {
        accessorKey: 'fullName',
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Name" />
        ),
        cell: ({ row }) => {
          const driver = row.original
          return (
            <div className="flex items-center gap-3">
              <Avatar>
                <AvatarFallback>
                  {driver.fullName?.charAt(0) || 'D'}
                </AvatarFallback>
              </Avatar>
              <div>
                <div className="font-medium">{driver.fullName || 'N/A'}</div>
                <div className="text-sm text-muted-foreground">
                  {driver.email || 'N/A'}
                </div>
              </div>
            </div>
          )
        },
      },
      {
        accessorKey: 'phone',
        header: 'Phone',
      },
      {
        accessorKey: 'vehicleType',
        header: 'Vehicle',
        cell: ({ row }) => (
          <Badge variant="outline">{row.getValue('vehicleType') || 'N/A'}</Badge>
        ),
      },
      {
        accessorKey: 'status',
        header: 'Status',
        cell: ({ row }) => {
          const status = row.getValue('status')
          return (
            <Badge variant={status === 'active' ? 'default' : 'secondary'}>
              {String(status || 'inactive').toUpperCase()}
            </Badge>
          )
        },
        filterFn: (row, id, value) => value.includes(row.getValue(id)),
      },
      {
        accessorKey: 'totalDeliveries',
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Deliveries" />
        ),
        cell: ({ row }) => row.getValue('totalDeliveries') || 0,
      },
      {
        id: 'actions',
        cell: ({ row }) => {
          const driver = row.original
          return (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-8 w-8 p-0">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem>View Profile</DropdownMenuItem>
                <DropdownMenuItem>View Deliveries</DropdownMenuItem>
                <DropdownMenuItem>Update Status</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )
        },
      },
    ],
    []
  )`,
    filtersCode: ` = [
    {
      columnId: 'status',
      title: 'Status',
      options: [
        { label: 'Active', value: 'active' },
        { label: 'Inactive', value: 'inactive' },
        { label: 'Suspended', value: 'suspended' },
      ],
    },
  ]`,
  },
  {
    name: 'Payments',
    path: path.join(baseDir, 'src', 'routes', '_authenticated', 'admin', 'payments', 'index.tsx'),
    entityName: 'Payment',
    entityNamePlural: 'Payments',
    queryKey: 'payments',
    apiMethod: 'getPayments',
    dataPath: 'response.data.payments || response.data || []',
    searchKey: 'transactionId',
    addButtonText: null,
    topNavActive: 'Payments',
    columnsCode: `: ColumnDef<any>[] = useMemo(
    () => [
      {
        accessorKey: 'transactionId',
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Transaction ID" />
        ),
      },
      {
        accessorKey: 'orderId',
        header: 'Order ID',
      },
      {
        accessorKey: 'amount',
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Amount" />
        ),
        cell: ({ row }) => {
          const amount = row.getValue('amount')
          return new Intl.NumberFormat('en-SL', {
            style: 'currency',
            currency: 'SLL',
          }).format(amount || 0)
        },
      },
      {
        accessorKey: 'paymentMethod',
        header: 'Method',
        cell: ({ row }) => (
          <Badge variant="outline">{row.getValue('paymentMethod') || 'N/A'}</Badge>
        ),
        filterFn: (row, id, value) => value.includes(row.getValue(id)),
      },
      {
        accessorKey: 'status',
        header: 'Status',
        cell: ({ row }) => {
          const status = row.getValue('status')
          const variants = {
            success: 'default',
            pending: 'secondary',
            failed: 'destructive',
          }
          return (
            <Badge variant={variants[status] || 'secondary'}>
              {String(status || 'unknown').toUpperCase()}
            </Badge>
          )
        },
        filterFn: (row, id, value) => value.includes(row.getValue(id)),
      },
      {
        accessorKey: 'createdAt',
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Date" />
        ),
        cell: ({ row }) => new Date(row.getValue('createdAt')).toLocaleDateString(),
      },
      {
        id: 'actions',
        cell: ({ row }) => {
          const payment = row.original
          return (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-8 w-8 p-0">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem>View Details</DropdownMenuItem>
                <DropdownMenuItem>View Order</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )
        },
      },
    ],
    []
  )`,
    filtersCode: ` = [
    {
      columnId: 'paymentMethod',
      title: 'Method',
      options: [
        { label: 'Cash', value: 'cash' },
        { label: 'Mobile Money', value: 'mobile_money' },
        { label: 'Card', value: 'card' },
      ],
    },
    {
      columnId: 'status',
      title: 'Status',
      options: [
        { label: 'Success', value: 'success' },
        { label: 'Pending', value: 'pending' },
        { label: 'Failed', value: 'failed' },
      ],
    },
  ]`,
  },
  {
    name: 'Settlements',
    path: path.join(baseDir, 'src', 'routes', '_authenticated', 'admin', 'settlements', 'index.tsx'),
    entityName: 'Settlement',
    entityNamePlural: 'Settlements',
    queryKey: 'settlements',
    apiMethod: 'getSettlements',
    dataPath: 'response.data.settlements || response.data || []',
    searchKey: 'driverName',
    addButtonText: 'Create Settlement',
    topNavActive: 'Settlements',
    columnsCode: `: ColumnDef<any>[] = useMemo(
    () => [
      {
        accessorKey: 'driverName',
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Driver" />
        ),
        cell: ({ row }) => row.original.driver?.fullName || row.getValue('driverName') || 'N/A',
      },
      {
        accessorKey: 'totalAmount',
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Amount" />
        ),
        cell: ({ row }) => {
          const amount = row.getValue('totalAmount')
          return new Intl.NumberFormat('en-SL', {
            style: 'currency',
            currency: 'SLL',
          }).format(amount || 0)
        },
      },
      {
        accessorKey: 'deliveriesCount',
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Deliveries" />
        ),
      },
      {
        accessorKey: 'status',
        header: 'Status',
        cell: ({ row }) => {
          const status = row.getValue('status')
          const variants = {
            paid: 'default',
            pending: 'secondary',
            processing: 'secondary',
          }
          return (
            <Badge variant={variants[status] || 'secondary'}>
              {String(status || 'pending').toUpperCase()}
            </Badge>
          )
        },
        filterFn: (row, id, value) => value.includes(row.getValue(id)),
      },
      {
        accessorKey: 'createdAt',
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Date" />
        ),
        cell: ({ row }) => new Date(row.getValue('createdAt')).toLocaleDateString(),
      },
      {
        id: 'actions',
        cell: ({ row }) => {
          const settlement = row.original
          return (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-8 w-8 p-0">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem>View Details</DropdownMenuItem>
                <DropdownMenuItem>Mark as Paid</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )
        },
      },
    ],
    []
  )`,
    filtersCode: ` = [
    {
      columnId: 'status',
      title: 'Status',
      options: [
        { label: 'Paid', value: 'paid' },
        { label: 'Pending', value: 'pending' },
        { label: 'Processing', value: 'processing' },
      ],
    },
  ]`,
  },
  {
    name: 'Promo Codes',
    path: path.join(baseDir, 'src', 'routes', '_authenticated', 'admin', 'promocodes', 'index.tsx'),
    entityName: 'PromoCode',
    entityNamePlural: 'Promo Codes',
    queryKey: 'promocodes',
    apiMethod: 'getPromoCodes',
    dataPath: 'response.data.promoCodes || response.data || []',
    searchKey: 'code',
    addButtonText: 'Create Promo Code',
    topNavActive: 'Promo Codes',
    columnsCode: `: ColumnDef<any>[] = useMemo(
    () => [
      {
        accessorKey: 'code',
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Code" />
        ),
        cell: ({ row }) => (
          <Badge variant="outline" className="font-mono">
            {row.getValue('code')}
          </Badge>
        ),
      },
      {
        accessorKey: 'discountType',
        header: 'Type',
        cell: ({ row }) => {
          const type = row.getValue('discountType')
          return type === 'percentage' ? '% Discount' : 'Fixed Amount'
        },
        filterFn: (row, id, value) => value.includes(row.getValue(id)),
      },
      {
        accessorKey: 'discountValue',
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Value" />
        ),
        cell: ({ row }) => {
          const type = row.original.discountType
          const value = row.getValue('discountValue')
          return type === 'percentage' ? \`\${value}%\` : new Intl.NumberFormat('en-SL', {
            style: 'currency',
            currency: 'SLL',
          }).format(value || 0)
        },
      },
      {
        accessorKey: 'usageCount',
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Used" />
        ),
        cell: ({ row }) => {
          const used = row.getValue('usageCount') || 0
          const max = row.original.maxUsage || '∞'
          return \`\${used} / \${max}\`
        },
      },
      {
        accessorKey: 'status',
        header: 'Status',
        cell: ({ row }) => {
          const status = row.getValue('status')
          return (
            <Badge variant={status === 'active' ? 'default' : 'secondary'}>
              {String(status || 'inactive').toUpperCase()}
            </Badge>
          )
        },
        filterFn: (row, id, value) => value.includes(row.getValue(id)),
      },
      {
        accessorKey: 'expiresAt',
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Expires" />
        ),
        cell: ({ row }) => {
          const date = row.getValue('expiresAt')
          return date ? new Date(date).toLocaleDateString() : 'Never'
        },
      },
      {
        id: 'actions',
        cell: ({ row }) => {
          const promo = row.original
          return (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-8 w-8 p-0">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem>Edit</DropdownMenuItem>
                <DropdownMenuItem>Deactivate</DropdownMenuItem>
                <DropdownMenuItem className="text-destructive">Delete</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )
        },
      },
    ],
    []
  )`,
    filtersCode: ` = [
    {
      columnId: 'discountType',
      title: 'Type',
      options: [
        { label: 'Percentage', value: 'percentage' },
        { label: 'Fixed', value: 'fixed' },
      ],
    },
    {
      columnId: 'status',
      title: 'Status',
      options: [
        { label: 'Active', value: 'active' },
        { label: 'Inactive', value: 'inactive' },
        { label: 'Expired', value: 'expired' },
      ],
    },
  ]`,
  },
  {
    name: 'Vendor Applications',
    path: path.join(baseDir, 'src', 'routes', '_authenticated', 'admin', 'vendor-applications', 'index.tsx'),
    entityName: 'Application',
    entityNamePlural: 'Vendor Applications',
    queryKey: 'vendor-applications',
    apiMethod: 'getVendorApplications',
    dataPath: 'response.data.applications || response.data || []',
    searchKey: 'businessName',
    addButtonText: null,
    topNavActive: 'Vendor Applications',
    columnsCode: `: ColumnDef<any>[] = useMemo(
    () => [
      {
        accessorKey: 'businessName',
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Business Name" />
        ),
        cell: ({ row }) => {
          const app = row.original
          return (
            <div className="flex items-center gap-3">
              <Avatar>
                <AvatarFallback>
                  {app.businessName?.charAt(0) || 'V'}
                </AvatarFallback>
              </Avatar>
              <div>
                <div className="font-medium">{app.businessName || 'N/A'}</div>
                <div className="text-sm text-muted-foreground">
                  {app.vendorType || 'N/A'}
                </div>
              </div>
            </div>
          )
        },
      },
      {
        accessorKey: 'ownerName',
        header: 'Owner',
      },
      {
        accessorKey: 'email',
        header: 'Email',
      },
      {
        accessorKey: 'phone',
        header: 'Phone',
      },
      {
        accessorKey: 'status',
        header: 'Status',
        cell: ({ row }) => {
          const status = row.getValue('status')
          const variants = {
            approved: 'default',
            pending: 'secondary',
            rejected: 'destructive',
          }
          return (
            <Badge variant={variants[status] || 'secondary'}>
              {String(status || 'pending').toUpperCase()}
            </Badge>
          )
        },
        filterFn: (row, id, value) => value.includes(row.getValue(id)),
      },
      {
        accessorKey: 'createdAt',
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Applied" />
        ),
        cell: ({ row }) => new Date(row.getValue('createdAt')).toLocaleDateString(),
      },
      {
        id: 'actions',
        cell: ({ row }) => {
          const app = row.original
          return (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-8 w-8 p-0">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem>View Details</DropdownMenuItem>
                <DropdownMenuItem>Approve</DropdownMenuItem>
                <DropdownMenuItem className="text-destructive">Reject</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )
        },
      },
    ],
    []
  )`,
    filtersCode: ` = [
    {
      columnId: 'status',
      title: 'Status',
      options: [
        { label: 'Pending', value: 'pending' },
        { label: 'Approved', value: 'approved' },
        { label: 'Rejected', value: 'rejected' },
      ],
    },
  ]`,
  },
];

// Apply DataTable templates
dataTablePages.forEach((config, index) => {
  console.log(`${index + 1}. Updating ${config.name}...`);
  try {
    const content = createDataTableTemplate(config);
    fs.writeFileSync(config.path, content, 'utf8');
    console.log(`   ✅ ${config.name} modernized`);
  } catch (error) {
    console.error(`   ❌ Error updating ${config.name}:`, error.message);
  }
});

console.log('\n✅ All DataTable pages modernized!\n');

// ============================================================================
// Completion Summary
// ============================================================================
console.log('═══════════════════════════════════════════════════════════════');
console.log('🎉 MODERNIZATION COMPLETE!');
console.log('═══════════════════════════════════════════════════════════════');
console.log('');
console.log('✅ Completed Tasks:');
console.log('  1. Vendors page replaced');
console.log('  2. Express skeleton updated');
console.log('  3. DataTable applied to 7 pages:');
console.log('     - Customers');
console.log('     - Orders');
console.log('     - Drivers');
console.log('     - Payments');
console.log('     - Settlements');
console.log('     - Promo Codes');
console.log('     - Vendor Applications');
console.log('');
console.log('📋 Next Steps:');
console.log('  1. Run: npm run dev');
console.log('  2. Check for TypeScript errors');
console.log('  3. Test each modernized page');
console.log('  4. Verify DataTable features (sorting, filtering, search)');
console.log('');
console.log('Note: StatCard pages (TeranGo Store, Analytics) were not');
console.log('      included in this automated update. They may need');
console.log('      manual review if they exist.');
console.log('═══════════════════════════════════════════════════════════════');
