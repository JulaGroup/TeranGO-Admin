import { createFileRoute } from '@tanstack/react-router'
import {
  BarChart3,
  TrendingUp,
  PieChart,
  Activity,
  Calendar,
  Clock,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ConfigDrawer } from '@/components/config-drawer'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { TopNav } from '@/components/layout/top-nav'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Search as SearchInput } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'

const topNav = [
  { title: 'Overview', href: '/', isActive: false },
  { title: 'Analytics', href: '/analytics', isActive: true },
  { title: 'Reports', href: '/reports', isActive: false },
  { title: 'Settings', href: '#', isActive: false },
]

export const Route = createFileRoute('/_authenticated/analytics/')({
  component: AnalyticsPage,
})

function AnalyticsPage() {
  return (
    <>
      <Header>
        <TopNav links={topNav} />
        <div className='ms-auto flex items-center space-x-4'>
          <SearchInput />
          <ThemeSwitch />
          <ConfigDrawer />
          <ProfileDropdown />
        </div>
      </Header>

      <Main>
        <div className='space-y-6'>
          {/* Header */}
          <div className='flex flex-col gap-4 md:flex-row md:items-center md:justify-between'>
            <div>
              <h1 className='text-3xl font-bold tracking-tight'>Analytics</h1>
              <p className='text-muted-foreground'>
                Advanced analytics and insights for your business
              </p>
            </div>
            <Badge variant='secondary' className='w-fit'>
              <Clock className='mr-1 h-3 w-3' />
              Coming Soon
            </Badge>
          </div>

          {/* Coming Soon Cards */}
          <div className='grid gap-6 md:grid-cols-2 lg:grid-cols-3'>
            <Card className='relative overflow-hidden'>
              <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
                <CardTitle className='text-sm font-medium'>
                  Revenue Analytics
                </CardTitle>
                <BarChart3 className='text-muted-foreground h-4 w-4' />
              </CardHeader>
              <CardContent>
                <div className='flex items-center justify-center py-8'>
                  <div className='text-center'>
                    <TrendingUp className='text-muted-foreground mx-auto h-12 w-12 opacity-50' />
                    <p className='text-muted-foreground mt-2 text-sm'>
                      Revenue trends and forecasts
                    </p>
                  </div>
                </div>
                <div className='to-muted/10 absolute inset-0 bg-gradient-to-br from-transparent via-transparent' />
              </CardContent>
            </Card>

            <Card className='relative overflow-hidden'>
              <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
                <CardTitle className='text-sm font-medium'>
                  Customer Insights
                </CardTitle>
                <PieChart className='text-muted-foreground h-4 w-4' />
              </CardHeader>
              <CardContent>
                <div className='flex items-center justify-center py-8'>
                  <div className='text-center'>
                    <Activity className='text-muted-foreground mx-auto h-12 w-12 opacity-50' />
                    <p className='text-muted-foreground mt-2 text-sm'>
                      Customer behavior analysis
                    </p>
                  </div>
                </div>
                <div className='to-muted/10 absolute inset-0 bg-gradient-to-br from-transparent via-transparent' />
              </CardContent>
            </Card>

            <Card className='relative overflow-hidden'>
              <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
                <CardTitle className='text-sm font-medium'>
                  Performance Metrics
                </CardTitle>
                <Activity className='text-muted-foreground h-4 w-4' />
              </CardHeader>
              <CardContent>
                <div className='flex items-center justify-center py-8'>
                  <div className='text-center'>
                    <BarChart3 className='text-muted-foreground mx-auto h-12 w-12 opacity-50' />
                    <p className='text-muted-foreground mt-2 text-sm'>
                      Key performance indicators
                    </p>
                  </div>
                </div>
                <div className='to-muted/10 absolute inset-0 bg-gradient-to-br from-transparent via-transparent' />
              </CardContent>
            </Card>
          </div>

          {/* Features Coming Soon */}
          <Card>
            <CardHeader>
              <CardTitle className='flex items-center gap-2'>
                <Calendar className='h-5 w-5' />
                Upcoming Features
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className='grid gap-4 md:grid-cols-2'>
                <div className='space-y-2'>
                  <h4 className='text-sm font-medium'>Revenue Analytics</h4>
                  <p className='text-muted-foreground text-sm'>
                    Track revenue trends, growth patterns, and financial
                    forecasts
                  </p>
                </div>
                <div className='space-y-2'>
                  <h4 className='text-sm font-medium'>Customer Segmentation</h4>
                  <p className='text-muted-foreground text-sm'>
                    Analyze customer behavior and segment your user base
                  </p>
                </div>
                <div className='space-y-2'>
                  <h4 className='text-sm font-medium'>Order Analytics</h4>
                  <p className='text-muted-foreground text-sm'>
                    Deep dive into order patterns and delivery performance
                  </p>
                </div>
                <div className='space-y-2'>
                  <h4 className='text-sm font-medium'>Vendor Performance</h4>
                  <p className='text-muted-foreground text-sm'>
                    Monitor vendor metrics and partnership effectiveness
                  </p>
                </div>
                <div className='space-y-2'>
                  <h4 className='text-sm font-medium'>Geographic Analysis</h4>
                  <p className='text-muted-foreground text-sm'>
                    Understand regional performance and market penetration
                  </p>
                </div>
                <div className='space-y-2'>
                  <h4 className='text-sm font-medium'>Real-time Dashboards</h4>
                  <p className='text-muted-foreground text-sm'>
                    Live data visualization and monitoring tools
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Call to Action */}
          <Card className='border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50 dark:border-blue-800 dark:from-blue-950/50 dark:to-indigo-950/50'>
            <CardContent className='p-6 text-center'>
              <Activity className='mx-auto mb-4 h-16 w-16 text-blue-500' />
              <h3 className='mb-2 text-lg font-semibold'>
                Advanced Analytics Coming Soon
              </h3>
              <p className='text-muted-foreground mx-auto mb-4 max-w-2xl'>
                We're working on powerful analytics tools to help you understand
                your business better. Get insights into revenue patterns,
                customer behavior, and operational efficiency.
              </p>
              <Badge variant='outline' className='bg-white dark:bg-gray-900'>
                <Clock className='mr-1 h-3 w-3' />
                In Development
              </Badge>
            </CardContent>
          </Card>
        </div>
      </Main>
    </>
  )
}
