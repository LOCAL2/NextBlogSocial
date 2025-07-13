import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Providers from '../components/Providers';
import Navbar from '../components/Navbar';
import { ToastProvider } from '../components/Toast';

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "NextBlog Social",
  description: "Social blog platform with Discord authentication",
};

export default function RootLayout({ children }) {
  return (
    <html lang="th" data-theme="corporate">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <Providers>
          <ToastProvider>
            <Navbar />
            <main className="min-h-screen bg-base-200">
              {children}
            </main>
          </ToastProvider>
        </Providers>
      </body>
    </html>
  );
}
