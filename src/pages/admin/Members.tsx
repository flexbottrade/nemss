import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Search, UserCog, ShieldOff, Edit, DollarSign, UserPlus, Ban, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useRole } from "@/hooks/useRole";
import { toast } from "sonner";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { ConfirmationDialog } from "@/components/ConfirmationDialog";
import { EditMemberNameDialog } from "@/components/admin/EditMemberNameDialog";
import { MemberPaymentsDialog } from "@/components/admin/MemberPaymentsDialog";
import { AssignRoleDialog } from "@/components/admin/AssignRoleDialog";
import { AddMemberDialog } from "@/components/admin/AddMemberDialog";
import { MemberWaiverDialog } from "@/components/admin/MemberWaiverDialog";
import { Spinner } from "@/components/ui/spinner";

const Members = () => {
  const navigate = useNavigate();
  const { isAdmin, isSuperAdmin, isFinancialSecretary, loading } = useRole();
  
  console.log('Members page - isSuperAdmin:', isSuperAdmin, 'isAdmin:', isAdmin);
  const [dataLoading, setDataLoading] = useState(true);
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
  const [assignRoleDialog, setAssignRoleDialog] = useState(false);
  const [addMemberDialog, setAddMemberDialog] = useState(false);
  const [waiverDialog, setWaiverDialog] = useState(false);
  const [deleteMemberDialog, setDeleteMemberDialog] = useState<{
    open: boolean;
    member: any;
    confirmText: string;
  }>({ open: false, member: null, confirmText: "" });
  const [deletingMember, setDeletingMember] = useState(false);
  const [selectedMember, setSelectedMember] = useState<any>(null);

  useEffect(() => {
    if (!loading && !isAdmin && !isFinancialSecretary) {
      navigate("/dashboard");
      toast.error("Access denied");
    }
  }, [isAdmin, isFinancialSecretary, loading, navigate]);

  useEffect(() => {
    if (isAdmin || isFinancialSecretary) {
      loadMembers();
    }
  }, [isAdmin, isFinancialSecretary]);

  const loadMembers = async () => {
    // Parallel fetch all required data
    const [profilesResult, variableDuesResult, duesPaymentsResult, eventPaymentsResult, eventsResult, waiversResult] = await Promise.all([
      supabase.from("profiles").select("*").eq("email_verified", true).order("first_name", { ascending: true }),
      supabase.from("variable_dues_settings").select("*"),
      supabase.from("dues_payments").select("*").eq("status", "approved"),
      supabase.from("event_payments").select("*, events(amount, event_date)").eq("status", "approved"),
      supabase.from("events").select("*"),
      supabase.from("member_waivers").select("*")
    ]);

    const data = profilesResult.data;
    if (profilesResult.error) {
      toast.error("Failed to load members");
      return;
    }

    // Check admin status for all members in parallel
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

    const today = new Date();
    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth() + 1;

    const membersData = data?.map(member => {
      // Get member's waivers
      const memberWaivers = waiversResult.data?.filter(w => w.user_id === member.id) || [];
      const duesWaivers = memberWaivers.filter(w => w.waiver_type === 'dues');
      const eventWaivers = memberWaivers.filter(w => w.waiver_type === 'event');
      const waivedEventIds = eventWaivers.map(w => w.event_id);

      let totalDuesExpected = 0;
      for (let year = 2023; year <= currentYear; year++) {
        const dueSetting = variableDuesResult.data?.find(d => d.year === year);
        if (!dueSetting?.is_waived) {
          const monthlyAmount = dueSetting?.monthly_amount || 3000;
          const monthsInYear = year === currentYear ? currentMonth : 12;
          
          // Check for individual member waivers for this year
          const yearWaivers = duesWaivers.filter(w => w.year === year);
          const waivedMonths = yearWaivers.flatMap(w => w.months || []);
          
          // Only count months that are not waived
          for (let month = 1; month <= monthsInYear; month++) {
            if (!waivedMonths.includes(month)) {
              totalDuesExpected += monthlyAmount;
            }
          }
        }
      }

      const memberDues = duesPaymentsResult.data?.filter(p => p.user_id === member.id) || [];
      const totalDuesPaid = memberDues.reduce((sum, p) => sum + Number(p.amount), 0);
      const duesOwing = totalDuesExpected - totalDuesPaid;

      const memberEventPayments = eventPaymentsResult.data?.filter(p => p.user_id === member.id) || [];
      const paidEventIds = memberEventPayments.map(p => p.event_id);
      // Filter out waived events from unpaid events
      const unpaidEvents = eventsResult.data?.filter(event => 
        !paidEventIds.includes(event.id) && !waivedEventIds.includes(event.id)
      ) || [];
      const totalEventsOwed = unpaidEvents.reduce((sum, e) => sum + Number(e.amount), 0);

      return {
        ...member,
        duesOwing: duesOwing > 0 ? duesOwing : 0,
        eventsOwing: totalEventsOwed > 0 ? totalEventsOwed : 0,
        totalOwing: (duesOwing > 0 ? duesOwing : 0) + (totalEventsOwed > 0 ? totalEventsOwed : 0)
      };
    }) || [];

    setMembersWithOwing(membersData);
    setDataLoading(false);
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
          console.error("Error making admin:", error);
          toast.error(`Failed to make member admin: ${error.message}`);
        } else {
          toast.success(`${userName} is now an admin`);
          loadMembers();
        }
        setConfirmDialog({ ...confirmDialog, open: false });
      },
    });
  };

  const handleAssignRole = (member: any) => {
    setSelectedMember(member);
    setAssignRoleDialog(true);
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
          console.error("Error removing admin:", error);
          toast.error(`Failed to remove admin access: ${error.message}`);
        } else {
          toast.success(`${userName} is no longer an admin`);
          loadMembers();
        }
        setConfirmDialog({ ...confirmDialog, open: false });
      },
    });
  };

  const handleDeleteMember = async () => {
    if (!deleteMemberDialog.member) return;
    const member = deleteMemberDialog.member;
    const expectedText = `DELETE ${member.first_name} ${member.last_name}`;
    if (deleteMemberDialog.confirmText !== expectedText) {
      toast.error(`Please type "${expectedText}" to confirm`);
      return;
    }

    setDeletingMember(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const { data, error } = await supabase.functions.invoke('delete-member', {
        body: { memberId: member.id },
        headers: { Authorization: `Bearer ${session?.access_token}` },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast.success(`${member.first_name} ${member.last_name} has been deleted`);
      setDeleteMemberDialog({ open: false, member: null, confirmText: "" });
      loadMembers();
    } catch (error: any) {
      toast.error(error.message || "Failed to delete member");
    } finally {
      setDeletingMember(false);
    }
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

  if (loading || (!isAdmin && !isFinancialSecretary)) {
    return <Spinner size="lg" />;
  }

  if (dataLoading) {
    return (
      <div className="flex min-h-screen bg-background">
        <AdminSidebar />
        <main className="flex-1">
          <Spinner size="lg" />
        </main>
      </div>
    );
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

          <div className="mb-4 md:mb-6 flex flex-col md:flex-row gap-3 md:gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-3 h-3 md:w-4 md:h-4" />
              <Input
                placeholder="Search by name or member ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 md:pl-10 text-xs md:text-sm h-8 md:h-10"
              />
            </div>
            <Button
              onClick={() => setAddMemberDialog(true)}
              className="h-8 md:h-10 text-xs md:text-sm"
            >
              <UserPlus className="w-3 h-3 md:w-4 md:h-4 mr-1 md:mr-2" />
              Add Member
            </Button>
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

                  <div className="flex flex-col gap-2 pt-2">
                    {isFinancialSecretary && (
                      <div className="grid grid-cols-2 gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedMember(member);
                            setPaymentsDialog(true);
                          }}
                          className="h-8 text-xs"
                        >
                          <DollarSign className="h-3 w-3 mr-1" />
                          Pay
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedMember(member);
                            setWaiverDialog(true);
                          }}
                          className="h-8 text-xs"
                        >
                          <Ban className="h-3 w-3 mr-1" />
                          Waive
                        </Button>
                      </div>
                    )}
                    {isSuperAdmin ? (
                      <div className="flex gap-2 flex-1">
                        <Button
                          variant="default"
                          size="sm"
                          onClick={() => handleAssignRole(member)}
                          className="h-8 px-3 flex-1"
                          title="Assign Role"
                        >
                          <UserCog className="h-3 w-3 mr-1" />
                          <span className="text-xs">Assign</span>
                        </Button>
                        {member.isAdmin ? (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleRemoveAdmin(member.id, `${member.first_name} ${member.last_name}`)}
                            className="h-8 px-2"
                            title="Remove Admin"
                          >
                            <ShieldOff className="h-3 w-3" />
                          </Button>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleMakeAdmin(member.id, `${member.first_name} ${member.last_name}`)}
                            className="h-8 px-2"
                            title="Make Admin"
                          >
                            <UserCog className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    ) : null}
                    {(isSuperAdmin || isFinancialSecretary) && (
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => setDeleteMemberDialog({ open: true, member, confirmText: "" })}
                        className="h-8 text-xs w-full"
                      >
                        <Trash2 className="h-3 w-3 mr-1" />
                        Delete Member
                      </Button>
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

      <AssignRoleDialog
        open={assignRoleDialog}
        onOpenChange={setAssignRoleDialog}
        member={selectedMember}
        onSuccess={loadMembers}
      />

      <AddMemberDialog
        open={addMemberDialog}
        onOpenChange={setAddMemberDialog}
        onSuccess={loadMembers}
      />

      <MemberWaiverDialog
        open={waiverDialog}
        onOpenChange={setWaiverDialog}
        member={selectedMember}
        onSuccess={loadMembers}
      />

      <Dialog
        open={deleteMemberDialog.open}
        onOpenChange={(open) => {
          if (!open) setDeleteMemberDialog({ open: false, member: null, confirmText: "" });
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-destructive">⚠️ Delete Member Permanently</DialogTitle>
            <DialogDescription className="space-y-3 pt-2">
              <div className="p-3 bg-destructive/10 border border-destructive/30 rounded-lg text-sm text-destructive font-medium">
                WARNING: This action is IRREVERSIBLE. This will permanently delete the member's account, profile, and ALL associated data including payment records, votes, and forum posts.
              </div>
              {deleteMemberDialog.member && (
                <div className="text-sm">
                  <p><strong>Member:</strong> {deleteMemberDialog.member.first_name} {deleteMemberDialog.member.last_name}</p>
                  <p><strong>ID:</strong> {deleteMemberDialog.member.member_id}</p>
                </div>
              )}
              <p className="text-sm">
                To confirm, type: <code className="bg-muted px-1.5 py-0.5 rounded font-bold">DELETE {deleteMemberDialog.member?.first_name} {deleteMemberDialog.member?.last_name}</code>
              </p>
            </DialogDescription>
          </DialogHeader>
          <Input
            value={deleteMemberDialog.confirmText}
            onChange={(e) => setDeleteMemberDialog(prev => ({ ...prev, confirmText: e.target.value }))}
            placeholder={`Type DELETE ${deleteMemberDialog.member?.first_name} ${deleteMemberDialog.member?.last_name}`}
            className="font-mono"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteMemberDialog({ open: false, member: null, confirmText: "" })}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={
                deletingMember ||
                deleteMemberDialog.confirmText !== `DELETE ${deleteMemberDialog.member?.first_name} ${deleteMemberDialog.member?.last_name}`
              }
              onClick={handleDeleteMember}
            >
              {deletingMember ? "Deleting..." : "Delete Permanently"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Members;
