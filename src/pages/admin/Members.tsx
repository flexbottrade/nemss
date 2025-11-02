import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useRole } from "@/hooks/useRole";
import { toast } from "sonner";

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
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-secondary p-4 md:p-8">
      <div className="container mx-auto">
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" size="icon" onClick={() => navigate("/admin")}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">All Members</h1>
            <p className="text-sm text-muted-foreground">{members.length} total members</p>
          </div>
        </div>

        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              placeholder="Search by name or member ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredMembers.map((member) => (
            <Card key={member.id}>
              <CardHeader>
                <CardTitle className="text-lg">
                  {member.first_name} {member.last_name}
                </CardTitle>
                <p className="text-sm text-muted-foreground">ID: {member.member_id}</p>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <p>
                    <span className="font-medium">Phone:</span> {member.phone_number}
                  </p>
                  {member.position && (
                    <p>
                      <span className="font-medium">Position:</span>{" "}
                      <span className="bg-accent text-accent-foreground px-2 py-1 rounded-full text-xs">
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
            <p className="text-muted-foreground">No members found</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Members;
