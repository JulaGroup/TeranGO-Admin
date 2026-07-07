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
}

const SETTINGS_LINKS: SettingLink[] = [
  {
    title: "Delivery Fees",
    description:
      "Vehicle & distance pricing, gift-order zones, hub-based distance, driver split.",
    url: "/admin/delivery-settings",
    icon: DollarSign,
    color: "text-green-600",
  },
  {
    title: "Delivery Towns",
    description: "Serviceable towns, delivery zones, and their coordinates.",
    url: "/admin/delivery-towns",
    icon: MapPin,
    color: "text-blue-600",
  },
  {
    title: "TeranGO Store",
    description: "Official store configuration and storefront settings.",
    url: "/admin/terango-store/settings",
    icon: Store,
    color: "text-orange-600",
  },
  {
    title: "Advertisements",
    description: "Home-screen ad campaigns and vendor promotions.",
    url: "/admin/advertisements",
    icon: Megaphone,
    color: "text-purple-600",
  },
  {
    title: "Notifications",
    description: "Broadcast messages and push-notification management.",
    url: "/admin/notifications",
    icon: Bell,
    color: "text-yellow-600",
  },
  {
    title: "Maintenance",
    description: "System maintenance mode and operational controls.",
    url: "/admin/maintenance",
    icon: Wrench,
    color: "text-red-600",
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
        <div className="mb-6">
          <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
          <p className="text-muted-foreground">
            Configure delivery, storefront, and system settings for TeranGO.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {SETTINGS_LINKS.map((item) => {
            const Icon = item.icon;
            return (
              <Link key={item.url} to={item.url}>
                <Card className="h-full transition-all hover:border-primary/40 hover:shadow-md">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                          <Icon className={`h-5 w-5 ${item.color}`} />
                        </div>
                        <CardTitle className="text-base">
                          {item.title}
                        </CardTitle>
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <CardDescription>{item.description}</CardDescription>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      </Main>
    </>
  );
}
