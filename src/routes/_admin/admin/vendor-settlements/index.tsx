import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function VendorSettlementsPage() {
  return (
    <div className="container mx-auto py-8">
      <Card>
        <CardHeader>
          <CardTitle>Vendor Settlements</CardTitle>
        </CardHeader>
        <CardContent>
          <p>This page will display a list of vendor settlement requests.</p>
          {/* We will add a data table here later */}
        </CardContent>
      </Card>
    </div>
  );
}
