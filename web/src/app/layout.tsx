import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Tipping Aggregator',
  description: 'Aggregate sports tipping probabilities from multiple providers',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-gray-50 min-h-screen">
        <nav className="bg-white shadow-sm border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between h-16 items-center">
              <div className="flex items-center">
                <h1 className="text-xl font-bold text-gray-900">
                  Tipping Aggregator
                </h1>
              </div>
              <div className="flex gap-4">
                <a href="/" className="text-gray-600 hover:text-gray-900">
                  Matches
                </a>
                <a href="/admin" className="text-gray-600 hover:text-gray-900">
                  Admin
                </a>
              </div>
            </div>
          </div>
        </nav>
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {children}
        </main>
      </body>
    </html>
  );
}
