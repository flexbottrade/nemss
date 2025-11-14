import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const useRole = () => {
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [isFinancialSecretary, setIsFinancialSecretary] = useState(false);

  useEffect(() => {
    const fetchRole = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      // Check if user is super admin
      const { data: superAdminCheck, error: superAdminError } = await supabase.rpc('is_super_admin', { _user_id: user.id });
      if (superAdminError) {
        console.error('Error checking super admin status:', superAdminError);
      }
      setIsSuperAdmin(superAdminCheck || false);

      // Check if user is financial secretary
      const { data: financialSecretaryCheck, error: financialSecretaryError } = await supabase.rpc('is_financial_secretary' as any, { _user_id: user.id });
      if (financialSecretaryError) {
        console.error('Error checking financial secretary status:', financialSecretaryError);
      }
      setIsFinancialSecretary(financialSecretaryCheck || false);

      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .single();

      setRole(data?.role || "member");
      setLoading(false);
    };

    fetchRole();
  }, []);

  return { role, isAdmin: role === "admin" || role === "super_admin" || role === "financial_secretary", isSuperAdmin, isFinancialSecretary, loading };
};
