import React, { useState } from 'react'
import { FiMinus, FiPlus } from 'react-icons/fi'
import { CONTACT } from '../../config/contact'

export default function About() {
  const [expandedSection, setExpandedSection] = useState('mission')

  // About sections with content
  const sections = [
    {
      id: 'mission',
      title: 'Our Mission',
      content: `ChainCircle is revolutionizing how communities save together by bringing traditional rotating savings and credit associations (ROSCAs) onto the blockchain. Our mission is to make collaborative savings accessible, transparent, and borderless for everyone, regardless of which blockchain they use.

We believe in the power of community-driven financial solidarity, where friends, family, and trusted groups can pool resources together to achieve their financial goals faster and more efficiently than saving alone.`
    },
    {
      id: 'problem',
      title: 'The Problem We Solve',
      content: `Traditional ROSCAs have existed for centuries across cultures, helping communities save for homes, education, businesses, and emergencies. However, they suffer from critical challenges:

• Lack of transparency in fund management
• Trust issues between members
• Manual tracking and coordination overhead
• Geographic limitations requiring physical meetings
• No cross-chain interoperability for global participation
• Limited recourse for disputes or defaults

ChainCircle solves these problems by automating contributions, ensuring complete transparency through blockchain, and enabling participation from any supported blockchain without bridges or network switching.`
    },
    {
      id: 'solution',
      title: 'Our Solution',
      content: `Built on Push Chain's universal blockchain technology, ChainCircle enables:

• Automated Contributions: Smart contracts handle payment tracking and distribution
• Universal Access: Join from Ethereum, Solana, Base, or any supported chain
• Transparent Operations: All transactions are recorded on-chain
• Reputation System: Build credit score through consistent participation
• Interest Generation: Pooled funds earn 4% APR, distributed to members
• Social Accountability: Member dashboards show payment status in real-time
• No Gas Complexity: Pay transaction fees in your native token (ETH, SOL, etc.)

The result is a trustless, automated savings platform that preserves the community benefits of traditional ROSCAs while eliminating their limitations.`
    },
    {
      id: 'technology',
      title: 'Technology',
      content: `ChainCircle is powered by Push Chain, the world's first Universal Layer 1 blockchain with native cross-chain interoperability.

Key Technical Features:
• Smart Contracts: Fully audited Solidity contracts manage all circle operations
• Universal Executor Accounts: Your wallet from any chain becomes a universal account
• Fee Abstraction: Pay gas fees in your source chain's native token
• EVM Compatible: Seamlessly integrates with existing Ethereum tooling
• Yield Integration: 4% APR generated through DeFi protocol integrations
• Reputation Oracle: On-chain credit scoring for future lending opportunities

No bridges. No wrapped tokens. No complexity. Just seamless cross-chain savings.`
    },
    {
      id: 'team',
      title: 'Our Team',
      content: `ChainCircle was built by a team passionate about decentralized finance and financial inclusion. We combine expertise in:

• Blockchain Development
• DeFi Protocol Design
• Smart Contract Security
• User Experience Design
• Community Building

Our team has experience building on multiple blockchains and understands the fragmentation challenges facing Web3. We're committed to creating products that make blockchain technology accessible to everyone, not just crypto natives.`
    },
    {
      id: 'vision',
      title: 'Our Vision',
      content: `We envision a future where:

• Communities worldwide can save together across any blockchain
• Your ChainCircle reputation becomes your decentralized credit score
• Traditional financial institutions partner with us for underbanked lending
• Savings circles expand to include insurance pools, investment clubs, and microloans
• Every person has access to transparent, community-driven financial services

ChainCircle is just the beginning. We're building the infrastructure for a new financial system where trust is automated, participation is universal, and financial opportunity is accessible to all.`
    },
    {
      id: 'security',
      title: 'Security & Safety',
      content: `Your security is our priority. ChainCircle implements multiple layers of protection:

Smart Contract Security:
• Comprehensive test coverage (52+ passing tests)
• Reentrancy guards on all state-changing functions
• Input validation and access control
• Emergency pause mechanisms
• Time-locked administrative functions

Operational Security:
• Non-custodial: We never hold your funds
• Open source: All contracts are publicly verifiable
• Multi-signature requirements for protocol upgrades
• Decentralized governance for major decisions

Future Security Enhancements:
• Professional security audits from leading firms
• Smart contract insurance through Nexus Mutual
• Bug bounty program for responsible disclosure
• Real-time monitoring and alerting systems`
    },
    {
      id: 'roadmap',
      title: 'Roadmap',
      content: `Q1 2026:
• Professional security audit
• Push Protocol notifications integration
• Enhanced analytics dashboard
• Multi-language support

Q2 2026:
• Push Chain mainnet deployment
• Additional DeFi protocol integrations (Aave, Compound)
• Mobile app launch (React Native)
• Referral and ambassador programs

Q3 2026:
• Cross-chain expansion (additional blockchains)
• Automated savings scheduling
• Social features (leaderboards, achievements)
• NFT marketplace for badges

Q4 2026:
• DAO governance launch
• Token economics implementation
• Institutional features for large circles
• API for third-party integrations

We're building for the long term. Join us on this journey.`
    }
  ]

  const toggleSection = (id) => {
    setExpandedSection(expandedSection === id ? null : id)
  }

  return (
    <div className="h-fit bg-black text-white p-6 lg:p-20">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between mb-10 gap-6">
          <div>
            <h1 className="text-[28px] lg:text-[40px] font-bold mb-2">
              About ChainCircle
            </h1>
            <p className="text-[14px] lg:text-[18px] text-gray-400">
              Building the future of collaborative savings on blockchain
            </p>
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-5xl mx-auto">
          {/* Sections List */}
          <div className="space-y-4">
            {sections.map((section) => (
              <div
                key={section.id}
                className="border-b border-gray-700 last:border-b-0"
              >
                <button
                  onClick={() => toggleSection(section.id)}
                  className="w-full flex items-center justify-between py-6 text-left group"
                >
                  <h2 className="text-[18px] lg:text-[24px] font-semibold pr-4 group-hover:text-[#D548EC] transition-colors cursor-pointer">
                    {section.title}
                  </h2>
                  <div className="flex-shrink-0 w-8 h-8 rounded-full border border-gray-600 flex items-center justify-center group-hover:border-[#D548EC] transition-colors">
                    {expandedSection === section.id ? (
                      <FiMinus className="text-[#D548EC]" size={16} />
                    ) : (
                      <FiPlus className="text-gray-400 group-hover:text-[#D548EC]" size={16} />
                    )}
                  </div>
                </button>

                {/* Content */}
                <div className={`overflow-hidden transition-all duration-300 ${
                  expandedSection === section.id ? 'max-h-[2000px] pb-6' : 'max-h-0'
                }`}>
                  <div className="text-[14px] lg:text-[16px] text-gray-300 leading-relaxed whitespace-pre-line">
                    {section.content}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Call to Action */}
          <div className="mt-16 text-center">
            <div className="bg-gradient-to-r from-[#D548EC]/10 to-[#F4AEFF]/10 rounded-[24px] p-8 lg:p-12 border border-[#D548EC]/20">
              <h3 className="text-[20px] lg:text-[28px] font-bold mb-4">
                Ready to Start Saving Together?
              </h3>
              <p className="text-[14px] lg:text-[16px] text-gray-300 mb-6 max-w-2xl mx-auto">
                Join thousands of users saving together across blockchains. Create your first circle today and experience the power of community-driven savings.
              </p>
              <button
                onClick={() => window.location.href = '/chain/circle'}
                className="px-8 py-3 lg:px-12 lg:py-4 bg-[#D548EC] rounded-full hover:bg-[#B83CC3] transition-all font-bold text-[14px] lg:text-[16px]"
              >
                Get Started Now
              </button>
            </div>
          </div>

          {/* Contact Section */}
          <div className="mt-12 text-center">
            <p className="text-[14px] lg:text-[16px] text-gray-400 mb-4">
              Have questions or want to partner with us?
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <a
                href={`mailto:${CONTACT.email}`}
                className="text-[#D548EC] hover:text-[#F4AEFF] transition-colors text-[14px] lg:text-[16px]"
              >
                {CONTACT.email}
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
