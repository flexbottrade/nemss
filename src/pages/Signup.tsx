import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff, ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const Signup = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phoneNumber: "",
    password: "",
    confirmPassword: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (formData.password !== formData.confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    if (formData.password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }

    if (!formData.email || !formData.email.includes('@')) {
      toast.error("Please enter a valid email address");
      return;
    }

    const phoneRegex = /^0\d{10}$/;
    if (!phoneRegex.test(formData.phoneNumber)) {
      toast.error("Phone number must be 11 digits starting with 0");
      return;
    }

    setLoading(true);
    try {
      // Generate member ID
      const { data: memberIdData, error: memberIdError } = await supabase.rpc('generate_member_id');
      
      if (memberIdError) throw memberIdError;
      
      const memberId = memberIdData as string;

      // Create auth user with metadata
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            first_name: formData.firstName,
            last_name: formData.lastName,
            phone_number: formData.phoneNumber,
            member_id: memberId,
          }
        }
      });

      if (authError) throw authError;

      if (authData.user) {
        toast.success(`Account created successfully! Your Member ID is ${memberId}`);
        navigate("/dashboard");
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to create account");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md border-border bg-accent shadow-xl">
        <CardHeader className="space-y-1 p-4 md:p-6">
          <Button
            variant="ghost"
            size="sm"
            className="w-fit mb-2 h-8 text-xs md:text-sm"
            asChild
          >
            <Link to="/">
              <ArrowLeft className="w-3 h-3 md:w-4 md:h-4 mr-1 md:mr-2" />
              Back
            </Link>
          </Button>
          <CardTitle className="text-xl md:text-2xl font-bold text-accent-foreground">Create Account</CardTitle>
          <CardDescription className="text-xs md:text-sm text-accent-foreground/80">Join NEMSS09 Set Association</CardDescription>
        </CardHeader>
        <CardContent className="p-4 md:p-6 pt-0">
          <form onSubmit={handleSubmit} className="space-y-3 md:space-y-4">
            <div className="grid grid-cols-2 gap-3 md:gap-4">
              <div className="space-y-1 md:space-y-2">
                <Label htmlFor="firstName" className="text-xs md:text-sm">First Name</Label>
                <Input
                  id="firstName"
                  placeholder="John"
                  value={formData.firstName}
                  onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-1 md:space-y-2">
                <Label htmlFor="lastName" className="text-xs md:text-sm">Last Name</Label>
                <Input
                  id="lastName"
                  placeholder="Doe"
                  value={formData.lastName}
                  onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="space-y-1 md:space-y-2">
              <Label htmlFor="email" className="text-xs md:text-sm">Email Address</Label>
              <Input
                id="email"
                type="email"
                placeholder="your.email@example.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
              />
            </div>

            <div className="space-y-1 md:space-y-2">
              <Label htmlFor="phoneNumber" className="text-xs md:text-sm">Phone Number</Label>
              <Input
                id="phoneNumber"
                placeholder="08030010010"
                value={formData.phoneNumber}
                onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                required
              />
            </div>

            <div className="space-y-1 md:space-y-2">
              <Label htmlFor="password" className="text-xs md:text-sm">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-1 md:space-y-2">
              <Label htmlFor="confirmPassword" className="text-xs md:text-sm">Confirm Password</Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              className="w-full bg-primary hover:bg-primary/90 h-9 md:h-10 text-sm md:text-base"
              disabled={loading}
            >
              {loading ? "Creating Account..." : "Sign Up"}
            </Button>

            <p className="text-center text-xs md:text-sm text-accent-foreground/70">
              Already have an account?{" "}
              <Link to="/login" className="text-primary hover:underline">
                Login
              </Link>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default Signup;