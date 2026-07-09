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
import { Button } from "@/components/ui/button";
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
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Reports</h1>
              <p className="text-muted-foreground text-sm mt-1">
                Generate and download comprehensive business reports
              </p>
            </div>
            <Badge variant="secondary" className="gap-1">
              <Clock className="h-3 w-3" />
              Coming Soon
            </Badge>
          </div>

          {/* Report Types Grid */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Card className="hover:shadow-md transition-shadow cursor-pointer group relative overflow-hidden">
              <CardContent className="pt-5 flex items-center gap-4">
                <div className="rounded-lg bg-green-500/10 p-3 group-hover:bg-green-500/20 transition-colors shrink-0">
                  <DollarSign className="h-5 w-5 text-green-600" />
                </div>
                <div className="flex-1">
                  <p className="font-semibold">Sales Reports</p>
                  <p className="text-sm text-muted-foreground">Revenue and sales analytics</p>
                </div>
                <Button variant="outline" size="sm" disabled>Export</Button>
              </CardContent>
              <div className="absolute inset-0 bg-gradient-to-br from-transparent via-transparent to-green-500/5 pointer-events-none" />
            </Card>

            <Card className="hover:shadow-md transition-shadow cursor-pointer group relative overflow-hidden">
              <CardContent className="pt-5 flex items-center gap-4">
                <div className="rounded-lg bg-blue-500/10 p-3 group-hover:bg-blue-500/20 transition-colors shrink-0">
                  <ShoppingCart className="h-5 w-5 text-blue-600" />
                </div>
                <div className="flex-1">
                  <p className="font-semibold">Order Reports</p>
                  <p className="text-sm text-muted-foreground">Order trends and fulfillment</p>
                </div>
                <Button variant="outline" size="sm" disabled>Export</Button>
              </CardContent>
              <div className="absolute inset-0 bg-gradient-to-br from-transparent via-transparent to-blue-500/5 pointer-events-none" />
            </Card>

            <Card className="hover:shadow-md transition-shadow cursor-pointer group relative overflow-hidden">
              <CardContent className="pt-5 flex items-center gap-4">
                <div className="rounded-lg bg-purple-500/10 p-3 group-hover:bg-purple-500/20 transition-colors shrink-0">
                  <Users className="h-5 w-5 text-purple-600" />
                </div>
                <div className="flex-1">
                  <p className="font-semibold">Customer Reports</p>
                  <p className="text-sm text-muted-foreground">Customer insights and behavior</p>
                </div>
                <Button variant="outline" size="sm" disabled>Export</Button>
              </CardContent>
              <div className="absolute inset-0 bg-gradient-to-br from-transparent via-transparent to-purple-500/5 pointer-events-none" />
            </Card>
          </div>

          {/* Report Templates */}
          <Card className="shadow-sm">
            <CardHeader className="border-b pb-4">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Available Report Templates
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="grid gap-3 md:grid-cols-2">
                {[
                  { title: "Monthly Sales Summary", desc: "Comprehensive monthly revenue and order analysis" },
                  { title: "Financial Overview", desc: "Complete financial statements and P&L" },
                  { title: "Vendor Performance", desc: "Detailed vendor metrics and KPI analysis" },
                  { title: "Delivery Analytics", desc: "Driver performance and delivery times" },
                  { title: "Customer Analytics", desc: "Customer segmentation and lifetime value" },
                  { title: "Inventory Reports", desc: "Stock levels and product performance" },
                ].map((report) => (
                  <div
                    key={report.title}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/30 transition-colors group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="rounded-md bg-primary/10 p-2 group-hover:bg-primary/20 transition-colors">
                        <BarChart3 className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">{report.title}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{report.desc}</p>
                      </div>
                    </div>
                    <Button variant="outline" size="sm" disabled className="shrink-0 ml-3">
                      <Download className="h-3.5 w-3.5 mr-1" />
                      Export
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Features Coming Soon */}
          <Card className="shadow-sm">
            <CardHeader className="border-b pb-4">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Upcoming Report Features
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="grid gap-4 md:grid-cols-2">
                {[
                  { title: "Automated Scheduling", desc: "Schedule reports to be generated and sent automatically" },
                  { title: "Custom Templates", desc: "Create your own report templates with custom metrics" },
                  { title: "Export Formats", desc: "Download reports in PDF, Excel, CSV, and PowerPoint formats" },
                  { title: "Data Filters", desc: "Advanced filtering options by date, region, vendor, and more" },
                  { title: "Email Distribution", desc: "Automatically email reports to stakeholders" },
                  { title: "Interactive Charts", desc: "Dynamic visualizations and drill-down capabilities" },
                ].map((feature) => (
                  <div key={feature.title} className="flex items-start gap-3">
                    <div className="rounded-full bg-primary/10 p-1.5 mt-0.5 shrink-0">
                      <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">{feature.title}</p>
                      <p className="text-sm text-muted-foreground mt-0.5">{feature.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Coming Soon Placeholder */}
          <div className="flex flex-col items-center justify-center py-20 text-center border rounded-xl bg-muted/20">
            <div className="rounded-full bg-primary/10 p-6 mb-6">
              <TrendingUp className="h-12 w-12 text-primary" />
            </div>
            <h2 className="text-xl font-semibold mb-2">Comprehensive Reports Coming Soon</h2>
            <p className="text-sm text-muted-foreground max-w-md">
              We're building powerful reporting tools to help you generate insights from your data.
              Export detailed reports, schedule automated delivery, and get the analytics you need.
            </p>
            <Badge variant="outline" className="mt-6 bg-background">
              <Clock className="mr-1 h-3 w-3" />
              In Development
            </Badge>
          </div>
        </div>
      </Main>
    </>
  );
}
