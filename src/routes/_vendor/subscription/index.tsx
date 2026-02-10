import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { 
  Check, 
  Sparkles, 
  TrendingUp, 
  Award, 
  Crown,
  Package as PackageIcon,
  AlertCircle
} from "lucide-react";
import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8080";

interface SubscriptionPackage {
  id: string;
  name: string;
  displayName: string;
  price: number;
  currency: string;
  durationDays: number;
  maxProducts: number | null;
  priorityListing: boolean;
  featuredBadge: boolean;
  topPlacement: boolean;
  supportLevel: string;
  dedicatedManager: boolean;
  socialPostsPerMonth: number;
  storiesPerWeek: number;
  promoVideosPerMonth: number;
  bannerAdsPerMonth: number;
  deliveryFeeDiscount: number;
  customerFeeDiscount: boolean;
  advancedAnalytics: boolean;
  fasterPayouts: boolean;
  earlyFeatureAccess: boolean;
  displayOrder: number;
  isActive: boolean;
}

interface VendorSubscription {
  id: string;
  status: string;
  startDate: string;
  endDate: string;
  isTrial: boolean;
  package: SubscriptionPackage;
}

export const Route = createFileRoute("/_vendor/subscription/")({
  component: SubscriptionPage,
});

function SubscriptionPage() {
  const queryClient = useQueryClient();

  // Fetch packages
  const { data: packagesData, isLoading: loadingPackages } = useQuery({
    queryKey: ["subscription-packages"],
    queryFn: async () => {
      const response = await axios.get(`${API_URL}/api/subscriptions/packages`);
      return response.data.packages as SubscriptionPackage[];
    },
  });

  // Fetch current subscription
  const { data: currentSubscription, isLoading: loadingCurrent } = useQuery({
    queryKey: ["current-subscription"],
    queryFn: async () => {
      const token = localStorage.getItem("token");
      const response = await axios.get(`${API_URL}/api/subscriptions/current`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return response.data.subscription as VendorSubscription;
    },
  });

  // Start trial mutation
  const startTrialMutation = useMutation({
    mutationFn: async () => {
      const token = localStorage.getItem("token");
      const response = await axios.post(
        `${API_URL}/api/subscriptions/start-trial`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      return response.data;
    },
    onSuccess: () => {
      toast.success("🎉 Trial started! You have 30 days of Kaira benefits.");
      queryClient.invalidateQueries({ queryKey: ["current-subscription"] });
    },
    onError: (error: Error & { response?: { data?: { message?: string } } }) => {
      toast.error(error.response?.data?.message || "Failed to start trial");
    },
  });

  // Subscribe mutation
  const subscribeMutation = useMutation({
    mutationFn: async (packageId: string) => {
      const token = localStorage.getItem("token");
      const response = await axios.post(
        `${API_URL}/api/subscriptions/subscribe`,
        { packageId },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      return response.data;
    },
    onSuccess: () => {
      toast.success("Subscription activated successfully!");
      queryClient.invalidateQueries({ queryKey: ["current-subscription"] });
    },
    onError: (error: Error & { response?: { data?: { message?: string } } }) => {
      toast.error(error.response?.data?.message || "Failed to subscribe");
    },
  });

  // Upgrade mutation
  const upgradeMutation = useMutation({
    mutationFn: async (packageId: string) => {
      const token = localStorage.getItem("token");
      const response = await axios.post(
        `${API_URL}/api/subscriptions/change`,
        { newPackageId: packageId },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      return response.data;
    },
    onSuccess: () => {
      toast.success("Subscription upgraded successfully!");
      queryClient.invalidateQueries({ queryKey: ["current-subscription"] });
    },
    onError: (error: Error & { response?: { data?: { message?: string } } }) => {
      toast.error(error.response?.data?.message || "Failed to upgrade");
    },
  });

  const getPackageIcon = (name: string) => {
    switch (name.toLowerCase()) {
      case "bantaba":
        return <PackageIcon className="h-6 w-6" />;
      case "kaira":
        return <TrendingUp className="h-6 w-6" />;
      case "jollof":
        return <Award className="h-6 w-6" />;
      case "premium":
        return <Crown className="h-6 w-6" />;
      default:
        return <Sparkles className="h-6 w-6" />;
    }
  };

  const getPackageColor = (name: string) => {
    switch (name.toLowerCase()) {
      case "bantaba":
        return "text-blue-600 bg-blue-50 border-blue-200";
      case "kaira":
        return "text-green-600 bg-green-50 border-green-200";
      case "jollof":
        return "text-orange-600 bg-orange-50 border-orange-200";
      case "premium":
        return "text-purple-600 bg-purple-50 border-purple-200";
      default:
        return "text-gray-600 bg-gray-50 border-gray-200";
    }
  };

  if (loadingPackages || loadingCurrent) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading subscription plans...</p>
        </div>
      </div>
    );
  }

  const isTrialEligible = !currentSubscription;
  const hasActiveSubscription = currentSubscription?.status === "ACTIVE" || currentSubscription?.status === "TRIAL";

  return (
    <div className="container mx-auto p-6 space-y-8">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Subscription Plans</h1>
        <p className="text-muted-foreground">
          Choose the perfect plan to grow your business on TeranGO
        </p>
      </div>

      {/* Current Subscription Banner */}
      {currentSubscription && (
        <Card className="border-2 border-primary">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`p-3 rounded-lg ${getPackageColor(currentSubscription.package.name)}`}>
                  {getPackageIcon(currentSubscription.package.name)}
                </div>
                <div>
                  <CardTitle className="text-xl">
                    {currentSubscription.package.displayName}
                    {currentSubscription.isTrial && (
                      <Badge variant="secondary" className="ml-2">
                        Free Trial
                      </Badge>
                    )}
                  </CardTitle>
                  <CardDescription>
                    {currentSubscription.status === "ACTIVE" || currentSubscription.status === "TRIAL"
                      ? `Active until ${new Date(currentSubscription.endDate).toLocaleDateString()}`
                      : `Expired on ${new Date(currentSubscription.endDate).toLocaleDateString()}`}
                  </CardDescription>
                </div>
              </div>
              <Badge
                variant={currentSubscription.status === "ACTIVE" || currentSubscription.status === "TRIAL" ? "default" : "destructive"}
              >
                {currentSubscription.status}
              </Badge>
            </div>
          </CardHeader>
        </Card>
      )}

      {/* Trial Offer */}
      {isTrialEligible && (
        <Card className="border-2 border-green-200 bg-green-50/50">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <CardTitle className="text-xl flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-green-600" />
                  Start Your Free Trial
                </CardTitle>
                <CardDescription>
                  Get 30 days of Kaira package benefits absolutely free! No credit card required.
                </CardDescription>
              </div>
              <Button
                size="lg"
                onClick={() => startTrialMutation.mutate()}
                disabled={startTrialMutation.isPending}
              >
                {startTrialMutation.isPending ? "Starting..." : "Start Free Trial"}
              </Button>
            </div>
          </CardHeader>
        </Card>
      )}

      {/* Pricing Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {packagesData?.map((pkg) => {
          const isCurrentPlan = currentSubscription?.package.id === pkg.id;
          const canUpgrade = hasActiveSubscription && 
            pkg.displayOrder > (currentSubscription?.package.displayOrder || 0);

          return (
            <Card
              key={pkg.id}
              className={`relative overflow-hidden transition-all hover:shadow-lg ${
                isCurrentPlan ? "border-2 border-primary ring-2 ring-primary/20" : ""
              }`}
            >
              <CardHeader className={`pb-4 ${getPackageColor(pkg.name)}`}>
                <div className="flex items-center justify-between mb-2">
                  {getPackageIcon(pkg.name)}
                  {isCurrentPlan && (
                    <Badge variant="default">Current Plan</Badge>
                  )}
                </div>
                <CardTitle className="text-2xl">{pkg.displayName}</CardTitle>
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-bold">{pkg.currency} {pkg.price.toLocaleString()}</span>
                  <span className="text-muted-foreground">/month</span>
                </div>
              </CardHeader>

              <CardContent className="space-y-4 pt-6">
                {/* Features List */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-600" />
                    <span className="text-sm">
                      {pkg.maxProducts ? `${pkg.maxProducts} products` : "Unlimited products"}
                    </span>
                  </div>
                  {pkg.priorityListing && (
                    <div className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-green-600" />
                      <span className="text-sm">Priority listing</span>
                    </div>
                  )}
                  {pkg.featuredBadge && (
                    <div className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-green-600" />
                      <span className="text-sm">Featured badge</span>
                    </div>
                  )}
                  {pkg.topPlacement && (
                    <div className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-green-600" />
                      <span className="text-sm">Top placement</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-600" />
                    <span className="text-sm">{pkg.supportLevel} support</span>
                  </div>
                  {pkg.advancedAnalytics && (
                    <div className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-green-600" />
                      <span className="text-sm">Advanced analytics</span>
                    </div>
                  )}
                  {pkg.deliveryFeeDiscount > 0 && (
                    <div className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-green-600" />
                      <span className="text-sm">{pkg.deliveryFeeDiscount}% delivery discount</span>
                    </div>
                  )}
                  {pkg.socialPostsPerMonth > 0 && (
                    <div className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-green-600" />
                      <span className="text-sm">{pkg.socialPostsPerMonth} social posts/month</span>
                    </div>
                  )}
                  {pkg.dedicatedManager && (
                    <div className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-green-600" />
                      <span className="text-sm">Dedicated account manager</span>
                    </div>
                  )}
                </div>

                {/* Action Button */}
                <Button
                  className="w-full"
                  variant={isCurrentPlan ? "outline" : "default"}
                  disabled={isCurrentPlan || subscribeMutation.isPending || upgradeMutation.isPending}
                  onClick={() => {
                    if (hasActiveSubscription && canUpgrade) {
                      upgradeMutation.mutate(pkg.id);
                    } else if (!hasActiveSubscription) {
                      subscribeMutation.mutate(pkg.id);
                    }
                  }}
                >
                  {isCurrentPlan
                    ? "Current Plan"
                    : canUpgrade
                    ? "Upgrade"
                    : hasActiveSubscription
                    ? "Not Available"
                    : "Subscribe"}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Info Banner */}
      <Card className="bg-blue-50/50 border-blue-200">
        <CardContent className="flex items-start gap-3 pt-6">
          <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5" />
          <div className="space-y-1">
            <p className="font-medium text-blue-900">Subscription Benefits</p>
            <p className="text-sm text-blue-800">
              All plans include secure payment processing, order management, customer support, and real-time analytics.
              Upgrade anytime to unlock more features and grow your business faster.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
