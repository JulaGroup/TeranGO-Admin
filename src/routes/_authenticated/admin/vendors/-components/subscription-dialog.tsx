// @ts-nocheck
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function SubscriptionDialog({
  vendor,
  packages,
  isOpen,
  onClose,
  onAssign,
  isAssigning,
}: any) {
  const [selectedPackage, setSelectedPackage] = useState("");
  const [duration, setDuration] = useState(30);

  const handleSubmit = () => {
    if (selectedPackage) {
      onAssign({ packageId: selectedPackage, durationDays: duration });
    }
  };

  if (!vendor) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Manage Subscription</DialogTitle>
          <DialogDescription>For {vendor.user?.fullName}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <Select onValueChange={setSelectedPackage} value={selectedPackage}>
            <SelectTrigger>
              <SelectValue placeholder="Select a package" />
            </SelectTrigger>
            <SelectContent>
              {packages.map((p: any) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.name} - D{p.price} / {p.durationDays} days
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            type="number"
            value={duration}
            onChange={(e) => setDuration(Number(e.target.value))}
            placeholder="Duration in days"
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isAssigning || !selectedPackage}
          >
            {isAssigning ? "Assigning..." : "Assign Subscription"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
