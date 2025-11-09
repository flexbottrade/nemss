import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import { ManualDuesPaymentDialog } from "./ManualDuesPaymentDialog";
import { ManualEventPaymentDialog } from "./ManualEventPaymentDialog";
import { ManualDonationPaymentDialog } from "./ManualDonationPaymentDialog";
import { ConfirmationDialog } from "../ConfirmationDialog";

interface MemberPaymentsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  member: {
    id: string;
    first_name: string;
    last_name: string;
  } | null;
  onSuccess: () => void;
}

export const MemberPaymentsDialog = ({
  open,
  onOpenChange,
  member,
  onSuccess,
}: MemberPaymentsDialogProps) => {
  const [duesPayments, setDuesPayments] = useState<any[]>([]);
  const [eventPayments, setEventPayments] = useState<any[]>([]);
  const [donationPayments, setDonationPayments] = useState<any[]>([]);
  const [duesDialogOpen, setDuesDialogOpen] = useState(false);
  const [eventDialogOpen, setEventDialogOpen] = useState(false);
  const [donationDialogOpen, setDonationDialogOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [paymentToDelete, setPaymentToDelete] = useState<{ ids: string[]; type: 'dues' | 'event' | 'donation' } | null>(null);

  useEffect(() => {
    if (member && open) {
      loadPayments();
    }
  }, [member, open]);

  const loadPayments = async () => {
    if (!member) return;

    const { data: dues } = await supabase
      .from("dues_payments")
      .select("*")
      .eq("user_id", member.id)
      .eq("is_manually_updated", true)
      .order("created_at", { ascending: false });

    const { data: events } = await supabase
      .from("event_payments")
      .select("*, events(title)")
      .eq("user_id", member.id)
      .eq("is_manually_updated", true)
      .order("created_at", { ascending: false });

    const { data: donations } = await supabase
      .from("donation_payments")
      .select("*, donations(title)")
      .eq("user_id", member.id)
      .eq("is_manually_updated", true)
      .order("created_at", { ascending: false });

    setDuesPayments(dues || []);
    setEventPayments(events || []);
    setDonationPayments(donations || []);
  };

  const handleDialogClose = (dialogSetter: (open: boolean) => void) => {
    dialogSetter(false);
    loadPayments();
    onSuccess();
  };

  const handleDeleteClick = (ids: string[], type: 'dues' | 'event' | 'donation') => {
    setPaymentToDelete({ ids, type });
    setDeleteConfirmOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!paymentToDelete) return;

    const table = paymentToDelete.type === 'dues' 
      ? 'dues_payments' 
      : paymentToDelete.type === 'event' 
      ? 'event_payments' 
      : 'donation_payments';

    const { error } = await supabase
      .from(table)
      .delete()
      .in("id", paymentToDelete.ids);

    if (error) {
      toast.error("Failed to delete payment");
    } else {
      toast.success(`Payment${paymentToDelete.ids.length > 1 ? 's' : ''} deleted successfully`);
      loadPayments();
      onSuccess();
    }

    setDeleteConfirmOpen(false);
    setPaymentToDelete(null);
  };

  if (!member) return null;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Manage Payments for {member.first_name} {member.last_name}</DialogTitle>
          </DialogHeader>
          
          <div className="bg-muted/50 p-3 rounded-lg text-sm text-muted-foreground mb-4">
            <p><strong>Note:</strong> Manual payments can only be deleted, not edited. To correct a payment, delete it and add a new one to avoid mistakes.</p>
          </div>
          
          <Tabs defaultValue="dues" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="dues">Dues</TabsTrigger>
              <TabsTrigger value="events">Events</TabsTrigger>
              <TabsTrigger value="donations">Donations</TabsTrigger>
            </TabsList>
            
            <TabsContent value="dues" className="space-y-4">
              <Button onClick={() => setDuesDialogOpen(true)} className="w-full">
                <Plus className="w-4 h-4 mr-2" />
                Add Dues Payment
              </Button>
              <div className="space-y-2">
                {(() => {
                  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
                  
                  // Group payments by year
                  const paymentsByYear = duesPayments.reduce((acc, payment) => {
                    const year = payment.start_year;
                    if (!acc[year]) acc[year] = [];
                    acc[year].push(payment);
                    return acc;
                  }, {} as Record<number, any[]>);
                  
                  return Object.entries(paymentsByYear).map(([year, yearPayments]: [string, any[]]) => {
                    // Sort by month
                    yearPayments.sort((a: any, b: any) => a.start_month - b.start_month);
                    
                    // Group consecutive months
                    const groups: any[][] = [];
                    let currentGroup: any[] = [];
                    
                    yearPayments.forEach((payment, index) => {
                      if (currentGroup.length === 0) {
                        currentGroup.push(payment);
                      } else {
                        const lastPayment = currentGroup[currentGroup.length - 1];
                        if (payment.start_month === lastPayment.start_month + 1) {
                          currentGroup.push(payment);
                        } else {
                          groups.push(currentGroup);
                          currentGroup = [payment];
                        }
                      }
                      
                      if (index === yearPayments.length - 1) {
                        groups.push(currentGroup);
                      }
                    });
                    
                    return groups.map((group, groupIndex) => {
                      const firstPayment = group[0];
                      const lastPayment = group[group.length - 1];
                      const totalAmount = group.reduce((sum, p) => sum + Number(p.amount), 0);
                      const monthRange = group.length === 1 
                        ? months[firstPayment.start_month - 1]
                        : `${months[firstPayment.start_month - 1]} - ${months[lastPayment.start_month - 1]}`;
                      
                      return (
                        <div key={`${year}-${groupIndex}`} className="p-3 border rounded-lg flex justify-between items-center">
                          <div>
                            <p className="font-medium">₦{totalAmount.toLocaleString()}</p>
                            <p className="text-sm text-muted-foreground">
                              {year} - {monthRange}
                            </p>
                          </div>
                          <div>
                            <Button variant="ghost" size="sm" onClick={() => handleDeleteClick(group.map(p => p.id), 'dues')}>
                              <Trash2 className="w-4 h-4 text-destructive" />
                            </Button>
                          </div>
                        </div>
                      );
                    });
                  });
                })()}
                {duesPayments.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">No manual dues payments</p>
                )}
              </div>
            </TabsContent>
            
            <TabsContent value="events" className="space-y-4">
              <Button onClick={() => setEventDialogOpen(true)} className="w-full">
                <Plus className="w-4 h-4 mr-2" />
                Add Event Payment
              </Button>
              <div className="space-y-2">
                {eventPayments.map((payment) => (
                  <div key={payment.id} className="p-3 border rounded-lg flex justify-between items-center">
                    <div>
                      <p className="font-medium">₦{payment.amount.toLocaleString()}</p>
                      <p className="text-sm text-muted-foreground">{payment.events?.title}</p>
                    </div>
                    <div>
                      <Button variant="ghost" size="sm" onClick={() => handleDeleteClick([payment.id], 'event')}>
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                ))}
                {eventPayments.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">No manual event payments</p>
                )}
              </div>
            </TabsContent>
            
            <TabsContent value="donations" className="space-y-4">
              <Button onClick={() => setDonationDialogOpen(true)} className="w-full">
                <Plus className="w-4 h-4 mr-2" />
                Add Donation Payment
              </Button>
              <div className="space-y-2">
                {donationPayments.map((payment) => (
                  <div key={payment.id} className="p-3 border rounded-lg flex justify-between items-center">
                    <div>
                      <p className="font-medium">₦{payment.amount.toLocaleString()}</p>
                      <p className="text-sm text-muted-foreground">{payment.donations?.title}</p>
                    </div>
                    <div>
                      <Button variant="ghost" size="sm" onClick={() => handleDeleteClick([payment.id], 'donation')}>
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                ))}
                {donationPayments.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">No manual donation payments</p>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      <ManualDuesPaymentDialog
        open={duesDialogOpen}
        onOpenChange={(open) => handleDialogClose(setDuesDialogOpen)}
        memberId={member.id}
        memberName={`${member.first_name} ${member.last_name}`}
        onSuccess={() => {}}
      />

      <ManualEventPaymentDialog
        open={eventDialogOpen}
        onOpenChange={(open) => handleDialogClose(setEventDialogOpen)}
        memberId={member.id}
        memberName={`${member.first_name} ${member.last_name}`}
        onSuccess={() => {}}
      />

      <ManualDonationPaymentDialog
        open={donationDialogOpen}
        onOpenChange={(open) => handleDialogClose(setDonationDialogOpen)}
        memberId={member.id}
        memberName={`${member.first_name} ${member.last_name}`}
        onSuccess={() => {}}
      />

      <ConfirmationDialog
        open={deleteConfirmOpen}
        onOpenChange={setDeleteConfirmOpen}
        onConfirm={handleDeleteConfirm}
        title="Delete Payment"
        description="Are you sure you want to delete this manual payment? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
      />
    </>
  );
};
