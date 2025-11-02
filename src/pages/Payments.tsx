import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import BottomNav from "@/components/BottomNav";
import { Wallet } from "lucide-react";

const Payments = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-secondary pb-20 md:pb-8">
      <div className="container mx-auto px-4 py-6">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-primary-dark flex items-center justify-center">
                <Wallet className="w-6 h-6 text-primary-foreground" />
              </div>
              <CardTitle className="text-2xl">Dues Payment</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">Payment system coming soon...</p>
          </CardContent>
        </Card>
      </div>
      <BottomNav />
    </div>
  );
};

export default Payments;