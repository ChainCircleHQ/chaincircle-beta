import React from 'react';
import { Link } from 'react-router';
import { CONTACT } from '../../config/contact';

export default function Terms() {
  return (
    <div className="min-h-screen bg-[#000000] text-white font-dm">
      {/* Header */}
      <header className="fixed top-0 left-0 w-full z-50 bg-[#70707026] backdrop-blur-md flex items-center justify-between px-10 lg:px-20 py-8 border-b border-b-[#F4AEFF]">
        <Link to="/" className="flex items-center gap-2">
          <img
            src="/assets/logo.png"
            alt="logo"
            className="w-[25px] h-[25px]"
          />
          <h3 className="text-lg lg:text-xl font-bold">Chaincircle</h3>
        </Link>
        <Link
          to="/"
          className="text-sm lg:text-base hover:text-[#D548EC] transition-colors"
        >
          Back to Home
        </Link>
      </header>

      {/* Content */}
      <div className="pt-32 pb-20 px-10 lg:px-20 max-w-5xl mx-auto">
        <h1 className="text-4xl lg:text-6xl font-bold mb-8 text-center lg:text-left">
          Terms and Conditions
        </h1>

        <p className="text-[#AAAAAA] mb-12 text-lg">
          Last updated: {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
        </p>

        <div className="space-y-8 text-base lg:text-lg">
          {/* Section 1 */}
          <section>
            <h2 className="text-2xl lg:text-3xl font-bold mb-4 text-[#D548EC]">
              1. Acceptance of Terms
            </h2>
            <p className="text-[#CCCCCC] leading-relaxed">
              By accessing and using ChainCircle ("the Platform"), you accept and agree to be bound by the terms and provision of this agreement. If you do not agree to these Terms and Conditions, please do not use the Platform.
            </p>
          </section>

          {/* Section 2 */}
          <section>
            <h2 className="text-2xl lg:text-3xl font-bold mb-4 text-[#D548EC]">
              2. Description of Service
            </h2>
            <p className="text-[#CCCCCC] leading-relaxed mb-4">
              ChainCircle is a decentralized savings circle platform built on Push Chain that enables users to:
            </p>
            <ul className="list-disc list-inside space-y-2 text-[#CCCCCC] ml-4">
              <li>Create and join savings circles with other users</li>
              <li>Make periodic contributions using CUSD (Circle USD)</li>
              <li>Receive payouts according to the circle's schedule</li>
              <li>Earn reputation points and badges through participation</li>
              <li>Participate in governance (for qualified users)</li>
            </ul>
          </section>

          {/* Section 3 */}
          <section>
            <h2 className="text-2xl lg:text-3xl font-bold mb-4 text-[#D548EC]">
              3. User Responsibilities
            </h2>
            <p className="text-[#CCCCCC] leading-relaxed mb-4">
              As a user of ChainCircle, you agree to:
            </p>
            <ul className="list-disc list-inside space-y-2 text-[#CCCCCC] ml-4">
              <li>Provide accurate and truthful information</li>
              <li>Maintain the security of your wallet and private keys</li>
              <li>Make timely contributions to circles you join</li>
              <li>Not engage in fraudulent or malicious activities</li>
              <li>Comply with all applicable laws and regulations</li>
              <li>Not create multiple accounts to manipulate the system</li>
            </ul>
          </section>

          {/* Section 4 */}
          <section>
            <h2 className="text-2xl lg:text-3xl font-bold mb-4 text-[#D548EC]">
              4. Financial Risks
            </h2>
            <p className="text-[#CCCCCC] leading-relaxed mb-4">
              <strong className="text-white">IMPORTANT:</strong> By using ChainCircle, you acknowledge and accept the following risks:
            </p>
            <ul className="list-disc list-inside space-y-2 text-[#CCCCCC] ml-4">
              <li>Circle members may default on their payment obligations</li>
              <li>Smart contract vulnerabilities may exist despite security audits</li>
              <li>Cryptocurrency values may fluctuate significantly</li>
              <li>Network congestion may affect transaction processing</li>
              <li>Loss of funds is possible and may not be recoverable</li>
              <li>ChainCircle does not guarantee returns or payouts</li>
            </ul>
          </section>

          {/* Section 5 */}
          <section>
            <h2 className="text-2xl lg:text-3xl font-bold mb-4 text-[#D548EC]">
              5. Circle Creation and Participation
            </h2>
            <p className="text-[#CCCCCC] leading-relaxed mb-4">
              When creating or joining a circle:
            </p>
            <ul className="list-disc list-inside space-y-2 text-[#CCCCCC] ml-4">
              <li>You commit to making all scheduled contributions on time</li>
              <li>Late payments may result in reputation penalties</li>
              <li>Circle creators are responsible for accurate configuration</li>
              <li>Once a circle starts, terms cannot be modified</li>
              <li>Early withdrawal may not be possible without penalties</li>
            </ul>
          </section>

          {/* Section 6 */}
          <section>
            <h2 className="text-2xl lg:text-3xl font-bold mb-4 text-[#D548EC]">
              6. Reputation System
            </h2>
            <p className="text-[#CCCCCC] leading-relaxed">
              ChainCircle uses a reputation system to track user behavior. Your reputation score is determined by payment history, circle completion, and other factors. Negative actions (late payments, defaults) will decrease your reputation and may limit your access to certain features.
            </p>
          </section>

          {/* Section 7 */}
          <section>
            <h2 className="text-2xl lg:text-3xl font-bold mb-4 text-[#D548EC]">
              7. Smart Contract Interactions
            </h2>
            <p className="text-[#CCCCCC] leading-relaxed">
              All transactions on ChainCircle are executed through smart contracts on the Push Chain blockchain. Once a transaction is confirmed on the blockchain, it is irreversible. You are responsible for verifying all transaction details before confirmation.
            </p>
          </section>

          {/* Section 8 */}
          <section>
            <h2 className="text-2xl lg:text-3xl font-bold mb-4 text-[#D548EC]">
              8. Limitation of Liability
            </h2>
            <p className="text-[#CCCCCC] leading-relaxed">
              ChainCircle and its developers shall not be liable for any direct, indirect, incidental, special, consequential, or exemplary damages resulting from your use of the Platform, including but not limited to loss of funds, loss of profits, or loss of data.
            </p>
          </section>

          {/* Section 9 */}
          <section>
            <h2 className="text-2xl lg:text-3xl font-bold mb-4 text-[#D548EC]">
              9. Prohibited Activities
            </h2>
            <p className="text-[#CCCCCC] leading-relaxed mb-4">
              You may not:
            </p>
            <ul className="list-disc list-inside space-y-2 text-[#CCCCCC] ml-4">
              <li>Use the Platform for money laundering or illegal activities</li>
              <li>Attempt to hack, exploit, or manipulate smart contracts</li>
              <li>Create circles with the intent to defraud other users</li>
              <li>Use automated bots or scripts to gain unfair advantages</li>
              <li>Impersonate other users or entities</li>
            </ul>
          </section>

          {/* Section 10 */}
          <section>
            <h2 className="text-2xl lg:text-3xl font-bold mb-4 text-[#D548EC]">
              10. Privacy and Data
            </h2>
            <p className="text-[#CCCCCC] leading-relaxed">
              Your wallet address and on-chain activities are publicly visible on the blockchain. While ChainCircle does not collect personal information, blockchain transactions are transparent and permanent.
            </p>
          </section>

          {/* Section 11 */}
          <section>
            <h2 className="text-2xl lg:text-3xl font-bold mb-4 text-[#D548EC]">
              11. Modifications to Terms
            </h2>
            <p className="text-[#CCCCCC] leading-relaxed">
              ChainCircle reserves the right to modify these Terms and Conditions at any time. Continued use of the Platform after changes constitutes acceptance of the modified terms. Material changes will be communicated through the Platform.
            </p>
          </section>

          {/* Section 12 */}
          <section>
            <h2 className="text-2xl lg:text-3xl font-bold mb-4 text-[#D548EC]">
              12. Termination
            </h2>
            <p className="text-[#CCCCCC] leading-relaxed">
              ChainCircle may terminate or suspend your access to the Platform at any time for violation of these Terms and Conditions or for any other reason at our sole discretion, without prior notice.
            </p>
          </section>

          {/* Section 13 */}
          <section>
            <h2 className="text-2xl lg:text-3xl font-bold mb-4 text-[#D548EC]">
              13. Governing Law
            </h2>
            <p className="text-[#CCCCCC] leading-relaxed">
              These Terms and Conditions shall be governed by and construed in accordance with applicable laws. Any disputes arising from these terms shall be resolved through binding arbitration.
            </p>
          </section>

          {/* Section 14 */}
          <section>
            <h2 className="text-2xl lg:text-3xl font-bold mb-4 text-[#D548EC]">
              14. Contact Information
            </h2>
            <p className="text-[#CCCCCC] leading-relaxed">
              For questions or concerns about these Terms and Conditions, please contact us:
            </p>
            <ul className="list-none space-y-2 text-[#CCCCCC] ml-4 mt-4">
              <li>Email: <a href={`mailto:${CONTACT.email}`} className="text-[#D548EC] hover:underline">{CONTACT.email}</a></li>
              <li>Twitter: <a href={CONTACT.twitterUrl} target="_blank" rel="noopener noreferrer" className="text-[#D548EC] hover:underline">{CONTACT.twitter}</a></li>
              <li>GitHub: <a href={CONTACT.githubUrl} target="_blank" rel="noopener noreferrer" className="text-[#D548EC] hover:underline">{CONTACT.github}</a></li>
            </ul>
          </section>

          {/* Agreement */}
          <section className="mt-12 p-6 border border-[#D548EC] rounded-lg bg-[#D548EC]/10">
            <p className="text-white font-semibold text-lg mb-2">
              By using ChainCircle, you acknowledge that:
            </p>
            <ul className="list-disc list-inside space-y-2 text-[#CCCCCC] ml-4">
              <li>You have read and understood these Terms and Conditions</li>
              <li>You accept all risks associated with using the Platform</li>
              <li>You are solely responsible for your financial decisions</li>
              <li>You will comply with all terms outlined above</li>
            </ul>
          </section>
        </div>

        {/* Back Button */}
        <div className="mt-12 text-center">
          <Link
            to="/"
            className="inline-block px-8 py-4 bg-[#D548EC] rounded-full hover:bg-[#B83CC3] transition-all font-bold text-lg"
          >
            Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}
