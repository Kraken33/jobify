import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'Jobify - AI Job Discovery Assistant',
  description: 'AI-assisted job match discovery for JustJoin.it and tech portals.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.className} dark bg-neutral-950 text-neutral-100`} suppressHydrationWarning>
      <body className="min-h-screen bg-neutral-950 antialiased" suppressHydrationWarning>{children}</body>
    </html>
  );
}
