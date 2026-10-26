import type { Metadata } from 'next';
import { Inter, Newsreader } from 'next/font/google';
import './globals.css';

const ui = Inter({ subsets: ['latin'], variable: '--font-ui', display: 'swap' });
const read = Newsreader({ subsets: ['latin'], variable: '--font-read', display: 'swap' });

export const metadata: Metadata = {
  title: 'GapFinder AI — Personalized Study Gap Analysis',
  description: 'Finds what you do not know yet, before you ask, and builds the revision plan from it. Upload your syllabus, take diagnostic quizzes, and get a personalized revision plan.',
  keywords: ['study', 'revision', 'AI', 'gap analysis', 'exam preparation', 'personalized learning'],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${ui.variable} ${read.variable}`}>
      <body className="min-h-screen bg-paper font-sans text-ink antialiased">{children}</body>
    </html>
  );
}
