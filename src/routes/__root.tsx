import { type QueryClient } from "@tanstack/react-query";
import { createRootRouteWithContext, Outlet } from "@tanstack/react-router";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools";
import { Toaster } from "@/components/ui/sonner";
import { NavigationProgress } from "@/components/navigation-progress";
import { SearchProvider } from "@/context/search-provider";

export const Route = createRootRouteWithContext<{
  queryClient: QueryClient;
}>()({
  component: () => {
    return (
      <>
        <NavigationProgress />+{" "}
        {/* Provide search context at the very top so any page can use <Search> */}
        +{" "}
        <SearchProvider>
          <Outlet />
          <Toaster duration={5000} />
          {import.meta.env.MODE === "development" && (
            <>
              <ReactQueryDevtools buttonPosition="bottom-left" />
              <TanStackRouterDevtools position="bottom-right" />
            </>
          )}
          +{" "}
        </SearchProvider>
      </>
    );
  },
});
