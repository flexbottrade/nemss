import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useRole } from "@/hooks/useRole";
import { toast } from "sonner";
import { AdminSidebar } from "@/components/admin/AdminSidebar";

const Members = () => {
  const navigate = useNavigate();
  const { isAdmin, loading } = useRole();
  const [members, setMembers] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    if (!loading && !isAdmin) {
      navigate("/dashboard");
      toast.error("Access denied");
    }
  }, [isAdmin, loading, navigate]);

  useEffect(() => {
    if (isAdmin) {
      loadMembers();
    }
  }, [isAdmin]);

  const loadMembers = async () => {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .order("first_name", { ascending: true });

    if (error) {
      toast.error("Failed to load members");
      return;
    }

    setMembers(data || []);
  };

  const filteredMembers = members.filter(
    (m) =>
      m.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.last_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.member_id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading || !isAdmin) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  return (
    <div className="flex min-h-screen bg-background">
      <AdminSidebar />
      
      <main className="flex-1 p-3 md:p-6 lg:p-8">
        <div className="max-w-7xl mx-auto">
          <div className="mb-4 md:mb-6 pl-12 md:pl-0">
            <h1 className="text-xl md:text-3xl font-bold">All Members</h1>
            <p className="text-xs md:text-sm text-muted-foreground">{members.length} total members</p>
          </div>

          <div className="mb-4 md:mb-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-3 h-3 md:w-4 md:h-4" />
              <Input
                placeholder="Search by name or member ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 md:pl-10 text-xs md:text-sm h-8 md:h-10"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
            {filteredMembers.map((member) => (
              <Card key={member.id}>
                <CardHeader className="p-3 md:p-6">
                  <CardTitle className="text-sm md:text-lg">
                    {member.first_name} {member.last_name}
                  </CardTitle>
                  <p className="text-xs md:text-sm text-muted-foreground">ID: {member.member_id}</p>
                </CardHeader>
                <CardContent className="p-3 md:p-6 pt-0">
                  <div className="space-y-1 md:space-y-2 text-xs md:text-sm">
                    <p>
                      <span className="font-medium">Phone:</span> {member.phone_number}
                    </p>
                    {member.position && (
                      <p>
                        <span className="font-medium">Position:</span>{" "}
                        <span className="bg-accent text-accent-foreground px-1.5 md:px-2 py-0.5 md:py-1 rounded-full text-xs">
                          {member.position}
                        </span>
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      Joined: {new Date(member.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {filteredMembers.length === 0 && (
            <div className="text-center py-12">
              <p className="text-xs md:text-sm text-muted-foreground">No members found</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default Members;
