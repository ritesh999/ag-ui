import type { Metadata } from "next";
import "./globals.css";
import { Sidebar } from "@/components/Sidebar";
import { Topbar } from "@/components/Topbar";
import { AppProvider } from "@/lib/store";

export const metadata: Metadata = {
  title: "SiteFlow — Construction Management",
  description: "Manage projects, RFIs, submittals, daily logs, punch lists, documents and budgets.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="antialiased">
        <AppProvider>
          <div className="flex h-screen overflow-hidden">
            <Sidebar />
            <div className="flex min-w-0 flex-1 flex-col">
              <Topbar />
              <main className="flex-1 overflow-y-auto px-6 py-6">{children}</main>
            </div>
          </div>
        </AppProvider>
      </body>
    </html>
  );
}
