import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import BottomNav from "@/components/BottomNav";
import { User, Award, Phone, Hash, Crown } from "lucide-react";

const Profile = () => {
  const [profile, setProfile] = useState<any>(null);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (user) {
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      setProfile(data);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-8">
      <div className="container mx-auto px-4 py-3 md:py-6">
        {/* Header */}
        <div className="mb-4 md:mb-6 text-center">
          <div className="w-16 h-16 md:w-24 md:h-24 mx-auto mb-3 md:mb-4 rounded-full bg-primary flex items-center justify-center shadow-lg">
            <User className="w-8 h-8 md:w-12 md:h-12 text-primary-foreground" />
          </div>
          <h1 className="text-xl md:text-3xl font-bold mb-1 text-foreground">
            {profile?.first_name} {profile?.last_name}
          </h1>
          <p className="text-xs md:text-base text-foreground/70">Member Profile</p>
        </div>

        {/* Profile Card */}
        <Card className="border-border bg-card shadow-lg">
          <CardContent className="p-4 md:p-6 space-y-3 md:space-y-5">
            {profile ? (
              <>
                {profile.position && (
                  <div className="p-3 md:p-4 rounded-lg bg-accent border border-accent">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-primary flex items-center justify-center">
                        <Crown className="w-5 h-5 md:w-6 md:h-6 text-primary-foreground" />
                      </div>
                      <div>
                        <p className="text-xs md:text-sm text-accent-foreground/70">Position</p>
                        <p className="text-base md:text-xl font-bold text-accent-foreground">{profile.position}</p>
                      </div>
                    </div>
                  </div>
                )}

                <div className="space-y-3 md:space-y-4">
                  <div className="flex items-center gap-3 md:gap-4 p-3 md:p-4 rounded-lg bg-accent">
                    <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-primary flex items-center justify-center">
                      <User className="w-5 h-5 md:w-6 md:h-6 text-primary-foreground" />
                    </div>
                    <div className="flex-1">
                      <p className="text-xs md:text-sm text-accent-foreground/70">Full Name</p>
                      <p className="text-sm md:text-lg font-semibold text-accent-foreground">
                        {profile.first_name} {profile.last_name}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 md:gap-4 p-3 md:p-4 rounded-lg bg-accent">
                    <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-primary flex items-center justify-center">
                      <Hash className="w-5 h-5 md:w-6 md:h-6 text-primary-foreground" />
                    </div>
                    <div className="flex-1">
                      <p className="text-xs md:text-sm text-accent-foreground/70">Member ID</p>
                      <p className="text-sm md:text-lg font-mono font-bold text-accent-foreground">{profile.member_id}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 md:gap-4 p-3 md:p-4 rounded-lg bg-accent">
                    <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-primary flex items-center justify-center">
                      <Phone className="w-5 h-5 md:w-6 md:h-6 text-primary-foreground" />
                    </div>
                    <div className="flex-1">
                      <p className="text-xs md:text-sm text-accent-foreground/70">Phone</p>
                      <p className="text-sm md:text-lg font-semibold text-accent-foreground">{profile.phone_number}</p>
                    </div>
                  </div>
                </div>

                <div className="mt-4 md:mt-6 pt-4 md:pt-6 border-t border-border">
                  <div className="flex items-center gap-2 text-card-foreground">
                    <Award className="w-4 h-4 md:w-5 md:h-5 text-primary" />
                    <span className="text-sm md:text-base font-semibold">NEMSS09 Set Member</span>
                  </div>
                </div>
              </>
            ) : (
              <div className="text-center py-6 md:py-8">
                <div className="animate-spin rounded-full h-6 w-6 md:h-8 md:w-8 border-b-2 border-accent mx-auto"></div>
                <p className="text-xs md:text-sm text-card-foreground/70 mt-3 md:mt-4">Loading...</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      <BottomNav />
    </div>
  );
};

export default Profile;
