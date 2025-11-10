import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import logo from "@/assets/logo.png";

const PrivacyPolicy = () => {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border sticky top-0 z-50 bg-background/95 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={logo} alt="NEMSS09 Set Logo" className="w-12 h-12 rounded-full object-cover" />
            <div>
              <h1 className="text-xl font-bold text-foreground">NEMSS09 Set</h1>
              <p className="text-xs text-muted-foreground">Alumni Association</p>
            </div>
          </div>
          <Button variant="ghost" size="sm" asChild>
            <Link to="/home" className="flex items-center gap-2">
              <ArrowLeft className="w-4 h-4" />
              Back to Home
            </Link>
          </Button>
        </div>
      </header>

      {/* Privacy Policy Content */}
      <div className="container mx-auto px-4 py-8 md:py-16 max-w-4xl">
        <div className="space-y-6 md:space-y-8">
          <div className="text-center space-y-3 md:space-y-4">
            <h1 className="text-3xl md:text-5xl font-bold text-foreground">Privacy Policy</h1>
            <p className="text-sm md:text-base text-muted-foreground">
              Last updated: {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
            </p>
          </div>

          <div className="prose prose-sm md:prose-base prose-slate dark:prose-invert max-w-none space-y-6 md:space-y-8">
            <section className="space-y-3 md:space-y-4">
              <h2 className="text-xl md:text-2xl font-semibold text-foreground">Introduction</h2>
              <p className="text-sm md:text-base text-muted-foreground leading-relaxed">
                Welcome to NEMSS09 Set Alumni Association ("we," "our," or "us"). This Privacy Policy explains how we collect, use, disclose, and protect your information when you use our platform. By accessing or using our services, you agree to the terms outlined in this policy.
              </p>
            </section>

            <section className="space-y-3 md:space-y-4">
              <h2 className="text-xl md:text-2xl font-semibold text-foreground">Information We Collect</h2>
              <div className="space-y-3 md:space-y-4">
                <div>
                  <h3 className="text-base md:text-lg font-medium text-foreground mb-2">Personal Information</h3>
                  <p className="text-sm md:text-base text-muted-foreground leading-relaxed">
                    When you register as a member, we collect:
                  </p>
                  <ul className="list-disc list-inside space-y-1 md:space-y-2 text-sm md:text-base text-muted-foreground ml-2 md:ml-4 mt-2">
                    <li>Full name and contact information (email address, phone number)</li>
                    <li>Profile information (graduation year, occupation, location)</li>
                    <li>Payment information for dues and event registrations</li>
                    <li>Payment proof uploads (receipts, transaction screenshots)</li>
                  </ul>
                </div>

                <div>
                  <h3 className="text-base md:text-lg font-medium text-foreground mb-2">Usage Information</h3>
                  <p className="text-sm md:text-base text-muted-foreground leading-relaxed">
                    We automatically collect information about your interactions with our platform, including:
                  </p>
                  <ul className="list-disc list-inside space-y-1 md:space-y-2 text-sm md:text-base text-muted-foreground ml-2 md:ml-4 mt-2">
                    <li>Login activity and session data</li>
                    <li>Pages visited and features accessed</li>
                    <li>Device information and IP addresses</li>
                  </ul>
                </div>
              </div>
            </section>

            <section className="space-y-3 md:space-y-4">
              <h2 className="text-xl md:text-2xl font-semibold text-foreground">How We Use Your Information</h2>
              <p className="text-sm md:text-base text-muted-foreground leading-relaxed">
                We use the collected information for the following purposes:
              </p>
              <ul className="list-disc list-inside space-y-1 md:space-y-2 text-sm md:text-base text-muted-foreground ml-2 md:ml-4">
                <li>Managing member accounts and authentication</li>
                <li>Processing membership dues, event payments, and donations</li>
                <li>Sending event notifications and association updates</li>
                <li>Maintaining member directory and facilitating alumni connections</li>
                <li>Generating financial reports and tracking payment status</li>
                <li>Improving our platform and services</li>
                <li>Ensuring platform security and preventing fraud</li>
              </ul>
            </section>

            <section className="space-y-3 md:space-y-4">
              <h2 className="text-xl md:text-2xl font-semibold text-foreground">Information Sharing and Disclosure</h2>
              <p className="text-sm md:text-base text-muted-foreground leading-relaxed">
                We respect your privacy and do not sell your personal information. We may share your information in the following circumstances:
              </p>
              <ul className="list-disc list-inside space-y-1 md:space-y-2 text-sm md:text-base text-muted-foreground ml-2 md:ml-4">
                <li><strong className="text-foreground">Within the Association:</strong> Basic member information may be shared with other verified members through our member directory</li>
                <li><strong className="text-foreground">Service Providers:</strong> We work with trusted third-party services (payment processors, email services, cloud hosting) who help operate our platform</li>
                <li><strong className="text-foreground">Legal Requirements:</strong> We may disclose information if required by law or to protect the rights and safety of our members</li>
                <li><strong className="text-foreground">Association Leadership:</strong> Authorized administrators have access to member information for association management purposes</li>
              </ul>
            </section>

            <section className="space-y-3 md:space-y-4">
              <h2 className="text-xl md:text-2xl font-semibold text-foreground">Data Security</h2>
              <p className="text-sm md:text-base text-muted-foreground leading-relaxed">
                We implement industry-standard security measures to protect your personal information, including:
              </p>
              <ul className="list-disc list-inside space-y-1 md:space-y-2 text-sm md:text-base text-muted-foreground ml-2 md:ml-4">
                <li>Encrypted data transmission (HTTPS/SSL)</li>
                <li>Secure password storage using modern encryption</li>
                <li>Regular security audits and updates</li>
                <li>Access controls and authentication mechanisms</li>
                <li>Secure cloud storage for payment proofs and documents</li>
              </ul>
              <p className="text-sm md:text-base text-muted-foreground leading-relaxed mt-3">
                However, no method of transmission over the internet is 100% secure. While we strive to protect your information, we cannot guarantee absolute security.
              </p>
            </section>

            <section className="space-y-3 md:space-y-4">
              <h2 className="text-xl md:text-2xl font-semibold text-foreground">Your Rights and Choices</h2>
              <p className="text-sm md:text-base text-muted-foreground leading-relaxed">
                As a member, you have the following rights:
              </p>
              <ul className="list-disc list-inside space-y-1 md:space-y-2 text-sm md:text-base text-muted-foreground ml-2 md:ml-4">
                <li><strong className="text-foreground">Access:</strong> View and update your profile information at any time</li>
                <li><strong className="text-foreground">Correction:</strong> Request corrections to your personal information</li>
                <li><strong className="text-foreground">Deletion:</strong> Request deletion of your account (subject to legal retention requirements)</li>
                <li><strong className="text-foreground">Opt-out:</strong> Unsubscribe from non-essential email communications</li>
                <li><strong className="text-foreground">Data Portability:</strong> Request a copy of your data in a portable format</li>
              </ul>
            </section>

            <section className="space-y-3 md:space-y-4">
              <h2 className="text-xl md:text-2xl font-semibold text-foreground">Payment Information</h2>
              <p className="text-sm md:text-base text-muted-foreground leading-relaxed">
                Payment proofs and transaction receipts uploaded to our platform are stored securely and are only accessible to authorized administrators for verification purposes. We do not store actual payment card details or bank account information on our servers.
              </p>
            </section>

            <section className="space-y-3 md:space-y-4">
              <h2 className="text-xl md:text-2xl font-semibold text-foreground">Data Retention</h2>
              <p className="text-sm md:text-base text-muted-foreground leading-relaxed">
                We retain your personal information for as long as your account is active or as needed to provide services, comply with legal obligations, resolve disputes, and enforce our agreements. Financial records are retained according to applicable legal requirements.
              </p>
            </section>

            <section className="space-y-3 md:space-y-4">
              <h2 className="text-xl md:text-2xl font-semibold text-foreground">Children's Privacy</h2>
              <p className="text-sm md:text-base text-muted-foreground leading-relaxed">
                Our platform is intended for alumni of NEMSS 2009 graduating class. We do not knowingly collect information from individuals under 18 years of age.
              </p>
            </section>

            <section className="space-y-3 md:space-y-4">
              <h2 className="text-xl md:text-2xl font-semibold text-foreground">Changes to This Privacy Policy</h2>
              <p className="text-sm md:text-base text-muted-foreground leading-relaxed">
                We may update this Privacy Policy from time to time. We will notify members of significant changes via email or through a prominent notice on our platform. Your continued use of our services after such modifications constitutes your acceptance of the updated policy.
              </p>
            </section>

            <section className="space-y-3 md:space-y-4">
              <h2 className="text-xl md:text-2xl font-semibold text-foreground">Contact Us</h2>
              <p className="text-sm md:text-base text-muted-foreground leading-relaxed">
                If you have questions, concerns, or requests regarding this Privacy Policy or our data practices, please contact us:
              </p>
              <div className="bg-card p-4 md:p-6 rounded-lg border border-border mt-3 md:mt-4">
                <p className="text-sm md:text-base text-card-foreground"><strong>NEMSS09 Set Alumni Association</strong></p>
                <p className="text-sm md:text-base text-muted-foreground mt-2">Email: privacy@nemss09set.org</p>
                <p className="text-sm md:text-base text-muted-foreground">Website: nemss09set.org</p>
              </div>
            </section>

            <div className="pt-6 md:pt-8 border-t border-border">
              <p className="text-xs md:text-sm text-muted-foreground text-center">
                By using the NEMSS09 Set Alumni Association platform, you acknowledge that you have read and understood this Privacy Policy.
              </p>
            </div>
          </div>

          <div className="text-center pt-6 md:pt-8">
            <Button asChild>
              <Link to="/home" className="flex items-center gap-2">
                <ArrowLeft className="w-4 h-4" />
                Back to Home
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPolicy;
