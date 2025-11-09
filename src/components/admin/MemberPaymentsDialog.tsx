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
import { Edit, Plus } from "lucide-react";
import { ManualDuesPaymentDialog } from "./ManualDuesPaymentDialog";
import { ManualEventPaymentDialog } from "./ManualEventPaymentDialog";
import { ManualDonationPaymentDialog } from "./ManualDonationPaymentDialog";

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
  const [editingPayment, setEditingPayment] = useState<any>(null);

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

  const handleEditDues = (payment: any) => {
    setEditingPayment(payment);
    setDuesDialogOpen(true);
  };

  const handleEditEvent = (payment: any) => {
    setEditingPayment(payment);
    setEventDialogOpen(true);
  };

  const handleEditDonation = (payment: any) => {
    setEditingPayment(payment);
    setDonationDialogOpen(true);
  };

  const handleDialogClose = (dialogSetter: (open: boolean) => void) => {
    dialogSetter(false);
    setEditingPayment(null);
    loadPayments();
    onSuccess();
  };

  if (!member) return null;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Manage Payments for {member.first_name} {member.last_name}</DialogTitle>
          </DialogHeader>
          
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
                {duesPayments.map((payment) => (
                  <div key={payment.id} className="p-3 border rounded-lg flex justify-between items-center">
                    <div>
                      <p className="font-medium">₦{payment.amount.toLocaleString()}</p>
                      <p className="text-sm text-muted-foreground">
                        {payment.start_year} - Month {payment.start_month} ({payment.months_paid} months)
                      </p>
                      {payment.admin_note && (
                        <p className="text-xs text-muted-foreground mt-1">{payment.admin_note}</p>
                      )}
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => handleEditDues(payment)}>
                      <Edit className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
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
                      {payment.admin_note && (
                        <p className="text-xs text-muted-foreground mt-1">{payment.admin_note}</p>
                      )}
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => handleEditEvent(payment)}>
                      <Edit className="w-4 h-4" />
                    </Button>
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
                      {payment.admin_note && (
                        <p className="text-xs text-muted-foreground mt-1">{payment.admin_note}</p>
                      )}
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => handleEditDonation(payment)}>
                      <Edit className="w-4 h-4" />
                    </Button>
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
        existingPayment={editingPayment}
      />

      <ManualEventPaymentDialog
        open={eventDialogOpen}
        onOpenChange={(open) => handleDialogClose(setEventDialogOpen)}
        memberId={member.id}
        memberName={`${member.first_name} ${member.last_name}`}
        onSuccess={() => {}}
        existingPayment={editingPayment}
      />

      <ManualDonationPaymentDialog
        open={donationDialogOpen}
        onOpenChange={(open) => handleDialogClose(setDonationDialogOpen)}
        memberId={member.id}
        memberName={`${member.first_name} ${member.last_name}`}
        onSuccess={() => {}}
        existingPayment={editingPayment}
      />
    </>
  );
};
