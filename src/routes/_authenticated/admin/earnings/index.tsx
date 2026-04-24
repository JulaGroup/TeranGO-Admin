import { createFileRoute } from '@tanstack/react-router'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { TopNav } from '@/components/layout/top-nav'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { ThemeSwitch } from '@/components/theme-switch'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { DollarSign, Users, ShoppingCart, TrendingUp } from 'lucide-react'

export const Route = createFileRoute('/_authenticated/admin/earnings/')({
  component: EarningsPage,
})

const topNav = [
    { title: 'Dashboard', href: '/admin', isActive: false },
    { title: 'Orders', href: '/admin/orders', isActive: false },
    { title: 'Vendors', href: '/admin/vendors', isActive: false },
    { title: 'Users', href: '/admin/users', isActive: false },
    { title: 'Earnings', href: '/admin/earnings', isActive: true },
    { title: 'Settings', href: '/admin/settings', isActive: false },
]

function EarningsPage() {
  // Placeholder data - replace with actual API calls
  const stats = {
    totalRevenue: 125430.50,
    serviceFees: 12543.05,
    deliveryCommission: 6271.53,
    totalPayouts: 106615.92,
  }

  return (
    <>
      <Header>
        <TopNav links={topNav} />
        <div className="ml-auto flex items-center space-x-4">
          <ThemeSwitch />
          <ProfileDropdown />
        </div>
      </Header>
      <Main>
        <div className="mb-6">
          <h1 className="text-3xl font-bold tracking-tight">Earnings Overview</h1>
          <p className="text-muted-foreground">
            Track your platform's financial performance.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total Revenue
              </CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">D{stats.totalRevenue.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">
                Total value of all successful orders
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Service Fees Collected
              </CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">D{stats.serviceFees.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">
                Your platform's commission from orders
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Delivery Commission
              </CardTitle>
              <ShoppingCart className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                D{stats.deliveryCommission.toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground">
                Your platform's cut from delivery fees
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Vendor & Driver Payouts
              </CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                D{stats.totalPayouts.toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground">
                Total amount paid out to partners
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Add more components here for charts and detailed tables */}
      </Main>
    </>
  )
}
