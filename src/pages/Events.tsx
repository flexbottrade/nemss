import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import BottomNav from "@/components/BottomNav";
import { Calendar } from "lucide-react";

const Events = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-secondary pb-20 md:pb-8">
      <div className="container mx-auto px-4 py-6">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-accent to-highlight flex items-center justify-center">
                <Calendar className="w-6 h-6 text-accent-foreground" />
              </div>
              <CardTitle className="text-2xl">Events</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">Events listing coming soon...</p>
          </CardContent>
        </Card>
      </div>
      <BottomNav />
    </div>
  );
};

export default Events;