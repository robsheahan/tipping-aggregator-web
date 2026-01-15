import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Tip Master',
  description: 'Aggregate sports tipping probabilities from multiple providers',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${inter.className} bg-slate-50 min-h-screen antialiased`}>
        <nav className="sticky top-0 z-50 bg-white/95 backdrop-blur-sm border-b border-slate-200">
          <div className="max-w-[1100px] mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between h-16 items-center">
              <div className="flex items-center">
                <a href="/" className="flex items-center gap-2 group">
                  <div className="w-8 h-8 bg-gradient-to-br from-indigo-600 to-indigo-700 rounded-lg flex items-center justify-center shadow-sm">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <span className="text-xl font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                    Tip Master
                  </span>
                </a>
              </div>
              <div className="flex items-center gap-3">
                <a
                  href="/"
                  className="text-slate-600 hover:text-slate-900 font-medium transition-colors px-3 py-2 rounded-lg hover:bg-slate-100"
                >
                  Home
                </a>
                <a
                  href="/admin"
                  className="text-slate-600 hover:text-indigo-600 font-medium transition-colors px-4 py-2 rounded-lg border border-slate-200 hover:border-indigo-200 hover:bg-indigo-50"
                >
                  Admin
                </a>
              </div>
            </div>
          </div>
        </nav>
        <main className="max-w-[1100px] mx-auto px-4 sm:px-6 lg:px-8 py-12 pb-32">
          {children}
        </main>

        {/* Compliance Footer - Required for Australian Gambling Regulations */}
        <footer className="fixed bottom-0 left-0 right-0 bg-slate-900 border-t border-slate-700 py-4 z-40">
          <div className="max-w-[1100px] mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-sm">
              <div className="flex items-center gap-4 text-slate-300">
                <span className="font-semibold text-amber-400">18+</span>
                <span>Gamble Responsibly</span>
              </div>
              <div className="flex items-center gap-4">
                <a
                  href="https://www.betstop.gov.au"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-slate-300 hover:text-white font-medium transition-colors underline underline-offset-4"
                >
                  National Self-Exclusion Register
                </a>
                <a
                  href="https://www.gamblinghelponline.org.au"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-slate-300 hover:text-white transition-colors underline underline-offset-4"
                >
                  Get Help
                </a>
              </div>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
