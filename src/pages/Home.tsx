import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Users, TrendingUp, Award, Mail } from "lucide-react";
import { Link } from "react-router-dom";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const Home = () => {
  const [formData, setFormData] = useState({ name: "", email: "", message: "" });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.email || !formData.message) {
      toast.error("Please fill in all fields");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from("contact_messages")
        .insert([formData]);

      if (error) throw error;

      toast.success("Message sent successfully!");
      setFormData({ name: "", email: "", message: "" });
    } catch (error) {
      toast.error("Failed to send message. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-secondary">
      {/* Header */}
      <header className="border-b border-border/50 backdrop-blur-sm sticky top-0 z-50 bg-background/80">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-primary-dark flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-lg">N</span>
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">NEMSS09 Set</h1>
              <p className="text-xs text-muted-foreground">Association Portal</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" asChild>
              <Link to="/login">Login</Link>
            </Button>
            <Button asChild className="bg-gradient-to-r from-primary to-primary-dark hover:opacity-90">
              <Link to="/signup">Sign Up</Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-20 text-center">
        <div className="max-w-3xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-1000">
          <h2 className="text-5xl md:text-6xl font-bold bg-gradient-to-r from-primary via-primary-dark to-accent bg-clip-text text-transparent">
            Welcome to NEMSS09 Set
          </h2>
          <p className="text-lg md:text-xl text-muted-foreground">
            A unified platform for managing dues, events, and staying connected with your school set association
          </p>
          <div className="flex gap-4 justify-center pt-4">
            <Button size="lg" asChild className="bg-gradient-to-r from-primary to-primary-dark hover:opacity-90 shadow-lg">
              <Link to="/signup">Join Now</Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link to="/login">Member Login</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="container mx-auto px-4 py-16">
        <div className="grid md:grid-cols-3 gap-6">
          <Card className="border-border/50 shadow-md hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
            <CardContent className="pt-6 text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary/10 to-primary/20 flex items-center justify-center mx-auto">
                <Users className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-xl font-semibold">Member Management</h3>
              <p className="text-muted-foreground">
                Track all members with auto-generated IDs and organized profiles
              </p>
            </CardContent>
          </Card>

          <Card className="border-border/50 shadow-md hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
            <CardContent className="pt-6 text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-accent/10 to-accent/20 flex items-center justify-center mx-auto">
                <TrendingUp className="w-8 h-8 text-accent" />
              </div>
              <h3 className="text-xl font-semibold">Financial Tracking</h3>
              <p className="text-muted-foreground">
                Manage monthly dues and event contributions with transparent reporting
              </p>
            </CardContent>
          </Card>

          <Card className="border-border/50 shadow-md hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
            <CardContent className="pt-6 text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-highlight/10 to-highlight/20 flex items-center justify-center mx-auto">
                <Award className="w-8 h-8 text-highlight" />
              </div>
              <h3 className="text-xl font-semibold">Elections & Voting</h3>
              <p className="text-muted-foreground">
                Democratic election system for leadership positions
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Contact Form */}
      <section className="container mx-auto px-4 py-16">
        <Card className="max-w-2xl mx-auto border-border/50 shadow-lg">
          <CardContent className="pt-6">
            <div className="text-center mb-8">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center mx-auto mb-4">
                <Mail className="w-6 h-6 text-primary-foreground" />
              </div>
              <h3 className="text-2xl font-bold mb-2">Get in Touch</h3>
              <p className="text-muted-foreground">Have questions? Send us a message</p>
              <p className="text-sm text-muted-foreground mt-2">Email: info@nemss09set.com</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Input
                  placeholder="Your Name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="border-border/50"
                />
              </div>
              <div>
                <Input
                  type="email"
                  placeholder="Your Email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="border-border/50"
                />
              </div>
              <div>
                <Textarea
                  placeholder="Your Message"
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  className="border-border/50 min-h-[120px]"
                />
              </div>
              <Button 
                type="submit" 
                className="w-full bg-gradient-to-r from-primary to-primary-dark hover:opacity-90"
                disabled={loading}
              >
                {loading ? "Sending..." : "Send Message"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/50 py-8 mt-16">
        <div className="container mx-auto px-4 text-center text-muted-foreground">
          <p>&copy; 2025 NEMSS09 Set Association. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};

export default Home;