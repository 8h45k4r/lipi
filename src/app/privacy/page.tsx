import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy — Lipi",
  description:
    "How Lipi, a product of Dignep Group Pvt. Ltd., collects, uses, and protects your data.",
};

function LegalShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur border-b border-border">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 shrink-0">
            <img
              src="https://saipals.com/wp-content/uploads/2026/08/lipi-logo.svg"
              alt="Lipi Logo"
              className="h-8"
            />
          </Link>
          <Link
            href="/"
            className="inline-flex items-center gap-2 h-9 px-3 sm:px-4 text-sm font-medium text-foreground border border-border rounded-none hover:bg-muted transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to home
          </Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-12 md:py-16">
        {children}
      </main>

      <footer className="border-t border-border bg-background">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <span className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} Lipi. A product of Dignep Group Pvt.
            Ltd. All rights reserved.
          </span>
          <div className="flex items-center gap-6 text-xs text-muted-foreground">
            <Link href="/privacy" className="hover:text-foreground transition-colors">
              Privacy Policy
            </Link>
            <Link href="/terms" className="hover:text-foreground transition-colors">
              Terms
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

function H2({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-xl md:text-2xl font-bold tracking-tight mt-10 mb-3">
      {children}
    </h2>
  );
}

function P({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-sm md:text-base text-muted-foreground leading-relaxed mb-4">
      {children}
    </p>
  );
}

function UL({ items }: { items: string[] }) {
  return (
    <ul className="list-disc pl-5 space-y-2 mb-4 text-sm md:text-base text-muted-foreground leading-relaxed">
      {items.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  );
}

export default function PrivacyPage() {
  return (
    <LegalShell>
      <p className="text-[11px] font-bold uppercase tracking-wider text-primary mb-3">
        Legal
      </p>
      <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-3">
        Privacy Policy
      </h1>
      <p className="text-xs text-muted-foreground font-medium mb-2">
        Last updated: August 14, 2026
      </p>
      <p className="text-xs text-muted-foreground mb-8" lang="ne">
        यो नीतिको अंग्रेजी संस्करण आधिकारिक मानिनेछ। (The English version of
        this policy governs.)
      </p>

      <P>
        Lipi is an OCR and document-intelligence platform operated by Dignep
        Group Pvt. Ltd., Nepal&apos;s ISO/IEC 20000-1:2018 certified software
        development company, based in Pulchowk, Lalitpur. This Privacy Policy
        explains what information we collect when you use Lipi, how we use it,
        and the choices you have. We keep it deliberately plain: your documents
        are your business, and our job is to process them — not to exploit
        them.
      </P>

      <H2>Information we collect</H2>
      <UL
        items={[
          "Account information: your name, email address, and login credentials (passwords are stored only in hashed form), along with organization details you provide.",
          "Uploaded documents and derived text: the scans, photos, and PDFs you upload, and the OCR text, extracted fields, classifications, and page splits derived from them.",
          "Usage and activity logs: records of actions taken in the platform — such as uploads, extraction runs, and sign-ins — used for security auditing and troubleshooting.",
        ]}
      />

      <H2>How we use your information</H2>
      <UL
        items={[
          "To provide the service: performing OCR, extraction, splitting, and classification on the documents you upload, and returning structured results to you.",
          "To operate and secure your account: authentication, session management, and detecting misuse.",
          "To improve the service: aggregate, operational metrics (for example, processing times and error rates) help us improve reliability. We do not sell your data or use your documents for advertising.",
        ]}
      />

      <H2>Storage and security</H2>
      <P>
        Access to data in Lipi is tenancy-scoped: every query is restricted to
        the owning account, so one tenant&apos;s documents are never visible to
        another. Access to the application is protected by session-based
        authentication. Documents are processed by locally-hosted AI models
        running on infrastructure we control — your documents and their
        contents are not shared with third-party AI providers.
      </P>

      <H2>Retention and deletion</H2>
      <P>
        Your documents and projects remain available in your workspace until
        you delete them. When you delete a document or project, the derived
        data — OCR text, extracted fields, classifications, and splits — is
        removed along with it. Residual copies in operational backups are
        purged on our normal backup rotation schedule.
      </P>

      <H2>Your rights</H2>
      <P>
        You may request access to the personal information we hold about you,
        ask us to correct inaccurate information, or request deletion of your
        account and associated data. To exercise any of these rights, contact
        us using the details below and we will respond within a reasonable
        time.
      </P>

      <H2>Changes to this policy</H2>
      <P>
        If we make material changes to this policy, we will update the
        &quot;Last updated&quot; date above and, where appropriate, notify you
        through the platform or by email.
      </P>

      <H2>Contact</H2>
      <div className="border border-border bg-card p-6 text-sm md:text-base text-muted-foreground leading-relaxed">
        <p className="font-semibold text-foreground mb-1">
          Dignep Group Pvt. Ltd.
        </p>
        <p>Pulchowk, Lalitpur, Nepal</p>
        <p>
          Phone:{" "}
          <a href="tel:+9779851334787" className="hover:text-foreground transition-colors">
            +977-9851334787
          </a>
        </p>
        <p>
          Email:{" "}
          <a
            href="mailto:info@dignep.com.np"
            className="hover:text-foreground transition-colors"
          >
            info@dignep.com.np
          </a>
        </p>
      </div>
    </LegalShell>
  );
}
