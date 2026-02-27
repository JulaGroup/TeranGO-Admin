import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";

const Redirect = () => {
  const navigate = useNavigate();
  useEffect(() => {
    navigate({ to: "/admin/categories", replace: true });
  }, []);
  return null;
};

export const Route = createFileRoute("/_authenticated/categories/")({
  component: Redirect,
});
