import { createFileRoute, Link } from "@tanstack/react-router";
import {
  DollarSign,
  MapPin,
  Store,
  Bell,
  Wrench,
  Megaphone,
  ChevronRight,
  type LucideIcon,
} from "lucide-react";
import { Main } from "@/components/layout/main";
import { Header } from "@/components/layout/header";
import { ProfileDropdown } from "@/components/profile-dropdown";
import { Search } from "@/components/search";
import { ThemeSwitch } from "@/components/theme-switch";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const Route = createFileRoute("/_authenticated/admin/settings/")({
  component: SettingsPage,
});

interface SettingLink {
  title: string;
  description: string;
  url: string;
  icon: LucideIcon;
  color: string;
  bg: string;
}

const SETTINGS_LINKS: SettingLink[] = [
  {
    title: "Delivery Fees",
    description:
      "Vehicle & distance pricing, gift-order zones, hub-based distance, driver split.",
    url: "/admin/delivery-settings",
    icon: DollarSign,
    color: "text-emerald-600",
    bg: "bg-emerald-500/10 group-hover:bg-emerald-500/20",
  },
  {
    title: "Delivery Towns",
    description: "Serviceable towns, delivery zones, and their coordinates.",
    url: "/admin/delivery-towns",
    icon: MapPin,
    color: "text-blue-600",
    bg: "bg-blue-500/10 group-hover:bg-blue-500/20",
  },
  {
    title: "TeranGO Store",
    description: "Official store configuration and storefront settings.",
    url: "/admin/terango-store/settings",
    icon: Store,
    color: "text-orange-600",
    bg: "bg-orange-500/10 group-hover:bg-orange-500/20",
  },
  {
    title: "Advertisements",
    description: "Home-screen ad campaigns and vendor promotions.",
    url: "/admin/advertisements",
    icon: Megaphone,
    color: "text-purple-600",
    bg: "bg-purple-500/10 group-hover:bg-purple-500/20",
  },
  {
    title: "Notifications",
    description: "Broadcast messages and push-notification management.",
    url: "/admin/notifications",
    icon: Bell,
    color: "text-amber-600",
    bg: "bg-amber-500/10 group-hover:bg-amber-500/20",
  },
  {
    title: "Maintenance",
    description: "System maintenance mode and operational controls.",
    url: "/admin/maintenance",
    icon: Wrench,
    color: "text-red-600",
    bg: "bg-red-500/10 group-hover:bg-red-500/20",
  },
];

function SettingsPage() {
  return (
    <>
      <Header>
        <Search />
        <div className="ml-auto flex items-center space-x-4">
          <ThemeSwitch />
          <ProfileDropdown />
        </div>
      </Header>

      <Main>
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
              <p className="text-muted-foreground text-sm mt-1">
                Configure delivery, storefront, and system settings for TeranGO.
              </p>
            </div>
          </div>

          {/* Settings Grid */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {SETTINGS_LINKS.map((item) => {
              const Icon = item.icon;
              return (
                <Link key={item.url} to={item.url} className="group">
                  <Card className="h-full shadow-sm transition-all hover:shadow-md hover:border-primary/30">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className={`flex h-10 w-10 items-center justify-center rounded-lg transition-colors ${item.bg}`}>
                          <Icon className={`h-5 w-5 ${item.color}`} />
                        </div>
                        <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity mt-1" />
                      </div>
                      <CardTitle className="text-base mt-3">
                        {item.title}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <CardDescription>{item.description}</CardDescription>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        </div>
      </Main>
    </>
  );
}
