import type { Metadata } from 'next';
import { Manrope } from 'next/font/google';
import './globals.css';
const manrope = Manrope({ subsets: ['latin'], variable: '--font-manrope' });
export const metadata: Metadata = { title: 'KonectLocal Med Spa Recovery', description: 'AI-powered revenue recovery for med spas' };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="en"><body className={`${manrope.variable} font-sans antialiased`}>{children}</body></html>; }
