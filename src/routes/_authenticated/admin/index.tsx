import { createFileRoute } from "@tanstack/react-router";
import { Dashboard } from "@/features/dashboard";

// Admin landing page – reuse existing dashboard
export const Route = createFileRoute("/_authenticated/admin/")({
  component: Dashboard,
});
