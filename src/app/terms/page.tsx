import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service — Lipi",
  description:
    "The terms governing use of Lipi, an OCR and document-intelligence platform operated by Dignep Group Pvt. Ltd.",
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

export default function TermsPage() {
  return (
    <LegalShell>
      <p className="text-[11px] font-bold uppercase tracking-wider text-primary mb-3">
        Legal
      </p>
      <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-3">
        Terms of Service
      </h1>
      <p className="text-xs text-muted-foreground font-medium mb-2">
        Last updated: August 14, 2026
      </p>
      <p className="text-xs text-muted-foreground mb-8" lang="ne">
        यी सर्तहरूको अंग्रेजी संस्करण आधिकारिक मानिनेछ। (The English version of
        these terms governs.)
      </p>

      <P>
        These Terms of Service (&quot;Terms&quot;) govern your use of Lipi, an
        OCR and document-intelligence platform operated by Dignep Group Pvt.
        Ltd. (&quot;Dignep&quot;, &quot;we&quot;, &quot;us&quot;), Nepal&apos;s
        ISO/IEC 20000-1:2018 certified software development company, based in
        Pulchowk, Lalitpur. By creating an account or using the service, you
        agree to these Terms.
      </P>

      <H2>1. The service</H2>
      <P>
        Lipi converts documents — scans, photos, and PDFs in Nepali and
        English — into structured data using OCR and document-intelligence
        capabilities including parsing, schema-based extraction, splitting, and
        classification. Outputs include confidence scores and citations, and
        automated results may contain errors; you are responsible for reviewing
        results before relying on them for consequential decisions.
      </P>

      <H2>2. Accounts and responsibilities</H2>
      <UL
        items={[
          "You must provide accurate account information and keep your login credentials confidential.",
          "You are responsible for all activity that occurs under your account.",
          "Notify us promptly if you suspect unauthorized access to your account.",
        ]}
      />

      <H2>3. Acceptable use</H2>
      <P>
        You may only upload documents you have the legal right to process. You
        must not use Lipi to:
      </P>
      <UL
        items={[
          "Process documents or content that is unlawful, or that you do not have authorization to handle;",
          "Infringe the privacy, intellectual property, or other rights of any person;",
          "Attempt to gain unauthorized access to the service, other tenants' data, or underlying infrastructure;",
          "Interfere with or disrupt the operation of the service.",
        ]}
      />
      <P>
        We may suspend or terminate accounts that violate these restrictions.
      </P>

      <H2>4. Intellectual property</H2>
      <P>
        You retain all rights to the documents you upload and to the data
        extracted from them. We claim no ownership over your content; we
        process it solely to provide the service to you. The Lipi platform
        itself — including its software, design, and branding — is and remains
        the intellectual property of Dignep Group Pvt. Ltd.
      </P>

      <H2>5. Service availability</H2>
      <P>
        We work to keep Lipi available and reliable, but the service is
        provided &quot;as is&quot; and &quot;as available&quot;. We do not
        guarantee uninterrupted or error-free operation, and we may modify,
        suspend, or discontinue features with reasonable notice where
        practicable.
      </P>

      <H2>6. Limitation of liability</H2>
      <P>
        To the maximum extent permitted by law, Dignep Group Pvt. Ltd. is not
        liable for indirect, incidental, special, or consequential damages, or
        for loss of profits, data, or business arising from your use of the
        service. Our total aggregate liability for claims relating to the
        service is limited to the amount you paid us for the service in the
        twelve months preceding the claim.
      </P>

      <H2>7. Governing law</H2>
      <P>
        These Terms are governed by the laws of Nepal. Any dispute arising out
        of or relating to these Terms or the service will be subject to the
        jurisdiction of the competent courts of Nepal.
      </P>

      <H2>8. Changes to these terms</H2>
      <P>
        We may update these Terms from time to time. When we do, we will
        update the &quot;Last updated&quot; date above and, for material
        changes, notify you through the platform or by email. Continued use of
        the service after changes take effect constitutes acceptance of the
        revised Terms.
      </P>

      <H2>9. Contact</H2>
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
