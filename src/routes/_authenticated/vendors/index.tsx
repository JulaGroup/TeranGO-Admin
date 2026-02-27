import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";

const Redirect = () => {
  const navigate = useNavigate();
  useEffect(() => {
    navigate("/admin/vendors", { replace: true });
  }, []);
  return null;
};

export const Route = createFileRoute("/_authenticated/vendors/")({
  component: Redirect,
});
