import type { Metadata } from 'next';
import { Bricolage_Grotesque, Newsreader } from 'next/font/google';
import './globals.css';

const ui = Bricolage_Grotesque({ subsets: ['latin'], variable: '--font-ui' });
const read = Newsreader({ subsets: ['latin'], variable: '--font-read' });

export const metadata: Metadata = {
  title: 'GapFinder AI',
  description: 'Finds what you do not know yet, before you ask, and builds the revision plan from it.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${ui.variable} ${read.variable}`}>
      <body className="min-h-screen bg-paper font-sans text-ink">{children}</body>
    </html>
  );
}
