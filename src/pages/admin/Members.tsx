import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Search, UserCog, ShieldOff, Edit, DollarSign } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useRole } from "@/hooks/useRole";
import { toast } from "sonner";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { ConfirmationDialog } from "@/components/ConfirmationDialog";
import { EditMemberNameDialog } from "@/components/admin/EditMemberNameDialog";
import { MemberPaymentsDialog } from "@/components/admin/MemberPaymentsDialog";

const Members = () => {
  const navigate = useNavigate();
  const { isAdmin, isSuperAdmin, loading } = useRole();
  const [members, setMembers] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [membersWithOwing, setMembersWithOwing] = useState<any[]>([]);
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    title: string;
    description: string;
    onConfirm: () => void;
  }>({
    open: false,
    title: "",
    description: "",
    onConfirm: () => {},
  });
  const [editNameDialog, setEditNameDialog] = useState(false);
  const [paymentsDialog, setPaymentsDialog] = useState(false);
  const [selectedMember, setSelectedMember] = useState<any>(null);

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
      .eq("email_verified", true)
      .order("first_name", { ascending: true });

    if (error) {
      toast.error("Failed to load members");
      return;
    }

    // Check admin status for each member
    const membersWithRoles = await Promise.all(
      (data || []).map(async (member) => {
        const { data: roleData } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", member.id)
          .single();
        
        return {
          ...member,
          isAdmin: roleData?.role === "admin" || roleData?.role === "super_admin",
        };
      })
    );

    setMembers(membersWithRoles);

    // Calculate owing status
    const { data: variableDues } = await supabase
      .from("variable_dues_settings")
      .select("*");

    const { data: duesPayments } = await supabase
      .from("dues_payments")
      .select("*")
      .eq("status", "approved");

    const { data: eventPayments } = await supabase
      .from("event_payments")
      .select("*, events(amount, event_date)")
      .eq("status", "approved");

    const { data: allEvents } = await supabase
      .from("events")
      .select("*");

    const today = new Date();
    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth() + 1;

    const membersData = data?.map(member => {
      // Calculate dues owing from 2023 to current month
      let totalDuesExpected = 0;
      for (let year = 2023; year <= currentYear; year++) {
        const dueSetting = variableDues?.find(d => d.year === year);
        if (!dueSetting?.is_waived) {
          const monthlyAmount = dueSetting?.monthly_amount || 3000;
          const monthsInYear = year === currentYear ? currentMonth : 12;
          totalDuesExpected += monthlyAmount * monthsInYear;
        }
      }

      const memberDues = duesPayments?.filter(p => p.user_id === member.id) || [];
      const totalDuesPaid = memberDues.reduce((sum, p) => sum + Number(p.amount), 0);
      const duesOwing = totalDuesExpected - totalDuesPaid;

      // Calculate events owing (all events, not just paid ones)
      const memberEventPayments = eventPayments?.filter(p => p.user_id === member.id) || [];
      const paidEventIds = memberEventPayments.map(p => p.event_id);
      
      const unpaidEvents = allEvents?.filter(event => !paidEventIds.includes(event.id)) || [];
      const totalEventsOwed = unpaidEvents.reduce((sum, e) => sum + Number(e.amount), 0);

      return {
        ...member,
        duesOwing: duesOwing > 0 ? duesOwing : 0,
        eventsOwing: totalEventsOwed > 0 ? totalEventsOwed : 0,
        totalOwing: (duesOwing > 0 ? duesOwing : 0) + (totalEventsOwed > 0 ? totalEventsOwed : 0)
      };
    }) || [];

    setMembersWithOwing(membersData);
  };

  const handleMakeAdmin = async (userId: string, userName: string) => {
    setConfirmDialog({
      open: true,
      title: "Make Member Admin",
      description: `Are you sure you want to grant admin privileges to ${userName}? This action will give them full administrative access.`,
      onConfirm: async () => {
        const { error } = await supabase
          .from("user_roles")
          .upsert({ user_id: userId, role: "admin" }, { onConflict: "user_id,role" });

        if (error) {
          toast.error("Failed to make member admin");
        } else {
          toast.success(`${userName} is now an admin`);
          loadMembers();
        }
        setConfirmDialog({ ...confirmDialog, open: false });
      },
    });
  };

  const handleRemoveAdmin = async (userId: string, userName: string) => {
    setConfirmDialog({
      open: true,
      title: "Remove Admin Access",
      description: `Are you sure you want to remove admin privileges from ${userName}? They will lose all administrative access.`,
      onConfirm: async () => {
        const { error } = await supabase
          .from("user_roles")
          .delete()
          .eq("user_id", userId)
          .eq("role", "admin");

        if (error) {
          toast.error("Failed to remove admin access");
        } else {
          toast.success(`${userName} is no longer an admin`);
          loadMembers();
        }
        setConfirmDialog({ ...confirmDialog, open: false });
      },
    });
  };

  // Sort members: positions first (in hierarchy order), then alphabetically by first name
  const positionHierarchy = [
    "Admin",
    "President", 
    "Vice President",
    "Treasurer",
    "Financial Secretary",
    "Provost",
    "General Secretary",
    "Social Director"
  ];

  const sortedMembers = [...membersWithOwing].sort((a, b) => {
    // If both have positions, sort by hierarchy
    if (a.position && b.position) {
      const aIndex = positionHierarchy.indexOf(a.position);
      const bIndex = positionHierarchy.indexOf(b.position);
      if (aIndex !== -1 && bIndex !== -1) {
        return aIndex - bIndex;
      }
      if (aIndex !== -1) return -1;
      if (bIndex !== -1) return 1;
      return a.position.localeCompare(b.position);
    }
    // Position holders come first
    if (a.position && !b.position) return -1;
    if (!a.position && b.position) return 1;
    // Both have no position, sort alphabetically by first name
    return a.first_name.localeCompare(b.first_name);
  });

  const filteredMembers = sortedMembers.filter(
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
            <p className="text-xs md:text-sm text-muted-foreground mt-1">
              View member details, financial status, and manage admin privileges • {members.length} total members
            </p>
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
              <Card key={member.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="p-3 pb-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-sm md:text-base">
                        {member.first_name} {member.last_name}
                      </CardTitle>
                      <p className="text-xs text-muted-foreground">ID: {member.member_id}</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setSelectedMember(member);
                        setEditNameDialog(true);
                      }}
                      className="h-7 w-7 p-0"
                    >
                      <Edit className="h-3 w-3" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="p-3 pt-2 space-y-2">
                  <div className="text-xs space-y-1">
                    <p>
                      <span className="font-medium">Phone:</span> {member.phone_number}
                    </p>
                    {member.position && (
                      <p>
                        <span className="font-medium">Position:</span>{" "}
                        <span className="bg-primary text-primary-foreground px-1.5 py-0.5 rounded-full text-xs">
                          {member.position}
                        </span>
                      </p>
                    )}
                  </div>
                  
                  <div className="pt-2 border-t border-border">
                    <p className="font-medium text-xs mb-1">Financial Status:</p>
                    {member.totalOwing > 0 ? (
                      <div className="space-y-0.5 text-xs">
                        {member.duesOwing > 0 && (
                          <p className="text-red-600 dark:text-red-400">
                            Dues: ₦{member.duesOwing.toLocaleString()}
                          </p>
                        )}
                        {member.eventsOwing > 0 && (
                          <p className="text-orange-600 dark:text-orange-400">
                            Events: ₦{member.eventsOwing.toLocaleString()}
                          </p>
                        )}
                        <p className="font-bold text-red-600 dark:text-red-400">
                          Total: ₦{member.totalOwing.toLocaleString()}
                        </p>
                      </div>
                    ) : (
                      <p className="text-green-600 dark:text-green-400 font-medium text-xs">
                        ✓ Up-to-date
                      </p>
                    )}
                  </div>

                  <div className="flex gap-2 pt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedMember(member);
                        setPaymentsDialog(true);
                      }}
                      className="flex-1 h-8 text-xs"
                    >
                      <DollarSign className="h-3 w-3 mr-1" />
                      Payments
                    </Button>
                    {isSuperAdmin && (
                      member.isAdmin ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleRemoveAdmin(member.id, `${member.first_name} ${member.last_name}`)}
                          className="h-8 px-2"
                        >
                          <ShieldOff className="h-3 w-3" />
                        </Button>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleMakeAdmin(member.id, `${member.first_name} ${member.last_name}`)}
                          className="h-8 px-2"
                        >
                          <UserCog className="h-3 w-3" />
                        </Button>
                      )
                    )}
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

      <ConfirmationDialog
        open={confirmDialog.open}
        onOpenChange={(open) => setConfirmDialog({ ...confirmDialog, open })}
        onConfirm={confirmDialog.onConfirm}
        title={confirmDialog.title}
        description={confirmDialog.description}
      />

      <EditMemberNameDialog
        open={editNameDialog}
        onOpenChange={setEditNameDialog}
        member={selectedMember}
        onSuccess={loadMembers}
      />

      <MemberPaymentsDialog
        open={paymentsDialog}
        onOpenChange={setPaymentsDialog}
        member={selectedMember}
        onSuccess={loadMembers}
      />
    </div>
  );
};

export default Members;
