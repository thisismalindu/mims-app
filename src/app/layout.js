import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "MIMS App",
  description: "Microfinance Information Management System",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased bg-gray-50`}> 
        <div style={{ display: "flex", minHeight: "100vh" }}>
          <aside style={{ width: 220, background: "#fff", borderRight: "1px solid #eee", padding: 24 }}>
            <h1 style={{ fontWeight: 700, fontSize: 22, marginBottom: 32 }}>MIMS</h1>
            <nav>
              <ul style={{ listStyle: "none", padding: 0 }}>
                <li style={{ marginBottom: 16 }}><Link href="/">Dashboard</Link></li>
                <li style={{ marginBottom: 16 }}><Link href="/customers">Customers</Link></li>
                <li style={{ marginBottom: 16 }}><Link href="/accounts">Accounts</Link></li>
                <li style={{ marginBottom: 16 }}><Link href="/transactions">Transactions</Link></li>
                <li style={{ marginBottom: 16 }}><Link href="/settings">Settings</Link></li>
              </ul>
            </nav>
          </aside>
          <main style={{ flex: 1, padding: 32 }}>{children}</main>
        </div>
      </body>
    </html>
  );
}
