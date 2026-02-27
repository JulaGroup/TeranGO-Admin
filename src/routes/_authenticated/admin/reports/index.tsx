import { createFileRoute } from "@tanstack/react-router";
import {
  FileText,
  Download,
  Calendar,
  PieChart,
  TrendingUp,
  Users,
  ShoppingCart,
  DollarSign,
  Clock,
  BarChart3,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfigDrawer } from "@/components/config-drawer";
import { Header } from "@/components/layout/header";
import { Main } from "@/components/layout/main";
import { TopNav } from "@/components/layout/top-nav";
import { ProfileDropdown } from "@/components/profile-dropdown";
import { Search as SearchInput } from "@/components/search";
import { ThemeSwitch } from "@/components/theme-switch";

const topNav = [
  { title: "Overview", href: "/admin", isActive: false },
  { title: "Analytics", href: "/admin/analytics", isActive: false },
  { title: "Reports", href: "/admin/reports", isActive: true },
  { title: "Settings", href: "#", isActive: false },
];

export const Route = createFileRoute("/_authenticated/admin/reports/")({
  component: ReportsPage,
});

function ReportsPage() {
  return (
    <>
      <Header>
        <TopNav links={topNav} />
        <div className="ms-auto flex items-center space-x-4">
          <SearchInput />
          <ThemeSwitch />
          <ConfigDrawer />
          <ProfileDropdown />
        </div>
      </Header>

      <Main>
        <div className="space-y-6">
          {/* Header */}
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Reports</h1>
              <p className="text-muted-foreground">
                Generate and download comprehensive business reports
              </p>
            </div>
            <Badge variant="secondary" className="w-fit">
              <Clock className="mr-1 h-3 w-3" />
              Coming Soon
            </Badge>
          </div>

          {/* Report Types Grid */}
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            <Card className="relative overflow-hidden">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Sales Reports
                </CardTitle>
                <DollarSign className="text-muted-foreground h-4 w-4" />
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-center py-8">
                  <div className="text-center">
                    <TrendingUp className="text-muted-foreground mx-auto h-12 w-12 opacity-50" />
                    <p className="text-muted-foreground mt-2 text-sm">
                      Revenue and sales analytics
                    </p>
                  </div>
                </div>
                <div className="absolute inset-0 bg-gradient-to-br from-transparent via-transparent to-green-500/5" />
              </CardContent>
            </Card>

            <Card className="relative overflow-hidden">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Order Reports
                </CardTitle>
                <ShoppingCart className="text-muted-foreground h-4 w-4" />
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-center py-8">
                  <div className="text-center">
                    <BarChart3 className="text-muted-foreground mx-auto h-12 w-12 opacity-50" />
                    <p className="text-muted-foreground mt-2 text-sm">
                      Order trends and fulfillment
                    </p>
                  </div>
                </div>
                <div className="absolute inset-0 bg-gradient-to-br from-transparent via-transparent to-blue-500/5" />
              </CardContent>
            </Card>

            <Card className="relative overflow-hidden">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Customer Reports
                </CardTitle>
                <Users className="text-muted-foreground h-4 w-4" />
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-center py-8">
                  <div className="text-center">
                    <PieChart className="text-muted-foreground mx-auto h-12 w-12 opacity-50" />
                    <p className="text-muted-foreground mt-2 text-sm">
                      Customer insights and behavior
                    </p>
                  </div>
                </div>
                <div className="absolute inset-0 bg-gradient-to-br from-transparent via-transparent to-purple-500/5" />
              </CardContent>
            </Card>
          </div>

          {/* Report Templates */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Available Report Templates
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-4">
                  <div className="bg-muted/30 flex items-center justify-between rounded-lg border p-4">
                    <div className="space-y-1">
                      <h4 className="text-sm font-medium">
                        Monthly Sales Summary
                      </h4>
                      <p className="text-muted-foreground text-xs">
                        Comprehensive monthly revenue and order analysis
                      </p>
                    </div>
                    <Download className="text-muted-foreground h-4 w-4 opacity-50" />
                  </div>

                  <div className="bg-muted/30 flex items-center justify-between rounded-lg border p-4">
                    <div className="space-y-1">
                      <h4 className="text-sm font-medium">
                        Vendor Performance
                      </h4>
                      <p className="text-muted-foreground text-xs">
                        Detailed vendor metrics and KPI analysis
                      </p>
                    </div>
                    <Download className="text-muted-foreground h-4 w-4 opacity-50" />
                  </div>

                  <div className="bg-muted/30 flex items-center justify-between rounded-lg border p-4">
                    <div className="space-y-1">
                      <h4 className="text-sm font-medium">
                        Customer Analytics
                      </h4>
                      <p className="text-muted-foreground text-xs">
                        Customer segmentation and lifetime value
                      </p>
                    </div>
                    <Download className="text-muted-foreground h-4 w-4 opacity-50" />
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="bg-muted/30 flex items-center justify-between rounded-lg border p-4">
                    <div className="space-y-1">
                      <h4 className="text-sm font-medium">
                        Financial Overview
                      </h4>
                      <p className="text-muted-foreground text-xs">
                        Complete financial statements and P&L
                      </p>
                    </div>
                    <Download className="text-muted-foreground h-4 w-4 opacity-50" />
                  </div>

                  <div className="bg-muted/30 flex items-center justify-between rounded-lg border p-4">
                    <div className="space-y-1">
                      <h4 className="text-sm font-medium">
                        Delivery Analytics
                      </h4>
                      <p className="text-muted-foreground text-xs">
                        Driver performance and delivery times
                      </p>
                    </div>
                    <Download className="text-muted-foreground h-4 w-4 opacity-50" />
                  </div>

                  <div className="bg-muted/30 flex items-center justify-between rounded-lg border p-4">
                    <div className="space-y-1">
                      <h4 className="text-sm font-medium">Inventory Reports</h4>
                      <p className="text-muted-foreground text-xs">
                        Stock levels and product performance
                      </p>
                    </div>
                    <Download className="text-muted-foreground h-4 w-4 opacity-50" />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Features Coming Soon */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Upcoming Report Features
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <h4 className="text-sm font-medium">Automated Scheduling</h4>
                  <p className="text-muted-foreground text-sm">
                    Schedule reports to be generated and sent automatically
                  </p>
                </div>
                <div className="space-y-2">
                  <h4 className="text-sm font-medium">Custom Templates</h4>
                  <p className="text-muted-foreground text-sm">
                    Create your own report templates with custom metrics
                  </p>
                </div>
                <div className="space-y-2">
                  <h4 className="text-sm font-medium">Export Formats</h4>
                  <p className="text-muted-foreground text-sm">
                    Download reports in PDF, Excel, CSV, and PowerPoint formats
                  </p>
                </div>
                <div className="space-y-2">
                  <h4 className="text-sm font-medium">Data Filters</h4>
                  <p className="text-muted-foreground text-sm">
                    Advanced filtering options by date, region, vendor, and more
                  </p>
                </div>
                <div className="space-y-2">
                  <h4 className="text-sm font-medium">Email Distribution</h4>
                  <p className="text-muted-foreground text-sm">
                    Automatically email reports to stakeholders
                  </p>
                </div>
                <div className="space-y-2">
                  <h4 className="text-sm font-medium">Interactive Charts</h4>
                  <p className="text-muted-foreground text-sm">
                    Dynamic visualizations and drill-down capabilities
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Call to Action */}
          <Card className="border-orange-200 bg-gradient-to-r from-orange-50 to-red-50 dark:border-orange-800 dark:from-orange-950/50 dark:to-red-950/50">
            <CardContent className="p-6 text-center">
              <FileText className="mx-auto mb-4 h-16 w-16 text-orange-500" />
              <h3 className="mb-2 text-lg font-semibold">
                Comprehensive Reports Coming Soon
              </h3>
              <p className="text-muted-foreground mx-auto mb-4 max-w-2xl">
                We're building powerful reporting tools to help you generate
                insights from your data. Export detailed reports, schedule
                automated delivery, and get the analytics you need to make
                informed decisions.
              </p>
              <Badge variant="outline" className="bg-white dark:bg-gray-900">
                <Clock className="mr-1 h-3 w-3" />
                In Development
              </Badge>
            </CardContent>
          </Card>
        </div>
      </Main>
    </>
  );
}
