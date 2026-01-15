'use client';

/**
 * Compliance Footer Component
 * ACMA 2026 Compliant - Australian Gambling Regulations
 *
 * Requirements:
 * - Mandatory "Gamble Responsibly" messaging
 * - BetStop (National Self-Exclusion Register) link and logo
 * - 18+ age restriction warning
 * - Gambling help resources
 * - No "Bonus/Free Bet/Promo" language (NSW requirement)
 */

export default function ComplianceFooter() {
  return (
    <footer className="fixed bottom-0 left-0 right-0 bg-slate-900 border-t border-slate-700 py-4 z-40">
      <div className="container mx-auto px-4">
        {/* Main Compliance Message */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-sm mb-3">
          <div className="flex items-center gap-4 text-slate-300">
            <span className="flex items-center gap-2">
              <svg className="w-5 h-5 text-amber-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
              <span className="font-semibold text-amber-400">18+</span>
            </span>
            <span className="font-medium">Gamble Responsibly</span>
          </div>

          <div className="flex items-center gap-4">
            {/* BetStop Link */}
            <a
              href="https://www.betstop.gov.au"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-white hover:text-amber-400 transition-colors font-medium"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
              </svg>
              <span>BetStop - National Self-Exclusion Register</span>
            </a>

            {/* Gambling Help */}
            <a
              href="https://www.gamblinghelponline.org.au"
              target="_blank"
              rel="noopener noreferrer"
              className="text-slate-300 hover:text-white transition-colors"
            >
              Get Help
            </a>
          </div>
        </div>

        {/* Secondary Compliance Info */}
        <div className="border-t border-slate-700 pt-3 text-xs text-slate-400 text-center">
          <p className="mb-2">
            <strong className="text-slate-300">Important:</strong> This site provides odds comparison and information only.
            All betting links are direct to licensed Australian bookmakers.
          </p>
          <p className="mb-2">
            Gambling can be harmful if not controlled. Please gamble responsibly.
            If you or someone you know has a gambling problem, seek help immediately.
          </p>
          <div className="flex justify-center gap-6 mt-3">
            <a
              href="https://www.gamblinghelponline.org.au"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-slate-200 transition-colors"
            >
              Gambling Help Online: <span className="text-white font-semibold">1800 858 858</span>
            </a>
            <a
              href="https://www.gambleaware.nsw.gov.au"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-slate-200 transition-colors"
            >
              NSW Gamble Aware
            </a>
            <a
              href="https://responsiblegambling.vic.gov.au"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-slate-200 transition-colors"
            >
              VIC Responsible Gambling
            </a>
          </div>
        </div>

        {/* Legal Disclaimer */}
        <div className="border-t border-slate-700 pt-3 mt-3 text-xs text-slate-500 text-center">
          <p>
            Odds and information are provided for comparison purposes only and may not be up-to-date.
            Please verify all details with the bookmaker before placing any bets.
            All links redirect to licensed bookmaker websites.
          </p>
        </div>
      </div>
    </footer>
  );
}
