import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/admin/express/")({
  beforeLoad: ({ navigate }) => {
    navigate({ to: "/express", replace: true });
  },
  component: () => null,
});
