import type { Metadata } from "next";
import { Outfit, Poppins } from "next/font/google";
import "./globals.css";

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
});

const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin", "devanagari"],
  weight: ["400", "500", "600", "700"],
});

import { ThemeProvider } from "@/components/theme-provider";
import { AuthProvider } from "@/contexts/auth-context";
import { AppProvider } from "@/contexts/app-context";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "sonner";

export const metadata: Metadata = {
  title: "Lipi - AI-powered Nepali OCR & Document Intelligence",
  description: "Extract structured data from Nepali documents in seconds using state-of-the-art OCR and AI.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning className={`${outfit.variable} ${poppins.variable} antialiased`}>
      <body suppressHydrationWarning className="min-h-screen flex flex-col bg-background font-sans">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <AuthProvider>
            <AppProvider>
              <TooltipProvider>
                {children}
                <Toaster position="bottom-right" />
              </TooltipProvider>
            </AppProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
