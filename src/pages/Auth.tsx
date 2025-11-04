import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff, ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const Auth = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loginData, setLoginData] = useState({
    email: "",
    password: "",
  });
  const [signupData, setSignupData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phoneNumber: "",
    password: "",
    confirmPassword: "",
  });

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: loginData.email,
        password: loginData.password,
      });

      if (error) throw error;

      const { data: roleData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", data.user.id)
        .single();

      toast.success("Login successful!");
      
      if (roleData?.role === "admin") {
        navigate("/admin");
      } else {
        navigate("/dashboard");
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to login");
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (signupData.password !== signupData.confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    if (signupData.password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }

    if (!signupData.email || !signupData.email.includes('@')) {
      toast.error("Please enter a valid email address");
      return;
    }

    const phoneRegex = /^0\d{10}$/;
    if (!phoneRegex.test(signupData.phoneNumber)) {
      toast.error("Phone number must be 11 digits starting with 0");
      return;
    }

    setLoading(true);
    try {
      const { data: memberIdData, error: memberIdError } = await supabase.rpc('generate_member_id');
      
      if (memberIdError) throw memberIdError;
      
      const memberId = memberIdData as string;

      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: signupData.email,
        password: signupData.password,
        options: {
          data: {
            first_name: signupData.firstName,
            last_name: signupData.lastName,
            phone_number: signupData.phoneNumber,
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
            onClick={() => navigate("/")}
          >
            <ArrowLeft className="w-3 h-3 md:w-4 md:h-4 mr-1 md:mr-2 text-[#0E3B43]" />
            <span className="text-[#0E3B43]">Back</span>
          </Button>
          <CardTitle className="text-xl md:text-2xl font-bold text-[#0E3B43]">NEMSS09 Set</CardTitle>
          <CardDescription className="text-xs md:text-sm text-[#0E3B43]/80">
            Access your alumni account
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4 md:p-6 pt-0">
          <Tabs defaultValue="login" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-4">
              <TabsTrigger value="login">Login</TabsTrigger>
              <TabsTrigger value="signup">Sign Up</TabsTrigger>
            </TabsList>
            
            <TabsContent value="login">
              <form onSubmit={handleLogin} className="space-y-3 md:space-y-4">
                <div className="space-y-1 md:space-y-2">
                  <Label htmlFor="login-email" className="text-xs md:text-sm text-[#0E3B43]">Email Address</Label>
                  <Input
                    id="login-email"
                    type="email"
                    placeholder="your.email@example.com"
                    value={loginData.email}
                    onChange={(e) => setLoginData({ ...loginData, email: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-1 md:space-y-2">
                  <Label htmlFor="login-password" className="text-xs md:text-sm text-[#0E3B43]">Password</Label>
                  <div className="relative">
                    <Input
                      id="login-password"
                      type={showPassword ? "text" : "password"}
                      value={loginData.password}
                      onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[#0E3B43]/70 hover:text-[#0E3B43]"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <Button
                  type="submit"
                  className="w-full h-9 md:h-10 text-sm md:text-base"
                  disabled={loading}
                >
                  {loading ? "Logging in..." : "Login"}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="signup">
              <form onSubmit={handleSignup} className="space-y-3 md:space-y-4">
                <div className="grid grid-cols-2 gap-3 md:gap-4">
                  <div className="space-y-1 md:space-y-2">
                    <Label htmlFor="firstName" className="text-xs md:text-sm text-[#0E3B43]">First Name</Label>
                    <Input
                      id="firstName"
                      placeholder="John"
                      value={signupData.firstName}
                      onChange={(e) => setSignupData({ ...signupData, firstName: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-1 md:space-y-2">
                    <Label htmlFor="lastName" className="text-xs md:text-sm text-[#0E3B43]">Last Name</Label>
                    <Input
                      id="lastName"
                      placeholder="Doe"
                      value={signupData.lastName}
                      onChange={(e) => setSignupData({ ...signupData, lastName: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div className="space-y-1 md:space-y-2">
                  <Label htmlFor="signup-email" className="text-xs md:text-sm text-[#0E3B43]">Email Address</Label>
                  <Input
                    id="signup-email"
                    type="email"
                    placeholder="your.email@example.com"
                    value={signupData.email}
                    onChange={(e) => setSignupData({ ...signupData, email: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-1 md:space-y-2">
                  <Label htmlFor="phoneNumber" className="text-xs md:text-sm text-[#0E3B43]">Phone Number</Label>
                  <Input
                    id="phoneNumber"
                    placeholder="08030010010"
                    value={signupData.phoneNumber}
                    onChange={(e) => setSignupData({ ...signupData, phoneNumber: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-1 md:space-y-2">
                  <Label htmlFor="signup-password" className="text-xs md:text-sm text-[#0E3B43]">Password</Label>
                  <div className="relative">
                    <Input
                      id="signup-password"
                      type={showPassword ? "text" : "password"}
                      value={signupData.password}
                      onChange={(e) => setSignupData({ ...signupData, password: e.target.value })}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[#0E3B43]/70 hover:text-[#0E3B43]"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-1 md:space-y-2">
                  <Label htmlFor="confirmPassword" className="text-xs md:text-sm text-[#0E3B43]">Confirm Password</Label>
                  <div className="relative">
                    <Input
                      id="confirmPassword"
                      type={showConfirmPassword ? "text" : "password"}
                      value={signupData.confirmPassword}
                      onChange={(e) => setSignupData({ ...signupData, confirmPassword: e.target.value })}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[#0E3B43]/70 hover:text-[#0E3B43]"
                    >
                      {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <Button
                  type="submit"
                  className="w-full h-9 md:h-10 text-sm md:text-base"
                  disabled={loading}
                >
                  {loading ? "Creating Account..." : "Sign Up"}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default Auth;
