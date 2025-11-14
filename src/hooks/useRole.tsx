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
      const { data: superAdminCheck } = await supabase.rpc('is_super_admin', { _user_id: user.id });
      setIsSuperAdmin(superAdminCheck || false);

      // Check if user is financial secretary
      const { data: financialSecretaryCheck } = await supabase.rpc('is_financial_secretary', { _user_id: user.id });
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
