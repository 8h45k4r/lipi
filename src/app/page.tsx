"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  FileJson,
  ScanText,
  Scissors,
  Tags,
  Upload,
  ScanLine,
  LayoutTemplate,
  Braces,
  Landmark,
  Fingerprint,
  Map,
  Search,
  Lock,
  UserCheck,
  Gauge,
  Server,
  ArrowRight,
  CheckCircle2,
} from "lucide-react";

type Lang = "en" | "ne";

const LANG_STORAGE_KEY = "lipi.lang";
const BOOKING_URL = "https://calendar.app.google/Q3QBHcuxS6MQord87";

const pillarIcons = [FileJson, ScanText, Scissors, Tags];
const stepIcons = [Upload, ScanLine, LayoutTemplate, Braces];
const useCaseIcons = [Landmark, Fingerprint, Map, Search];
const enterpriseIcons = [Lock, UserCheck, Gauge, Server];

const dict = {
  en: {
    nav: {
      product: "Product",
      howItWorks: "How it works",
      useCases: "Use cases",
      enterprise: "Enterprise",
      logIn: "Log In",
      bookCall: "Book a Free Discovery Call",
      openWorkspace: "Open Workspace",
    },
    hero: {
      label: "Document Intelligence for Nepali & English",
      titleLead: "Every document, readable by machines.",
      titleAccent: "In any script.",
      body: "Lipi turns Gazettes, citizenship certificates, land records, handwritten notes, and forms into structured, typed JSON — with a confidence score and a citation behind every value.",
      note: "Built for government, legal, and enterprise document workflows.",
    },
    product: {
      label: "Product",
      title: "Four APIs. One pipeline from paper to data.",
      body: "Parse, Extract, Split, and Classify cover the full journey from a scanned page to structured output your systems can consume.",
      pillars: [
        {
          name: "Parse",
          tagline: "Turn any document into structured JSON you can trust.",
          bullets: [
            "Full-page OCR for Nepali and English, print or handwriting",
            "Confidence scores attached to every extracted value",
            "Citations that point back to the exact source region",
          ],
        },
        {
          name: "Extract",
          tagline: "Define a schema, get typed JSON back — field by field.",
          bullets: [
            "Schema-defined extraction with typed output",
            "Per-field confidence so reviewers know where to look",
            "Citation snippets showing where each value came from",
          ],
        },
        {
          name: "Split",
          tagline: "Describe sections in plain English, receive page ranges.",
          bullets: [
            "Natural-language section descriptions, no templates",
            "Precise page ranges returned for every section",
            "Break bulky files into workable, routable units",
          ],
        },
        {
          name: "Classify",
          tagline: "Route documents by type before anyone opens them.",
          bullets: [
            "Categorize incoming documents automatically",
            "Per-category confidence on every decision",
            "Send each type down the right processing path",
          ],
        },
      ],
    },
    how: {
      label: "How It Works",
      title: "From scan to structured output in four steps.",
      step: "Step",
      steps: [
        {
          title: "Upload",
          text: "Drop in scans, photos, or PDFs — Gazettes, certificates, ledgers, forms.",
        },
        {
          title: "OCR & layout reading",
          text: "Text and page structure are read together, in Devanagari and Latin scripts.",
        },
        {
          title: "Structure reconstruction",
          text: "Tables, fields, and sections are rebuilt the way the document intended.",
        },
        {
          title: "Typed JSON out",
          text: "Structured output with confidence scores and citations, ready for your systems.",
        },
      ],
    },
    useCases: {
      label: "Use Cases",
      title: "Where paper still runs the process.",
      body: "Lipi is built for the archives, registries, and intake queues where critical records live on paper today.",
      items: [
        {
          title: "Gazette digitization",
          text: "Convert decades of official Gazette volumes into searchable, structured records instead of static scans.",
        },
        {
          title: "Citizenship & KYC verification",
          text: "Extract names, numbers, and dates from citizenship certificates and identity documents with field-level confidence.",
        },
        {
          title: "Land-record data entry",
          text: "Replace manual re-typing of land ownership records with extraction that cites the exact source of every value.",
        },
        {
          title: "RAG & search over archives",
          text: "Feed clean, structured text from historical archives into retrieval and search pipelines your teams can query.",
        },
      ],
    },
    enterprise: {
      label: "Enterprise",
      title: "Built for teams that answer to auditors.",
      body: "Sensitive records demand strict boundaries, human oversight, and honest signals about machine certainty.",
      items: [
        {
          title: "Tenancy-scoped data access",
          text: "Every query is scoped to the owning account. One tenant's documents are never visible to another.",
        },
        {
          title: "Human-in-the-loop review",
          text: "Low-confidence values are surfaced for reviewers, so people verify exactly where the machine is unsure.",
        },
        {
          title: "Confidence on every value",
          text: "No silent guesses. Each extracted field carries a score you can threshold, audit, and act on.",
        },
        {
          title: "On-prem local AI via Ollama",
          text: "Run inference on your own hardware with local models — documents can stay inside your infrastructure.",
        },
      ],
    },
    cta: {
      title: "Start turning documents into data.",
      body: "Book a free discovery call and see how Lipi fits your Nepali and English document workflows.",
    },
    footer: {
      rights: "All rights reserved.",
      privacy: "Privacy Policy",
      terms: "Terms",
      attribution: "Lipi is a product of Dignep Group Pvt. Ltd.",
      contact: "+977-9851334787 · info@dignep.com.np · Pulchowk, Lalitpur",
    },
  },
  ne: {
    nav: {
      product: "उत्पादन",
      howItWorks: "कसरी काम गर्छ",
      useCases: "प्रयोगका क्षेत्रहरू",
      enterprise: "इन्टरप्राइज",
      logIn: "लग इन",
      bookCall: "निःशुल्क डिस्कभरी कल बुक गर्नुहोस्",
      openWorkspace: "वर्कस्पेस खोल्नुहोस्",
    },
    hero: {
      label: "नेपाली र अंग्रेजीका लागि डकुमेन्ट इन्टेलिजेन्स",
      titleLead: "हरेक कागजात, मेसिनले पढ्न सक्ने।",
      titleAccent: "जुनसुकै लिपिमा।",
      body: "लिपिले राजपत्र, नागरिकता प्रमाणपत्र, जग्गा अभिलेख, हस्तलिखित टिपोट र फारमहरूलाई संरचित, टाइप गरिएको JSON मा बदल्छ — हरेक मानका पछाडि कन्फिडेन्स स्कोर र स्रोत उद्धरणसहित।",
      note: "सरकारी, कानुनी र इन्टरप्राइज कागजात कार्यप्रवाहका लागि निर्मित।",
    },
    product: {
      label: "उत्पादन",
      title: "चार API। कागजदेखि डाटासम्मको एउटै पाइपलाइन।",
      body: "Parse, Extract, Split र Classify ले स्क्यान गरिएको पृष्ठदेखि तपाईंका प्रणालीले उपयोग गर्न सक्ने संरचित आउटपुटसम्मको पूरा यात्रा समेट्छन्।",
      pillars: [
        {
          name: "Parse",
          tagline: "जुनसुकै कागजातलाई भरपर्दो संरचित JSON मा बदल्नुहोस्।",
          bullets: [
            "नेपाली र अंग्रेजी, छापा वा हस्तलेखन — दुवैका लागि पूर्ण-पृष्ठ OCR",
            "निकालिएको हरेक मानसँग जोडिएको कन्फिडेन्स स्कोर",
            "स्रोतको सटीक क्षेत्रसम्म फर्केर देखाउने उद्धरणहरू",
          ],
        },
        {
          name: "Extract",
          tagline: "स्किमा परिभाषित गर्नुहोस्, फिल्ड-फिल्ड गरी टाइप गरिएको JSON पाउनुहोस्।",
          bullets: [
            "टाइप गरिएको आउटपुटसहितको स्किमा-आधारित एक्स्ट्र्याक्सन",
            "समीक्षकले कहाँ हेर्नुपर्छ भनी थाहा पाउन प्रति-फिल्ड कन्फिडेन्स",
            "हरेक मान कहाँबाट आयो भनी देखाउने उद्धरण स्निपेटहरू",
          ],
        },
        {
          name: "Split",
          tagline: "सामान्य भाषामा खण्डहरू वर्णन गर्नुहोस्, पृष्ठ दायरा पाउनुहोस्।",
          bullets: [
            "टेम्प्लेटबिना, प्राकृतिक भाषामा खण्डको विवरण",
            "हरेक खण्डका लागि फर्काइने सटीक पृष्ठ दायरा",
            "ठूला फाइलहरूलाई काम गर्न र पठाउन मिल्ने एकाइहरूमा टुक्र्याउनुहोस्",
          ],
        },
        {
          name: "Classify",
          tagline: "कसैले खोल्नुअघि नै कागजातलाई प्रकारअनुसार छुट्याउनुहोस्।",
          bullets: [
            "आउने कागजातहरूको स्वचालित वर्गीकरण",
            "हरेक निर्णयमा प्रति-श्रेणी कन्फिडेन्स",
            "हरेक प्रकारलाई उपयुक्त प्रशोधन मार्गमा पठाउनुहोस्",
          ],
        },
      ],
    },
    how: {
      label: "कसरी काम गर्छ",
      title: "स्क्यानदेखि संरचित आउटपुटसम्म, चार चरणमा।",
      step: "चरण",
      steps: [
        {
          title: "अपलोड",
          text: "स्क्यान, फोटो वा PDF राख्नुहोस् — राजपत्र, प्रमाणपत्र, खाता, फारमहरू।",
        },
        {
          title: "OCR र लेआउट पठन",
          text: "देवनागरी र ल्याटिन लिपिमा पाठ र पृष्ठ संरचना सँगसँगै पढिन्छ।",
        },
        {
          title: "संरचना पुनर्निर्माण",
          text: "तालिका, फिल्ड र खण्डहरू कागजातको मूल अभिप्रायअनुसार पुनर्निर्माण गरिन्छ।",
        },
        {
          title: "टाइप गरिएको JSON आउटपुट",
          text: "कन्फिडेन्स स्कोर र उद्धरणसहितको संरचित आउटपुट, तपाईंका प्रणालीका लागि तयार।",
        },
      ],
    },
    useCases: {
      label: "प्रयोगका क्षेत्रहरू",
      title: "जहाँ प्रक्रिया अझै कागजमै चल्छ।",
      body: "लिपि ती अभिलेखालय, दर्ता कार्यालय र इनटेक लाइनहरूका लागि बनेको हो जहाँ महत्वपूर्ण अभिलेखहरू आज पनि कागजमै छन्।",
      items: [
        {
          title: "राजपत्र डिजिटाइजेसन",
          text: "दशकौंका आधिकारिक राजपत्रहरूलाई स्थिर स्क्यानको सट्टा खोजयोग्य, संरचित अभिलेखमा बदल्नुहोस्।",
        },
        {
          title: "नागरिकता र KYC प्रमाणीकरण",
          text: "नागरिकता प्रमाणपत्र र परिचय कागजातबाट नाम, नम्बर र मितिहरू फिल्ड-स्तरको कन्फिडेन्ससहित निकाल्नुहोस्।",
        },
        {
          title: "जग्गा अभिलेख डाटा प्रविष्टि",
          text: "जग्गाधनी अभिलेखको हाते पुनःटाइपिङलाई हरेक मानको सटीक स्रोत उद्धृत गर्ने एक्स्ट्र्याक्सनले प्रतिस्थापन गर्नुहोस्।",
        },
        {
          title: "अभिलेखमाथि RAG र खोज",
          text: "ऐतिहासिक अभिलेखबाट निस्केको सफा, संरचित पाठ तपाईंका टोलीले क्वेरी गर्न सक्ने रिट्रिभल र खोज पाइपलाइनमा पठाउनुहोस्।",
        },
      ],
    },
    enterprise: {
      label: "इन्टरप्राइज",
      title: "अडिटरलाई जवाफ दिनुपर्ने टोलीहरूका लागि निर्मित।",
      body: "संवेदनशील अभिलेखलाई कडा सीमा, मानवीय निगरानी र मेसिनको निश्चितताबारे इमानदार संकेत चाहिन्छ।",
      items: [
        {
          title: "टेनेन्सी-स्कोप्ड डाटा पहुँच",
          text: "हरेक क्वेरी स्वामित्व भएको खातामै सीमित हुन्छ। एक टेनेन्टका कागजात अर्कोले कहिल्यै देख्दैन।",
        },
        {
          title: "मानव-सहभागी समीक्षा",
          text: "कम कन्फिडेन्स भएका मानहरू समीक्षकसामु प्रस्तुत गरिन्छन्, जसले गर्दा मेसिन अनिश्चित भएकै ठाउँमा मानिसले प्रमाणित गर्छन्।",
        },
        {
          title: "हरेक मानमा कन्फिडेन्स",
          text: "मौन अनुमान छैन। निकालिएको हरेक फिल्डसँग थ्रेसहोल्ड तोक्न, अडिट गर्न र कार्य गर्न मिल्ने स्कोर हुन्छ।",
        },
        {
          title: "Ollama मार्फत अन-प्रिमाइस लोकल AI",
          text: "स्थानीय मोडेलहरूसहित आफ्नै हार्डवेयरमा इन्फरेन्स चलाउनुहोस् — कागजातहरू तपाईंकै पूर्वाधारभित्रै रहन सक्छन्।",
        },
      ],
    },
    cta: {
      title: "कागजातलाई डाटामा बदल्न सुरु गर्नुहोस्।",
      body: "निःशुल्क डिस्कभरी कल बुक गर्नुहोस् र तपाईंका नेपाली तथा अंग्रेजी कागजात कार्यप्रवाहमा लिपि कसरी मिल्छ भनी हेर्नुहोस्।",
    },
    footer: {
      rights: "सर्वाधिकार सुरक्षित।",
      privacy: "गोपनीयता नीति",
      terms: "सेवा सर्तहरू",
      attribution: "लिपि Dignep Group Pvt. Ltd. को उत्पादन हो।",
      contact: "+977-9851334787 · info@dignep.com.np · पुल्चोक, ललितपुर",
    },
  },
} as const;

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[11px] font-bold uppercase tracking-wider text-primary mb-3">
      {children}
    </p>
  );
}

function LangToggle({
  lang,
  onChange,
}: {
  lang: Lang;
  onChange: (lang: Lang) => void;
}) {
  return (
    <div className="inline-flex items-center border border-border rounded-none overflow-hidden shrink-0">
      {(
        [
          ["en", "EN"],
          ["ne", "नेपा"],
        ] as const
      ).map(([code, label]) => (
        <button
          key={code}
          type="button"
          onClick={() => onChange(code)}
          aria-pressed={lang === code}
          className={`h-9 px-2.5 sm:px-3 text-xs font-semibold transition-colors ${
            lang === code
              ? "bg-primary text-primary-foreground"
              : "bg-background text-muted-foreground hover:text-foreground hover:bg-muted"
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

export default function Home() {
  const [lang, setLang] = useState<Lang>("en");

  useEffect(() => {
    const stored = window.localStorage.getItem(LANG_STORAGE_KEY);
    if (stored === "en" || stored === "ne") {
      setLang(stored);
    }
  }, []);

  const changeLang = (next: Lang) => {
    setLang(next);
    window.localStorage.setItem(LANG_STORAGE_KEY, next);
  };

  const t = dict[lang];

  const navLinks = [
    { href: "#product", label: t.nav.product },
    { href: "#how-it-works", label: t.nav.howItWorks },
    { href: "#use-cases", label: t.nav.useCases },
    { href: "#enterprise", label: t.nav.enterprise },
  ];

  return (
    <div
      className={`min-h-screen bg-background text-foreground ${lang === "ne" ? "font-nepali" : ""}`}
      lang={lang}
    >
      {/* Sticky top nav */}
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur border-b border-border">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 shrink-0">
            <img
              src="https://saipals.com/wp-content/uploads/2026/08/lipi-logo.svg"
              alt="Lipi Logo"
              className="h-8"
            />
          </Link>

          <nav className="hidden md:flex items-center gap-6">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                {link.label}
              </a>
            ))}
          </nav>

          <div className="flex items-center gap-2 sm:gap-3">
            <LangToggle lang={lang} onChange={changeLang} />
            <Link
              href="/login"
              className="inline-flex items-center justify-center h-9 px-3 sm:px-4 text-sm font-medium text-foreground border border-border rounded-none hover:bg-muted transition-colors"
            >
              {t.nav.logIn}
            </Link>
            <a
              href={BOOKING_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="hidden sm:inline-flex items-center justify-center h-9 px-3 sm:px-4 text-sm font-medium bg-primary text-primary-foreground rounded-none hover:bg-primary/90 transition-colors shadow-sm"
            >
              {t.nav.bookCall}
            </a>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative border-b border-border overflow-hidden">
        <div
          className="absolute inset-0 opacity-[0.03] pointer-events-none"
          style={{
            backgroundImage:
              "radial-gradient(circle at 2px 2px, #003C8D 1px, transparent 0)",
            backgroundSize: "24px 24px",
          }}
        />
        <div className="absolute inset-0 opacity-[0.04] pointer-events-none flex items-center justify-end overflow-hidden">
          <span className="text-[16rem] lg:text-[24rem] font-bold text-primary select-none whitespace-nowrap leading-none">
            लिपि
          </span>
        </div>

        <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 py-20 md:py-28 lg:py-32">
          <div className="max-w-3xl">
            <SectionLabel>{t.hero.label}</SectionLabel>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold leading-tight tracking-tight mb-6">
              {t.hero.titleLead}{" "}
              <span className="text-primary">{t.hero.titleAccent}</span>
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground leading-relaxed mb-8 max-w-2xl">
              {t.hero.body}
            </p>
            <div className="flex flex-col sm:flex-row gap-3 mb-6">
              <a
                href={BOOKING_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 h-11 px-6 text-sm font-semibold bg-primary text-primary-foreground rounded-none hover:bg-primary/90 transition-colors shadow-sm"
              >
                {t.nav.bookCall}
                <ArrowRight className="h-4 w-4" />
              </a>
              <Link
                href="/dashboard"
                className="inline-flex items-center justify-center h-11 px-6 text-sm font-semibold border border-border bg-background text-foreground rounded-none hover:bg-muted transition-colors"
              >
                {t.nav.openWorkspace}
              </Link>
            </div>
            <p className="text-xs text-muted-foreground font-medium">
              {t.hero.note}
            </p>
          </div>
        </div>
      </section>

      {/* Product pillars */}
      <section id="product" className="border-b border-border bg-muted/20 scroll-mt-16">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-16 md:py-24">
          <div className="max-w-2xl mb-12">
            <SectionLabel>{t.product.label}</SectionLabel>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">
              {t.product.title}
            </h2>
            <p className="text-muted-foreground text-base md:text-lg">
              {t.product.body}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-px bg-border border border-border">
            {t.product.pillars.map((pillar, i) => {
              const Icon = pillarIcons[i];
              return (
                <div key={pillar.name} className="bg-card p-6 md:p-8">
                  <div className="h-10 w-10 bg-primary/10 border border-primary/30 flex items-center justify-center mb-5">
                    <Icon className="h-5 w-5 text-primary" />
                  </div>
                  <h3 className="text-lg font-bold mb-1">{pillar.name}</h3>
                  <p className="text-sm text-muted-foreground mb-5">
                    {pillar.tagline}
                  </p>
                  <ul className="space-y-2.5">
                    {pillar.bullets.map((bullet) => (
                      <li key={bullet} className="flex items-start gap-2.5 text-sm">
                        <CheckCircle2 className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                        <span className="text-foreground/90">{bullet}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="border-b border-border scroll-mt-16">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-16 md:py-24">
          <div className="max-w-2xl mb-12">
            <SectionLabel>{t.how.label}</SectionLabel>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">
              {t.how.title}
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-0 lg:divide-x lg:divide-border lg:border lg:border-border">
            {t.how.steps.map((step, i) => {
              const Icon = stepIcons[i];
              return (
                <div
                  key={step.title}
                  className="border border-border lg:border-0 p-6 bg-card"
                >
                  <div className="flex items-center gap-3 mb-4">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                      {t.how.step} {i + 1}
                    </span>
                  </div>
                  <div className="h-10 w-10 bg-primary/10 border border-primary/30 flex items-center justify-center mb-4">
                    <Icon className="h-5 w-5 text-primary" />
                  </div>
                  <h3 className="text-sm font-bold mb-2">{step.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {step.text}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Use cases */}
      <section id="use-cases" className="border-b border-border bg-muted/20 scroll-mt-16">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-16 md:py-24">
          <div className="max-w-2xl mb-12">
            <SectionLabel>{t.useCases.label}</SectionLabel>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">
              {t.useCases.title}
            </h2>
            <p className="text-muted-foreground text-base md:text-lg">
              {t.useCases.body}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-px bg-border border border-border">
            {t.useCases.items.map((useCase, i) => {
              const Icon = useCaseIcons[i];
              return (
                <div key={useCase.title} className="bg-card p-6 md:p-8">
                  <div className="h-10 w-10 bg-primary/10 border border-primary/30 flex items-center justify-center mb-5">
                    <Icon className="h-5 w-5 text-primary" />
                  </div>
                  <h3 className="text-base font-bold mb-2">{useCase.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {useCase.text}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Enterprise */}
      <section id="enterprise" className="border-b border-border scroll-mt-16">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-16 md:py-24">
          <div className="max-w-2xl mb-12">
            <SectionLabel>{t.enterprise.label}</SectionLabel>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">
              {t.enterprise.title}
            </h2>
            <p className="text-muted-foreground text-base md:text-lg">
              {t.enterprise.body}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {t.enterprise.items.map((item, i) => {
              const Icon = enterpriseIcons[i];
              return (
                <div key={item.title} className="border border-border bg-card p-6">
                  <div className="h-10 w-10 bg-primary/10 border border-primary/30 flex items-center justify-center mb-5">
                    <Icon className="h-5 w-5 text-primary" />
                  </div>
                  <h3 className="text-sm font-bold mb-2">{item.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {item.text}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Final CTA band */}
      <section className="bg-primary text-primary-foreground">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-16 md:py-20">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-8">
            <div className="max-w-xl">
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-3">
                {t.cta.title}
              </h2>
              <p className="text-primary-foreground/80 text-base md:text-lg">
                {t.cta.body}
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 shrink-0">
              <a
                href={BOOKING_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 h-11 px-6 text-sm font-semibold bg-background text-primary rounded-none hover:bg-background/90 transition-colors"
              >
                {t.nav.bookCall}
                <ArrowRight className="h-4 w-4" />
              </a>
              <Link
                href="/login"
                className="inline-flex items-center justify-center h-11 px-6 text-sm font-semibold border border-primary-foreground/40 text-primary-foreground rounded-none hover:bg-primary-foreground/10 transition-colors"
              >
                {t.nav.logIn}
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border bg-background">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <img
                src="https://saipals.com/wp-content/uploads/2026/08/lipi-logo.svg"
                alt="Lipi Logo"
                className="h-6"
              />
              <span className="text-xs text-muted-foreground">
                © {new Date().getFullYear()} Lipi. {t.footer.rights}
              </span>
            </div>
            <div className="flex items-center gap-6 text-xs text-muted-foreground">
              <Link href="/privacy" className="hover:text-foreground transition-colors">
                {t.footer.privacy}
              </Link>
              <Link href="/terms" className="hover:text-foreground transition-colors">
                {t.footer.terms}
              </Link>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row items-center justify-between gap-2 border-t border-border pt-4">
            <span className="text-xs text-muted-foreground">
              {t.footer.attribution}
            </span>
            <span className="text-xs text-muted-foreground">
              {t.footer.contact}
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
