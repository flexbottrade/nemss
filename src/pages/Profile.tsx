import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import BottomNav from "@/components/BottomNav";
import { User } from "lucide-react";

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
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-secondary pb-20 md:pb-8">
      <div className="container mx-auto px-4 py-6">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-primary-dark flex items-center justify-center">
                <User className="w-6 h-6 text-primary-foreground" />
              </div>
              <CardTitle className="text-2xl">My Profile</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {profile ? (
              <>
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">Full Name</p>
                  <p className="text-lg font-medium">{profile.first_name} {profile.last_name}</p>
                </div>
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">Member ID</p>
                  <p className="text-lg font-medium">{profile.member_id}</p>
                </div>
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">Phone Number</p>
                  <p className="text-lg font-medium">{profile.phone_number}</p>
                </div>
                {profile.position && (
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">Position</p>
                    <p className="text-lg font-medium">{profile.position}</p>
                  </div>
                )}
              </>
            ) : (
              <p className="text-muted-foreground">Loading profile...</p>
            )}
          </CardContent>
        </Card>
      </div>
      <BottomNav />
    </div>
  );
};

export default Profile;