import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import BottomNav from "@/components/BottomNav";
import { Calendar } from "lucide-react";

const Events = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-secondary pb-20 md:pb-8">
      <div className="container mx-auto px-4 py-4 md:py-6">
        <Card>
          <CardHeader className="p-4 md:p-6">
            <div className="flex items-center gap-2 md:gap-3">
              <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-gradient-to-br from-accent to-highlight flex items-center justify-center">
                <Calendar className="w-5 h-5 md:w-6 md:h-6 text-accent-foreground" />
              </div>
              <CardTitle className="text-lg md:text-2xl">Events</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="p-4 md:p-6 pt-0">
            <p className="text-sm md:text-base text-muted-foreground">Events listing coming soon...</p>
          </CardContent>
        </Card>
      </div>
      <BottomNav />
    </div>
  );
};

export default Events;