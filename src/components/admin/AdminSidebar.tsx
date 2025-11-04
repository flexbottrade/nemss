import { NavLink, useNavigate } from "react-router-dom";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Users, DollarSign, Calendar, Settings, FileText, CreditCard, BarChart3, Menu, LogOut, LayoutDashboard } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useState } from "react";

const menuItems = [
  { title: "Dashboard", url: "/admin", icon: LayoutDashboard },
  { title: "Members", url: "/admin/members", icon: Users },
  { title: "Transactions", url: "/admin/transactions", icon: DollarSign },
  { title: "Payment Accounts", url: "/admin/accounts", icon: CreditCard },
  { title: "Finance", url: "/admin/finance", icon: BarChart3 },
  { title: "Events", url: "/admin/events", icon: Calendar },
  { title: "Settings", url: "/admin/settings", icon: Settings },
  { title: "Reports", url: "/admin/reports", icon: FileText },
];

export const AdminSidebar = () => {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast.success("Logged out successfully");
    navigate("/");
  };

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      <div className="p-4 md:p-6 border-b">
        <h2 className="text-base md:text-lg font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
          NEMSS09 Admin
        </h2>
      </div>
      
      <nav className="flex-1 p-2 md:p-4 space-y-1">
        {menuItems.map((item) => (
          <NavLink
            key={item.url}
            to={item.url}
            end={item.url === "/admin"}
            onClick={() => setOpen(false)}
            className={({ isActive }) =>
              `flex items-center gap-2 md:gap-3 px-3 md:px-4 py-2 md:py-3 rounded-lg transition-colors text-sm md:text-base ${
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "hover:bg-muted"
              }`
            }
          >
            <item.icon className="w-4 h-4 md:w-5 md:h-5 flex-shrink-0" />
            <span>{item.title}</span>
          </NavLink>
        ))}
      </nav>

      <div className="p-2 md:p-4 border-t">
        <Button
          variant="ghost"
          className="w-full justify-start text-sm md:text-base"
          onClick={handleLogout}
        >
          <LogOut className="w-4 h-4 md:w-5 md:h-5 mr-2 md:mr-3" />
          Logout
        </Button>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile Hamburger */}
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild className="md:hidden">
          <Button variant="ghost" size="icon" className="fixed top-4 left-4 z-50">
            <Menu className="w-5 h-5" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-64 p-0">
          <SidebarContent />
        </SheetContent>
      </Sheet>

      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-64 border-r bg-background flex-col">
        <SidebarContent />
      </aside>
    </>
  );
};
