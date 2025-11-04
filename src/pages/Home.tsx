import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Users, TrendingUp, Award, Calendar, Facebook, Twitter } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";

const Home = () => {
  const navigate = useNavigate();
  const [upcomingEvents, setUpcomingEvents] = useState<any[]>([]);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const loadUpcomingEvents = async () => {
      const { data } = await supabase
        .from("events")
        .select("*")
        .gte("event_date", new Date().toISOString())
        .order("event_date", { ascending: true })
        .limit(3);
      
      if (data) setUpcomingEvents(data);
    };
    loadUpcomingEvents();

    // Check auth state
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border sticky top-0 z-50 bg-background/95 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-xl">N</span>
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">NEMSS09 Set</h1>
              <p className="text-xs text-muted-foreground">Alumni Association</p>
            </div>
          </div>
          <nav className="hidden md:flex items-center gap-6">
            <Link to="/" className="text-sm font-medium hover:text-primary transition-colors">Home</Link>
            <Link to="/about" className="text-sm font-medium hover:text-primary transition-colors">About</Link>
            <Link to="/contact" className="text-sm font-medium hover:text-primary transition-colors">Contact</Link>
          </nav>
          <div className="flex gap-2">
            {user ? (
              <Button size="sm" className="bg-primary hover:bg-primary-light" asChild>
                <Link to="/dashboard">Member Dashboard</Link>
              </Button>
            ) : (
              <>
                <Button variant="ghost" size="sm" asChild>
                  <Link to="/auth">Login</Link>
                </Button>
                <Button size="sm" className="bg-primary hover:bg-primary-light" asChild>
                  <Link to="/auth">Sign Up</Link>
                </Button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-20 md:py-32 text-center">
        <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-1000">
          <div className="text-center">
            <h1 className="text-3xl md:text-5xl lg:text-6xl font-bold mb-4 md:mb-6 text-foreground">
              Together We Stand
            </h1>
            <p className="text-base md:text-xl lg:text-2xl mb-2 md:mb-4 text-foreground/90">
              NEMSS 2009 Set Alumni Association
            </p>
            <p className="text-sm md:text-lg text-foreground/80 mb-6 md:mb-8">
              Connecting the past, empowering the present, building the future.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-6">
            {user ? (
              <Button size="lg" className="bg-primary hover:bg-primary-light text-base" asChild>
                <Link to="/dashboard">Member Dashboard</Link>
              </Button>
            ) : (
              <>
                <Button size="lg" className="bg-primary hover:bg-primary-light text-base" asChild>
                  <Link to="/auth">Join Our Network</Link>
                </Button>
                <Button size="lg" variant="outline" className="text-base border-primary text-primary hover:bg-primary/10" asChild>
                  <Link to="/auth">Member Login</Link>
                </Button>
              </>
            )}
          </div>
        </div>
      </section>

      {/* Who We Are */}
      <section className="bg-card py-16 md:py-24">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center space-y-6">
            <h3 className="text-3xl md:text-4xl font-bold text-card-foreground">Who We Are</h3>
            <p className="text-lg text-card-foreground/90 leading-relaxed">
              We are proud alumni of New Era Model Secondary School, Class of 2009 — a family bound by memories, friendship, and a shared commitment to growth and impact. This platform connects us, keeps us informed, and helps us stay united as one family.
            </p>
          </div>
        </div>
      </section>

      {/* Mission & Vision */}
      <section className="container mx-auto px-4 py-16 md:py-24">
        <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
          <Card className="border-2 border-primary/20 shadow-lg hover:shadow-xl transition-shadow">
            <CardContent className="pt-8 space-y-4 text-center">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                <Award className="w-8 h-8 text-primary" />
              </div>
              <h4 className="text-2xl font-bold text-foreground">Our Mission</h4>
              <p className="text-muted-foreground">
                To foster unity, communication, and collaboration among all members of the 2009 graduating class.
              </p>
            </CardContent>
          </Card>

          <Card className="border-2 border-accent/20 shadow-lg hover:shadow-xl transition-shadow">
            <CardContent className="pt-8 space-y-4 text-center">
              <div className="w-16 h-16 rounded-full bg-accent/10 flex items-center justify-center mx-auto">
                <TrendingUp className="w-8 h-8 text-accent" />
              </div>
              <h4 className="text-2xl font-bold text-foreground">Our Vision</h4>
              <p className="text-muted-foreground">
                To build a lasting legacy that empowers members and contributes to the progress of New Era Model Secondary School.
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Upcoming Events */}
      {upcomingEvents.length > 0 && (
        <section className="bg-card py-16 md:py-24">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12">
              <h3 className="text-3xl md:text-4xl font-bold text-card-foreground mb-4">Upcoming Events</h3>
              <p className="text-card-foreground/80">Stay connected and join us at our upcoming gatherings</p>
            </div>
            <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
              {upcomingEvents.map((event) => (
                <Card key={event.id} className="hover:shadow-lg transition-shadow bg-background border-border">
                  <CardContent className="pt-6 space-y-3">
                    <div className="flex items-center gap-2 text-primary">
                      <Calendar className="w-5 h-5" />
                      <span className="text-sm font-medium">
                        {new Date(event.event_date).toLocaleDateString()}
                      </span>
                    </div>
                    <h4 className="text-xl font-semibold text-foreground">{event.title}</h4>
                    <p className="text-sm text-muted-foreground line-clamp-2">{event.description}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Join Network CTA */}
      <section className="container mx-auto px-4 py-16 md:py-24">
        <Card className="max-w-3xl mx-auto bg-primary text-primary-foreground shadow-xl">
          <CardContent className="pt-12 pb-12 text-center space-y-6">
            <div className="w-20 h-20 rounded-full bg-primary-foreground/10 flex items-center justify-center mx-auto">
              <Users className="w-10 h-10 text-primary-foreground" />
            </div>
            <h3 className="text-3xl md:text-4xl font-bold">Join Our Network</h3>
            <p className="text-lg text-primary-foreground/90">
              Haven't joined yet? Stay connected with fellow alumni, get updates, and share opportunities.
            </p>
            {user ? (
              <Button size="lg" className="bg-accent hover:bg-accent/90 text-accent-foreground text-base" asChild>
                <Link to="/dashboard">Member Dashboard</Link>
              </Button>
            ) : (
              <Button size="lg" className="bg-accent hover:bg-accent/90 text-accent-foreground text-base" asChild>
                <Link to="/signup">Become a Member</Link>
              </Button>
            )}
          </CardContent>
        </Card>
      </section>

      {/* Footer */}
      <footer className="border-t border-border bg-card py-12">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-3 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center">
                  <span className="text-primary-foreground font-bold">N</span>
                </div>
                <span className="font-bold text-lg text-card-foreground">NEMSS09 Set</span>
              </div>
              <p className="text-sm text-card-foreground/70">
                Building a lasting legacy since 2009
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-4 text-card-foreground">Quick Links</h4>
              <div className="space-y-2">
                <Link to="/about" className="block text-sm text-card-foreground/70 hover:text-primary transition-colors">About</Link>
                <Link to="/contact" className="block text-sm text-card-foreground/70 hover:text-primary transition-colors">Contact</Link>
                <a href="#" className="block text-sm text-card-foreground/70 hover:text-primary transition-colors">Privacy Policy</a>
              </div>
            </div>
            <div>
              <h4 className="font-semibold mb-4 text-card-foreground">Connect With Us</h4>
              <div className="flex gap-4">
                <a href="#" className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center hover:bg-primary hover:text-primary-foreground transition-colors">
                  <Facebook className="w-5 h-5" />
                </a>
                <a href="#" className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center hover:bg-primary hover:text-primary-foreground transition-colors">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                  </svg>
                </a>
                <a href="#" className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center hover:bg-primary hover:text-primary-foreground transition-colors">
                  <Twitter className="w-5 h-5" />
                </a>
              </div>
            </div>
          </div>
          <div className="border-t border-border pt-8 text-center text-sm text-card-foreground/70 space-y-2">
            <p>&copy; 2025 NEMSS09 Set Association. All rights reserved.</p>
            <p className="text-xs">
              Built by <a href="https://lotechdgs.com" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline font-medium">Lotech Digitals</a>
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Home;
