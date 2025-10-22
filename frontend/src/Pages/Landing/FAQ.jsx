import React, { useState } from 'react'
import { FiSearch, FiMinus, FiPlus } from 'react-icons/fi'

export default function FAQ() {
  const [searchTerm, setSearchTerm] = useState('')
  const [activeCategory, setActiveCategory] = useState('General')
  const [expandedQuestion, setExpandedQuestion] = useState('What is Chaincircle?')

  // FAQ categories
  const categories = [
    'General',
    'Build',
    'Promote',
    'Manage',
    'Integrations',
    'Legal'
  ]

  // Complete FAQ data based on your provided content
  const faqData = {
    General: [
      {
        question: "What is Chaincircle?",
        answer: "ChainCircle is a universal savings protocol built on Push Chain that enables users from any blockchain to save together in collaborative savings circles. Members pool money together regularly, and each member receives the full pot on a rotating basis. Built on Push Chain blockchain, ChainCircle automates contributions, ensures transparency, and eliminates the need for traditional intermediaries."
      },
      {
        question: "How does Chaincircle work?",
        answer: "ChainCircle operates on a rotating savings model. A group of members commits to contributing a fixed amount monthly to a shared pool. Each month, one member receives the entire pooled amount plus earned interest according to a predetermined rotation order. This continues until all members have received their payout. The smart contracts automate contributions, track payments, and distribute funds transparently."
      },
      {
        question: "What are the costs and fees to use Chaincircle?",
        answer: "ChainCircle charges no platform fees on your contributions. The protocol retains 20% of generated interest as protocol revenue, while 80% of interest earnings goes directly to circle members. You only pay standard blockchain gas fees for transactions, which can be paid in your source chain's native token like ETH or SOL."
      },
      {
        question: "How can I setup my account on Chaincircle?",
        answer: "Connect any compatible wallet from supported blockchains including Ethereum-based wallets like MetaMask or Solana-based wallets like Phantom. Click \"Sign up for free\" on the platform, select your wallet, sign the connection message, and your account is created automatically. No Push Chain native wallet is required."
      },
      {
        question: "Is Chaincircle right for a team of friends?",
        answer: "Yes. ChainCircle is designed for groups of friends, family members, or community members who want to save together toward shared or individual goals. Each circle can have 3-12 members, making it perfect for small trusted groups saving for homes, education, business ventures, or emergency funds."
      }
    ],
    Build: [
      {
        question: "How do I create a savings circle?",
        answer: "Navigate to the Circle section, click \"Create New Circle,\" and set your parameters including contribution amount between $100-$5000, duration between 6-24 months, savings goal type, and maximum number of members. Generate a shareable invite link and send it to your friends to join."
      },
      {
        question: "What contribution amounts can I set?",
        answer: "Circle creators can set contribution amounts ranging from $100 to $5000 per payment period. Choose an amount that is comfortable for all members to sustain throughout the circle's duration."
      },
      {
        question: "How long can a circle run?",
        answer: "Circles can be configured to run between 6 months and 24 months. The total duration depends on the number of members and payment frequency, as each member must receive their payout turn."
      },
      {
        question: "Can I customize payout order?",
        answer: "Currently, payout order is predetermined at circle creation based on member join sequence. Future features will include flexible options like random lottery style, bidding systems, need-based priority voting, and performance-based ordering."
      },
      {
        question: "What payment frequencies are available?",
        answer: "Circles currently support monthly contributions. Weekly contribution frequency options are planned for future releases."
      },
      {
        question: "Which tokens can I use for contributions?",
        answer: "You can contribute using various tokens including ETH, SOL, USDC, and other supported tokens from your source blockchain. The platform handles cross-chain conversions seamlessly through Push Chain's universal capabilities."
      }
    ],
    Promote: [
      {
        question: "How do I invite others to join my circle?",
        answer: "After creating a circle, you receive a unique shareable invite link. Send this link to friends via any communication channel. Recipients can click the link, review circle details, and join by approving their first contribution."
      },
      {
        question: "Can I share my savings achievements?",
        answer: "Yes. The platform includes social sharing features allowing you to share achievements on social media, celebrate circle completions, and invite friends to join ChainCircle. Future updates will include achievement badges and milestone NFTs."
      },
      {
        question: "What if my friends use different blockchains?",
        answer: "This is ChainCircle's key innovation. Friends using Ethereum, Solana, Base, or other supported chains can all participate in the same circle. Each person contributes from their preferred blockchain without bridging or network switching."
      },
      {
        question: "Is there a referral program?",
        answer: "A referral program with tiered bonuses and an ambassador program is planned for future releases, rewarding users for inviting friends to the platform."
      }
    ],
    Manage: [
      {
        question: "How do I track my circle's progress?",
        answer: "Your dashboard displays all active circles with contribution status, next payout recipient, progress bars, days until next contribution, and payment completion percentage. Click any circle to view detailed information."
      },
      {
        question: "What happens if I miss a payment?",
        answer: "You have a 48-hour grace period after the due date. If payment is not made within this period, a penalty mechanism is triggered and your missed contribution amount is redistributed to other circle members. This will negatively impact your reputation score."
      },
      {
        question: "How do I make a contribution?",
        answer: "Navigate to your circle's detail page, click \"Contribute,\" approve the transaction in your wallet, and the contribution is automatically recorded on-chain. You can contribute from any supported blockchain each payment period."
      },
      {
        question: "When do I receive my payout?",
        answer: "Payouts follow the predetermined rotation order. When it is your turn, the full pooled amount plus earned interest is automatically distributed to your preferred receiving wallet. You will receive notifications when your payout turn approaches."
      },
      {
        question: "Can I choose which wallet receives my payout?",
        answer: "Yes. In your profile settings under payout preferences, you can set your preferred receiving wallet and preferred token for receiving funds."
      },
      {
        question: "What if I need to leave a circle early?",
        answer: "Leaving a circle early may impact your reputation and affect other members counting on your contributions. An emergency withdrawal function exists but comes with significant consequences. Future features will include formal withdrawal mechanisms with member voting."
      },
      {
        question: "How do I monitor member payment status?",
        answer: "The circle detail page displays all members with their payment status indicators, showing who has paid, who has upcoming payments due, and who has missed payments. This transparency ensures accountability."
      },
      {
        question: "Can I participate in multiple circles?",
        answer: "Yes. You can join multiple circles simultaneously. Participating in multiple circles provides reputation bonuses and demonstrates diverse financial responsibility."
      }
    ],
    Integrations: [
      {
        question: "What blockchain does Chaincircle run on?",
        answer: "ChainCircle runs on Push Chain, a Universal Layer 1 blockchain that is fully EVM-compatible and enables seamless cross-chain interactions without bridges or wrapped tokens."
      },
      {
        question: "What makes Push Chain special for this application?",
        answer: "Push Chain is the only blockchain with native universal interoperability, allowing users from any blockchain to interact with the same smart contract. Users pay gas fees in their native tokens like ETH or SOL rather than holding Push Chain tokens."
      },
      {
        question: "Do I need Push Chain tokens?",
        answer: "No. Push Chain's fee abstraction means you can execute transactions and pay gas fees in your native tokens from your source chain. You never need to acquire or hold Push Chain native tokens."
      },
      {
        question: "Can I connect with wallets from different blockchains?",
        answer: "Yes. Push Chain supports Ethereum-based wallets like MetaMask, Solana-based wallets like Phantom, and wallets from other supported chains, enabling them to transact seamlessly on the platform."
      },
      {
        question: "How are cross-chain transactions handled?",
        answer: "When you sign a transaction from your wallet, Push Chain's Universal Executor Accounts map your source-chain wallet to an account on Push Chain. The orchestrator handles execution on-chain while you pay gas in your native token."
      },
      {
        question: "What is a Universal Executor Account?",
        answer: "A Universal Executor Account is a proxy account that represents your external chain wallet on Push Chain. It allows you to execute Push Chain smart contract logic without needing a native Push Chain wallet."
      },
      {
        question: "Will there be lending protocol integrations?",
        answer: "Yes. Future integrations include reputation-based lending partnerships where your ChainCircle reputation can be used to qualify for better loan terms, unsecured loans for high-reputation users, and lower interest rates."
      },
      {
        question: "Are there plans for third-party dApp integrations?",
        answer: "Yes. The platform will offer APIs allowing other dApps to query ChainCircle reputation for various purposes including DAO governance weight, job platform trust signals, and credit verification."
      }
    ],
    Legal: [
      {
        question: "Is my data private?",
        answer: "Your wallet addresses and on-chain transactions are public by nature of blockchain technology. However, personal information is handled according to privacy best practices. Optional KYC/AML integration will be available for regulated markets with privacy-preserving verification."
      },
      {
        question: "How secure are my funds?",
        answer: "Funds are secured through audited smart contracts deployed on Push Chain. The contracts implement automatic contribution tracking, transparent payout mechanisms, and can include optional multi-signature requirements for large circles."
      },
      {
        question: "What happens if there is a smart contract vulnerability?",
        answer: "The platform implements multiple security measures including emergency pause functions, circuit breakers for detected issues, time-locked recovery mechanisms, and governance-controlled emergency functions. Future features include smart contract insurance coverage."
      },
      {
        question: "Is ChainCircle regulated?",
        answer: "ChainCircle operates as a decentralized protocol on blockchain. Regulatory compliance features including optional KYC/AML integration and tiered verification requirements are planned for markets requiring regulatory compliance."
      },
      {
        question: "What are the terms of service?",
        answer: "By using ChainCircle, you agree to participate in decentralized savings circles with associated risks. You are responsible for understanding smart contract mechanics, managing your wallet security, and ensuring compliance with local regulations."
      },
      {
        question: "Can ChainCircle access my funds?",
        answer: "No. Funds are held in smart contracts and can only be accessed according to predetermined rules coded into the contracts. The protocol cannot arbitrarily access or redirect funds."
      },
      {
        question: "What is ChainCircle's liability if something goes wrong?",
        answer: "As a decentralized protocol, ChainCircle smart contracts operate autonomously. Users participate at their own risk. Future insurance coverage options through partners like Nexus Mutual will provide additional fund protection guarantees."
      },
      {
        question: "How are disputes resolved?",
        answer: "Currently, disputes should be resolved among circle members. Future governance features will include a decentralized arbitration system with community jury selection, evidence submission portals, and binding decisions."
      },
      {
        question: "What happens to my data if I delete my account?",
        answer: "Your on-chain transaction history and reputation data remain permanently on the blockchain as they are public records. You can disconnect wallets and stop using the platform, but blockchain data cannot be deleted."
      },
      {
        question: "Where can I find more legal information?",
        answer: "Detailed terms of service, privacy policy, and legal documentation will be available on the ChainCircle website. For specific legal questions, consult with a qualified legal professional in your jurisdiction."
      }
    ]
  }

  // Filter questions based on search term
  const filteredQuestions = faqData[activeCategory]?.filter(item =>
    item.question.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.answer.toLowerCase().includes(searchTerm.toLowerCase())
  ) || []

  const toggleQuestion = (question) => {
    setExpandedQuestion(expandedQuestion === question ? null : question)
  }

  return (
    <div className="h-fit bg-black text-white p-6 lg:p-20">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between mb-10 gap-6">
          <h1 className="text-[28px] lg:text-[40px] font-bold">
            Frequently Asked Questions
          </h1>
          
          {/* Search Bar */}
          <div className="relative w-full lg:w-[400px]">
            <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Search"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-transparent border border-gray-600 rounded-[12px] pl-12 pr-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:border-[#D548EC] transition-colors"
            />
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-8">
          {/* Sidebar Categories */}
          <div className="lg:w-[250px] flex-shrink-0">
            <div className="flex flex-row lg:flex-col gap-2 overflow-x-auto lg:overflow-visible">
              {categories.map((category) => (
                <button
                  key={category}
                  onClick={() => {
                    setActiveCategory(category)
                    setExpandedQuestion(null) // Reset expanded question when changing category
                  }}
                  className={`px-4 py-3 text-left rounded-[8px] transition-all text-[13px] lg:text-[18px] cursor-pointer whitespace-nowrap lg:whitespace-normal ${
                    activeCategory === category
                      ? 'text-[#D548EC] bg-[#D548EC]/10'
                      : 'text-gray-300 hover:text-white hover:bg-gray-800'
                  }`}
                >
                  {category}
                </button>
              ))}
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1">
            {/* Category Title */}
            <h2 className="text-[24px] lg:text-[32px] font-semibold mb-8">
              {activeCategory} Questions
            </h2>

            {/* Questions List */}
            <div className="space-y-4">
              {filteredQuestions.length > 0 ? (
                filteredQuestions.map((item, index) => (
                  <div
                    key={index}
                    className="border-b border-gray-700 last:border-b-0"
                  >
                    <button
                      onClick={() => toggleQuestion(item.question)}
                      className="w-full flex items-center justify-between py-6 text-left group"
                    >
                      <h3 className="text-[16px] lg:text-[20px] font-medium pr-4 group-hover:text-[#D548EC] transition-colors cursor-pointer">
                        {item.question}
                      </h3>
                      <div className="flex-shrink-0 w-8 h-8 rounded-full border border-gray-600 flex items-center justify-center group-hover:border-[#D548EC] transition-colors">
                        {expandedQuestion === item.question ? (
                          <FiMinus className="text-[#D548EC]" size={16} />
                        ) : (
                          <FiPlus className="text-gray-400 group-hover:text-[#D548EC]" size={16} />
                        )}
                      </div>
                    </button>
                    
                    {/* Answer */}
                    <div className={`overflow-hidden transition-all duration-300 ${
                      expandedQuestion === item.question ? 'max-h-[500px] pb-6' : 'max-h-0'
                    }`}>
                      <p className="text-[14px] lg:text-[16px] text-gray-300 leading-relaxed">
                        {item.answer}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-12">
                  <p className="text-gray-400 text-[16px]">
                    No questions found matching "{searchTerm}"
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
