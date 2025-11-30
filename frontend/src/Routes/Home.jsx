import React, { useEffect, useRef, useState } from 'react'
import PurpleBtn from '../Components/PurpleBtn';
import TransBtn from '../Components/TransBtn';
import { Link, useNavigate } from 'react-router';
import { usePushWalletContext, usePushChainClient, PushUI, PushUniversalAccountButton } from '@pushchain/ui-kit';
import { useGlobalStats } from '../hooks/useCircleData';
import { IoClose, IoArrowUp } from 'react-icons/io5';
import { FaCoins, FaGasPump, FaBook } from 'react-icons/fa';
import { FiSearch, FiMinus, FiPlus } from 'react-icons/fi';

export default function Home() {
  const stepsRef = useRef(null);
  const videoSectionRef = useRef(null);
  const navigate = useNavigate();
  const { connectionStatus, handleConnectToPushWallet } = usePushWalletContext();
  const { pushChainClient } = usePushChainClient();
  const { data: globalStats } = useGlobalStats();
  const [showWelcomePopup, setShowWelcomePopup] = useState(false);

  const currentWallet = pushChainClient?.universal?.account;

  // FAQ State
  const [searchTerm, setSearchTerm] = useState('');
  const [activeCategory, setActiveCategory] = useState('General');
  const [expandedQuestion, setExpandedQuestion] = useState('What is Chaincircle?');

  // Check if user is new (show popup twice)
  useEffect(() => {
    const welcomeCount = parseInt(localStorage.getItem('welcomePopupCount') || '0');
    if (welcomeCount < 2) {
      // Show popup after a short delay for better UX
      const timer = setTimeout(() => {
        setShowWelcomePopup(true);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleCloseWelcome = () => {
    setShowWelcomePopup(false);
    const currentCount = parseInt(localStorage.getItem('welcomePopupCount') || '0');
    localStorage.setItem('welcomePopupCount', (currentCount + 1).toString());
  };

  useEffect(() => {
    // Specific observer for steps section
    if (typeof IntersectionObserver !== 'undefined' && stepsRef.current) {
      const stepsObserver = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              const stepCards = entry.target.querySelectorAll('.step-card');
              stepCards.forEach((card) => {
                card.classList.add('visible');
              });
            }
          });
        },
        {
          threshold: 0.3,
          rootMargin: '0px 0px -100px 0px'
        }
      );

      stepsObserver.observe(stepsRef.current);

      return () => {
        if (stepsRef.current) {
          stepsObserver.unobserve(stepsRef.current);
        }
      };
    }
  }, []);

  useEffect(() => {
    // Observer for video section with fade-in and scale animation
    if (typeof IntersectionObserver !== 'undefined' && videoSectionRef.current) {
      const videoObserver = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              entry.target.classList.add('video-visible');
            }
          });
        },
        {
          threshold: 0.2,
          rootMargin: '0px 0px -50px 0px'
        }
      );

      videoObserver.observe(videoSectionRef.current);

      return () => {
        if (videoSectionRef.current) {
          videoObserver.unobserve(videoSectionRef.current);
        }
      };
    }
  }, []);


  // Navigate to dashboard when user connects wallet after clicking "Start Saving"
  useEffect(() => {
    // Check if user should navigate after wallet connection
    const shouldNavigate = localStorage.getItem('navigateToDashboardAfterConnect');

    if (connectionStatus === PushUI.CONSTANTS.CONNECTION.STATUS.CONNECTED && shouldNavigate === 'true') {
      // Clear the navigation flag
      localStorage.removeItem('navigateToDashboardAfterConnect');
      // Set wasConnected BEFORE navigation to prevent redirect
      localStorage.setItem('wasConnected', 'true');

      // Navigate to dashboard
      navigate('/chain/dashboard', { replace: true });
    }
  }, [connectionStatus, navigate]);

  // FAQ Data
  const categories = ['General', 'Build', 'Promote', 'Manage', 'Integrations', 'Legal'];

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
  };

  // Filter questions based on search term
  const filteredQuestions = faqData[activeCategory]?.filter(item =>
    item.question.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.answer.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  const toggleQuestion = (question) => {
    setExpandedQuestion(expandedQuestion === question ? null : question);
  };

  const handleSignUpClick = () => {
    // Don't set navigation flag - keep user on landing page
    handleConnectToPushWallet();
  };
  const handleStartSavingClick = () => {
    if (connectionStatus === PushUI.CONSTANTS.CONNECTION.STATUS.CONNECTED) {
      // Ensure wasConnected is set before navigation to prevent redirect
      localStorage.setItem('wasConnected', 'true');
      // Small delay to ensure state is stable
      setTimeout(() => {
        navigate('/chain/dashboard', { replace: true });
      }, 50);
    } else {
      // Set flag in localStorage to persist through any page reloads
      localStorage.setItem('navigateToDashboardAfterConnect', 'true');
      handleConnectToPushWallet();
    }
  };

  const isTabletOrMobile = window.innerWidth <= 1014;

  return (
    <div className="flex flex-col gap-4 max-w-dvw">
      {/* Welcome Popup Modal */}
      {showWelcomePopup && (
        <div className="fixed font-dm z-[1000] inset-0 bg-black/60 backdrop-blur-lg flex items-center justify-center p-4 lg:p-8">
          <div className="relative w-full max-w-[600px] bg-[#111111] rounded-[24px] border border-[#F4AEFF] overflow-hidden">
            {/* Close Button */}
            <button
              onClick={handleCloseWelcome}
              className="absolute top-3 right-3 lg:top-4 lg:right-4 z-10 p-1.5 lg:p-2 rounded-full hover:bg-[#D548EC]/20 transition-all"
            >
              <IoClose size={isTabletOrMobile ? 24 : 28} className="text-white" />
            </button>

            {/* Header */}
            <div className="px-6 py-6 lg:px-8 lg:py-8 border-b border-b-[#F4AEFF]">
              <h2 className="font-bold text-[24px] lg:text-[32px] text-center">
                Welcome to Chaincircle!
              </h2>
              <p className="text-[#aaa] text-center mt-2 text-[12px] lg:text-[16px]">
                Your Universal Savings Platform
              </p>
            </div>

            {/* Content */}
            <div className="px-6 py-6 lg:px-8 lg:py-8">
              <p className="text-[#aaa] text-[14px] lg:text-[18px] text-center mb-6">
                Before you start saving, here's what you'll need:
              </p>

              {/* Requirements */}
              <div className="flex flex-col gap-4">
                {/* CUSD Requirement */}
                <div className="flex items-start gap-3 lg:gap-4 p-4 lg:p-5 bg-[#d648ec1a] border border-[#F4AEFF] rounded-[16px]">
                  <div className="flex-shrink-0 w-8 h-8 lg:w-10 lg:h-10 bg-[#D548EC] rounded-full flex items-center justify-center">
                    <FaCoins className="text-white" size={isTabletOrMobile ? 16 : 20} />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-white font-bold text-[14px] lg:text-[18px] mb-1">
                      CUSD Tokens
                    </h3>
                    <p className="text-[#aaa] text-[12px] lg:text-[16px]">
                      You'll need CUSD to save in circles. Get free testnet CUSD from our faucet.
                    </p>
                  </div>
                </div>

                {/* Gas Fee Requirement */}
                <div className="flex items-start gap-3 lg:gap-4 p-4 lg:p-5 bg-[#d648ec1a] border border-[#F4AEFF] rounded-[16px]">
                  <div className="flex-shrink-0 w-8 h-8 lg:w-10 lg:h-10 bg-[#F4AEFF] rounded-full flex items-center justify-center">
                    <FaGasPump className="text-black" size={isTabletOrMobile ? 16 : 20} />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-white font-bold text-[14px] lg:text-[18px] mb-1">
                      Gas Fees
                    </h3>
                    <p className="text-[#aaa] text-[12px] lg:text-[16px]">
                      You'll need native tokens from your chain (ETH, SOL, etc.) for transaction fees.
                    </p>
                  </div>
                </div>

                {/* Guide */}
                <div className="flex items-start gap-3 lg:gap-4 p-4 lg:p-5 bg-[#d648ec1a] border border-[#F4AEFF] rounded-[16px]">
                  <div className="flex-shrink-0 w-8 h-8 lg:w-10 lg:h-10 bg-[#D548EC] rounded-full flex items-center justify-center">
                    <FaBook className="text-white" size={isTabletOrMobile ? 16 : 20} />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-white font-bold text-[14px] lg:text-[18px] mb-1">
                      Need Help?
                    </h3>
                    <p className="text-[#aaa] text-[12px] lg:text-[16px]">
                      Visit our Faucet page for guides on wallet setup and claiming testnet tokens.
                    </p>
                  </div>
                </div>
              </div>

              {/* Call to Actions */}
              <div className="flex flex-col lg:flex-row gap-3 pt-6">
                <div
                  onClick={() => {
                    handleCloseWelcome();
                    navigate('/faucet');
                  }}
                  className="flex-1"
                >
                  <PurpleBtn text="Visit Faucet Page" />
                </div>
                <div
                  onClick={() => {
                    handleCloseWelcome();
                    handleSignUpClick();
                  }}
                  className="flex-1"
                >
                  <TransBtn text="Sign Up for Free" />
                </div>
              </div>

              <p className="text-[#888] text-[10px] lg:text-[12px] text-center pt-4">
                You'll see this message twice. You can always find guides on the Faucet page.
              </p>
            </div>
          </div>
        </div>
      )}

      <header className="fixed top-0 left-0 w-full z-500 bg-[#70707026] backdrop-blur-md flex items-center justify-between px-10 lg:px-20 py-8 border-b border-b-[#F4AEFF]">
        <div className="flex items-center gap-2">
          <img
            src="/assets/logo.png"
            alt="logo"
            className="w-[25px] h-[25px]"
          />
          <h3 className="">Chaincircle</h3>
        </div>

        <div className="flex items-center gap-4">
          {!isTabletOrMobile && (
            <>
              {connectionStatus === PushUI.CONSTANTS.CONNECTION.STATUS.CONNECTED ? (
                <div className="max-w-[200px]">
                  <PushUniversalAccountButton />
                </div>
              ) : (
                <div onClick={handleSignUpClick}>
                  <PurpleBtn text={"Sign up for free"} font={"bold"} />
                </div>
              )}
            </>
          )}
        </div>
      </header>

      <section className="lg:pt-32 pb-20 px-0 lg:px-20 overflow-hidden gap-40 lg:gap-0 mt-30 relative flex flex-col lg:flex-row items-center justify-between">
        {/* Hero Text */}
        <div className="flex flex-col gap-10 slide-up">
          <div className="flex flex-col gap-[11px] max-w-[540px]  px-10 lg:px-0 text-center lg:text-left">
            <h2 className="font-bold lg:text-[62px] text-[40px] ">
              Save Together, Across <span className="text-primary">Any</span>{" "}
              Chain.
            </h2>
            <p className="font-dm text-[18px] lg:text-[24px] ">
              Join savings circles with friends from Ethereum, Solana, Bnb, and
              beyond. No bridging. No friction.
            </p>
          </div>
          <div className="flex items-center justify-center lg:justify-start gap-4">
            <PurpleBtn
              text={"Start Saving"}
              font={"bold"}
              icon={"rightArrow"}
              action={handleStartSavingClick}
            />
            <TransBtn
              text={"How it Works"}
              icon={"hamburger"}
              action={() => {
                const element = document.getElementById("how-it-works");
                if (element) {
                  element.scrollIntoView({
                    behavior: "smooth",
                    block: "start",
                  });
                }
              }}
            />
          </div>
        </div>

        {/* Hero Img */}
        <div className="w-[470px] h-[532px] mx-auto lg:mx-0 lg:w-[560px] lg:h-[532px] flex items-center justify-center relative   lg:mr-15">
          <div
            className="lg:w-[532px] lg:h-[532px] w-[450px] absolute top-[35px] h-[450px] rounded-full flex items-center justify-center lg:top-0 left-5"
            style={{
              animation: "spin 25s linear infinite reverse",
            }}
          >
            <img
              src="/assets/Eth.png"
              alt=""
              className="absolute z-[50] left-0 bottom-1/2 translate-y-1/2 -translate-x-1/2 h-[50px] w-[50px] "
            />
          </div>
          <div
            className="lg:w-[532px] lg:h-[532px] w-[450px] h-[450px] rounded-full flex items-center justify-center relative"
            style={{
              animation: "spin 20s linear infinite",
            }}
          >
            <img
              src="/assets/Bnb.png"
              alt=""
              className="absolute z-[50] top-0 -translate-y-1/2 -translate-x-1/2 h-[50px] w-[50px] "
            />
            <div className="lg:w-[392px] lg:h-[392px] w-[350px] h-[350px] rounded-full flex items-center justify-center relative">
              <img
                src="/assets/Sol.png"
                alt=""
                className="absolute z-[50] right-0 bottom-1/2 translate-y-1/2 translate-x-1/2 h-[50px] w-[50px] "
              />
              <div className="w-[256px] h-[256px] rounded-full flex items-center justify-center relative"></div>
            </div>
          </div>
          {/* Outer circle - SVG */}
          <svg
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[450px] h-[450px] lg:w-[532px] lg:h-[532px]"
            viewBox="0 0 532 532"
          >
            <circle
              cx="266"
              cy="266"
              r="264"
              fill="none"
              stroke="#F4AEFF"
              strokeWidth="2"
              strokeDasharray="20 10"
            />
          </svg>

          {/* Middle circle - SVG */}
          <svg
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[350px] h-[350px] lg:w-[392px] lg:h-[392px]"
            viewBox="0 0 392 392"
          >
            <circle
              cx="196"
              cy="196"
              r="194"
              fill="none"
              stroke="#F4AEFF"
              strokeWidth="2"
              strokeDasharray="20 10"
            />
          </svg>

          {/* Inner circle - SVG */}
          <svg
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[200px] h-[200px] lg:w-[256px] lg:h-[256px]"
            viewBox="0 0 256 256"
          >
            <circle
              cx="128"
              cy="128"
              r="126"
              fill="none"
              stroke="#F4AEFF"
              strokeWidth="2"
              strokeDasharray="20 10"
            />
          </svg>
        </div>

        {/* Mockup */}
        <div className="absolute -right-5 bottom-20 lg:right-0 lg:bottom-0 slide-in-right">
          <img
            src="/assets/mockup.png"
            className="lg:h-[625px] lg:w-[600px] h-[500px] w-[400px] object-contain z-[20]"
            alt="ChainCircle mobile app dashboard mockup showing savings circles"
            width="600"
            height="625"
          />
        </div>

        {/* Background */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 -z-[5] ">
          <img
            src="/assets/blur.png"
            alt=""
            aria-hidden="true"
            className="w-[650px] h-[550px]"
            width="650"
            height="550"
            loading="lazy"
          />
        </div>
      </section>

      {/* Video Section */}
      <section
        ref={videoSectionRef}
        className="py-20 lg:py-32 relative video-section w-full"
      >
        {/* Background */}
        <div className="absolute top-0 left-0 w-full h-full -z-[1] opacity-30">
          <img
            src="/assets/blur.png"
            alt=""
            aria-hidden="true"
            className="w-full h-full object-cover"
            loading="lazy"
          />
        </div>

        {/* Video Container - Centered with max width */}
        <div className="relative w-full max-w-[900px] mx-auto overflow-hidden shadow-2xl shadow-[#F4AEFF]/20 rounded-[24px]">
          {/* 1:1 Aspect Ratio Container for square video */}
          <div className="relative w-full" style={{ paddingBottom: '100%' }}>
            <video
              src="https://ipfs.io/ipfs/bafybeih6o5aofmr3xttg2obokp5xgthiyf6jgr6mhhzfuxceqia23fwng4"
              className="absolute top-0 left-0 w-full h-full object-cover"
              autoPlay
              loop
              muted
              playsInline
              preload="auto"
            />
          </div>
        </div>

        {/* Optional Caption */}
        <p className="text-center text-[#aaa] text-[14px] lg:text-[18px] font-dm mt-6 lg:mt-8 px-10">
          See how ChainCircle works
        </p>
      </section>

      {/* How it works */}
      <section className="p-20 relative scroll-mt-32" id="how-it-works">
        {/* Background */}
        <div className="absolute top-20 right-40 lg:right-100 w-[350px] h-[350px] -z-[1]">
          <img
            src="/assets/wiw-bg.png"
            alt=""
            aria-hidden="true"
            className="w-full h-full object-cover"
            width="350"
            height="350"
            loading="lazy"
          />
        </div>
        <div className="absolute -bottom-20 left-0 w-full h-[350px] -z-[1]">
          <img
            src="/assets/Blur-oval.png"
            alt=""
            aria-hidden="true"
            className="w-full h-full object-cover"
            loading="lazy"
          />
        </div>

        <h2 className="font-bold text-center lg:text-left lg:text-[62px] text-[30px] w-full lg:max-w-[250px] ">
          {" "}
          How it <span className="text-primary">Works</span> .
        </h2>
        <div
          className="flex mt-20 lg:mt-0 items-center lg:items-end flex-col lg:flex-row gap-30 lg:gap-10"
          ref={stepsRef}
        >
          {/* Step 1 */}
          <div className="step-card flex-1 lg:h-[289px] h-[337px] lg:py-0 py-10 px-5 lg:px-0 rounded-[16px] shadow shadow-[#F4AEFF] relative flex items-center justify-center">
            <div className="flex flex-col gap-2 w-[250px] lg:max-w-[320px] items-center text-center">
              <h3 className="font-bold text-[16px] lg:text-[32px]">
                Create or Join a Circle
              </h3>
              <p className="text-primary text-[14px] lg:text-[24px]">
                Set your savings goal with friends
              </p>
            </div>
            <img
              src="/assets/Circle-Icon.png"
              alt="Create or join circle icon"
              className="w-[80px] h-[80px] lg:w-[110px] lg:h-[110px] object-cover absolute top-0 left-1/2 -translate-y-1/2 -translate-x-1/2"
              width="110"
              height="110"
              loading="lazy"
            />
          </div>
          {/* Step 2 */}
          <div className="step-card flex-1 h-[337px] lg:py-0 py-10 px-5 lg:px-0 rounded-[16px] shadow shadow-[#F4AEFF] relative flex items-center justify-center">
            <div className="flex flex-col gap-2 w-[250px] lg:max-w-[320px] items-center text-center">
              <h3 className="font-bold text-[16px] lg:text-[32px]">
                Contribute from Any Chain
              </h3>
              <p className="text-primary text-[14px] lg:text-[24px]">
                Pay with ETH, SOL, USDC - whatever you have
              </p>
            </div>
            <img
              src="/assets/Wallet-Icon.png"
              alt="Multi-chain wallet icon"
              className="w-[80px] h-[80px] lg:w-[110px] lg:h-[110px] object-cover absolute top-0 left-1/2 -translate-y-1/2 -translate-x-1/2"
              width="110"
              height="110"
              loading="lazy"
            />
          </div>
          {/* Step 3 */}
          <div className="step-card flex-1 lg:h-[393px] h-[337px]  lg:py-0 py-10 px-5 lg:px-0 rounded-[16px] shadow shadow-[#F4AEFF] relative flex items-center justify-center">
            <div className="flex flex-col gap-2 w-[250px] lg:max-w-[320px] items-center text-center">
              <h3 className="font-bold text-[16px] lg:text-[32px]">
                Get Your Payout + Interest
              </h3>
              <p className="text-primary text-[14px] lg:text-[24px]">
                Receive funds when it's your turn, plus earned yield.
              </p>
            </div>
            <img
              src="/assets/Interest-Icon.png"
              alt="Interest earnings icon"
              className="w-[80px] h-[80px] lg:w-[110px] lg:h-[110px] object-cover absolute top-0 left-1/2 -translate-y-1/2 -translate-x-1/2"
              width="110"
              height="110"
              loading="lazy"
            />
          </div>
        </div>
      </section>
      <section className="relative p-20 flex flex-col  ">
        {/* Background */}
        <div className="absolute top-16 right-0 w-full h-full -z-[1]">
          <img
            src="/assets/Bg-Grid.png"
            alt=""
            aria-hidden="true"
            className="w-full h-full object-cover"
            loading="lazy"
          />
        </div>

        <h1 className="font-bold text-[30px] text-center lg:text-left lg:text-[62px] w-full lg:max-w-[330px] mt-20 ">
          Feature <span className="text-primary">Highlights</span>.
        </h1>
      </section>
      <section className="relative p-20 flex justify-center pb-[50px] lg:pb-20  ">
        {/* Background */}
        <div className="absolute -bottom-[500px] lg:-bottom-90 right-0 w-full h-[70%] lg:h-full -z-[1]">
          <video
            src="https://beige-many-bobcat-289.mypinata.cloud/ipfs/bafybeibwhczyidexmveesm7wxpxyeyqjljfffdbhyj3nh4vd37altilra4"
            autoPlay
            loop
            muted
            playsInline
            className="w-full h-[60%] lg:h-full object-cover"
          />
        </div>

        <div className="w-full lg:w-[1000px] relative my-20 grid grid-cols-1 lg:grid-cols-2 lg:gap-5 gap-15 ">
          {/* Center */}
          {!isTabletOrMobile && (
            <div className="absolute top-1/2 left-1/2 p-2 -translate-x-[45%] -translate-y-[40%] rounded-full flex items-center justify-center">
              <img
                src="/assets/centre-logo.png"
                alt="ChainCircle logo"
                className="h-[120px] w-[120px]"
                width="120"
                height="120"
                loading="lazy"
              />
            </div>
          )}

          {/* Grids */}
          <div className="shadow shadow-[#F4AEFF] rounded-[16px]  w-full py-[50px] px-[30px] flex items-center gap-0 lg:gap-[30px] ">
            <img
              src="/assets/padlock.png"
              alt="Secure universal access icon"
              className="h-[110px] w-[110px] lg:h-[80px] lg:w-[80px] object-cover"
              width="80"
              height="80"
              loading="lazy"
            />
            <div className="">
              <h3 className="font-bold text-[16px] lg:text-[24px] ">
                Universal Access
              </h3>
              <p className="text-primary text-[13px] lg:text-[21px] font-dm font-light  ">
                Any wallet, any chain, one circle
              </p>
            </div>
          </div>

          <div className="shadow shadow-[#F4AEFF] rounded-[16px] w-full py-[50px] px-[30px] flex flex-row-reverse lg:flex-row items-center gap-0 lg:gap-[30px] ">
            <div className="text-left lg:text-right">
              <h3 className="font-bold text-[16px] lg:text-[24px] ">
                Earn While You Save
              </h3>
              <p className="text-primary text-[13px] lg:text-[19px] font-dm font-light  ">
                Funds generate 4% APR while waiting
              </p>
            </div>
            <img
              src="/assets/Earn-Icon.png"
              alt="Earn interest while saving icon"
              className="h-[110px] w-[110px] lg:h-[80px] lg:w-[80px] object-cover"
              width="80"
              height="80"
              loading="lazy"
            />
          </div>

          <div className="shadow shadow-[#F4AEFF] rounded-[16px] w-full py-[50px] px-[30px] flex items-center ggap-0 lg:gap-[30px] ">
            <img
              src="/assets/Reputation-Icon.png"
              alt="Build reputation icon"
              className="h-[110px] w-[110px] lg:h-[80px] lg:w-[80px] object-cover"
              width="80"
              height="80"
              loading="lazy"
            />
            <div className="">
              <h3 className="font-bold text-[16px] lg:text-[24px] ">
                Build Reputation
              </h3>
              <p className="text-primary text-[13px] lg:text-[18px] font-dm font-light ">
                Complete circles, unlock better terms
              </p>
            </div>
          </div>

          <div className="shadow shadow-[#F4AEFF] rounded-[16px] w-full py-[50px] px-[30px] flex flex-row-reverse lg:flex-row items-center gap-0 lg:gap-[30px] ">
            <div className="text-left lg:text-right">
              <h3 className="font-bold text-[16px] lg:text-[24px] ">
                Universal Accountability
              </h3>
              <p className="text-primary text-[13px] lg:text-[18px] font-dm font-light  ">
                Friends keep each other on track
              </p>
            </div>
            <img
              src="/assets/Accountability-Icon.png"
              alt=""
              className="h-[80px] w-[80px] object-cover"
            />
          </div>
        </div>
      </section>

      <section className="pt-[120px] pb-[70px] relative flex flex-col gap-20 ">
        {/* Background */}
        <div className="absolute -top-[4px] left-0 w-full h-full -z-[1]">
          <img
            src="/assets/Blur-oval.png"
            alt=""
            className="w-full h-full object-cover"
          />
        </div>

        <h1 className="font-bold text-[21px] lg:text-[40px] text-center ">
          Social Proof
        </h1>
        <div className="carousel-container h-[167px] flex items-center px-2">
          <div className="carousel-track">
            {/* Original items */}
            <div className="carousel-item shadow shadow-[#F4AEFF] rounded-[16px] w-[190] lg:w-[400px] h-[80px] lg:h-[135px] p-[30px] flex items-center gap-[17px]">
              <img
                src="/assets/Push-chain-logo.png"
                alt=""
                className="lg:h-full lg:w-[87px] h-[53px] w-[53px] "
              />
              <p className="font-dm text-[12px] lg:text-[24px] w-[120px] lg:w-full ">
                Built on <span className="text-primary ">Push Chain</span> - The
                Universal Layer 1
              </p>
            </div>

            <div className="carousel-item shadow shadow-[#F4AEFF] rounded-[16px] w-[190] lg:w-[400px] h-[80px] lg:h-[135px] p-[30px] flex items-center gap-[17px]">
              <img
                src="/assets/Badge.png"
                alt=""
                className="lg:h-full lg:w-[87px] h-[53px] w-[53px]"
              />
              <p className="font-dm text-primary text-[12px] lg:text-[24px] ">
                Hackathon Badge
              </p>
            </div>

            <div className="carousel-item shadow shadow-[#F4AEFF] rounded-[16px] w-[190] lg:w-[400px] h-[80px] lg:h-[135px] p-[30px] flex items-center gap-[17px]">
              <img
                src="/assets/Objects.png"
                alt=""
                className="lg:h-full lg:w-[87px] h-[53px] w-[53px] "
              />
              <p className="font-dm text-primary text-[12px] lg:text-[24px] ">
                ${globalStats?.totalPooled ? parseFloat(globalStats.totalPooled).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 }) : '0'} pooled
              </p>
            </div>

            <div className="carousel-item shadow shadow-[#F4AEFF] rounded-[16px] w-[190] lg:w-[400px] h-[80px] lg:h-[135px] p-[30px] flex items-center gap-[17px]">
              <img
                src="/assets/Unity.png"
                alt=""
                className="lg:h-full lg:w-[87px] h-[53px] w-[53px]"
              />
              <p className="font-dm text-primary text-[12px] lg:text-[24px] ">
                {globalStats?.totalCircles || 0} circles created
              </p>
            </div>

            <div className="carousel-item shadow shadow-[#F4AEFF] rounded-[16px] w-[190] lg:w-[400px] h-[80px] lg:h-[135px] p-[30px] flex items-center gap-[17px]">
              <img
                src="/assets/Push-chain-logo.png"
                alt=""
                className="lg:h-full lg:w-[87px] h-[53px] w-[53px]"
              />
              <p className="font-dm text-[12px] lg:text-[24px] ">
                Built on <span className="text-primary ">Push Chain</span> - The
                Universal Layer 1
              </p>
            </div>

            <div className="carousel-item shadow shadow-[#F4AEFF] rounded-[16px] w-[190] lg:w-[400px] h-[135px] p-[30px] flex items-center gap-[17px]">
              <img
                src="/assets/Badge.png"
                alt=""
                className="lg:h-full lg:w-[87px] h-[53px] w-[53px]"
              />
              <p className="font-dm text-primary text-[12px] lg:text-[24px] ">
                Hackathon Badge
              </p>
            </div>

            <div className="carousel-item shadow shadow-[#F4AEFF] rounded-[16px] w-[190] lg:w-[400px] h-[80px] lg:h-[135px] p-[30px] flex items-center gap-[17px]">
              <img
                src="/assets/Objects.png"
                alt=""
                className="lg:h-full lg:w-[87px] h-[53px] w-[53px] "
              />
              <p className="font-dm text-primary text-[12px] lg:text-[24px] ">
                ${globalStats?.totalPooled ? parseFloat(globalStats.totalPooled).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 }) : '0'} pooled
              </p>
            </div>

            <div className="carousel-item shadow shadow-[#F4AEFF] rounded-[16px] w-[190] lg:w-[400px] h-[80px] lg:h-[135px] p-[30px] flex items-center gap-[17px]">
              <img
                src="/assets/Unity.png"
                alt=""
                className="lg:h-full lg:w-[87px] h-[53px] w-[53px]"
              />
              <p className="font-dm text-primary text-[12px] lg:text-[24px] ">
                {globalStats?.totalCircles || 0} circles created
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-20 lg:py-32 px-6 lg:px-20 relative" id="faq">
        {/* Background */}
        <div className="absolute top-0 left-0 w-full h-full -z-[1] opacity-20">
          <img
            src="/assets/blur.png"
            alt=""
            className="w-full h-full object-cover"
          />
        </div>

        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between mb-10 lg:mb-16 gap-6">
            <h1 className="text-[32px] lg:text-[56px] font-bold">
              Frequently Asked <span className="text-primary">Questions</span>
            </h1>

            {/* Search Bar */}
            <div className="relative w-full lg:w-[400px]">
              <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                placeholder="Search questions..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-transparent border border-[#F4AEFF] rounded-[12px] pl-12 pr-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:border-[#D548EC] transition-colors"
              />
            </div>
          </div>

          <div className="flex flex-col lg:flex-row gap-8 lg:gap-12">
            {/* Sidebar Categories */}
            <div className="lg:w-[250px] flex-shrink-0">
              <div className="flex flex-row lg:flex-col gap-2 overflow-x-auto lg:overflow-visible pb-4 lg:pb-0">
                {categories.map((category) => (
                  <button
                    key={category}
                    onClick={() => {
                      setActiveCategory(category);
                      setExpandedQuestion(null);
                    }}
                    className={`px-4 py-3 text-left rounded-[12px] transition-all text-[14px] lg:text-[18px] cursor-pointer whitespace-nowrap lg:whitespace-normal ${activeCategory === category
                      ? 'text-white bg-[#D548EC] shadow-lg shadow-[#D548EC]/30'
                      : 'text-gray-300 hover:text-white hover:bg-[#D548EC]/20 border border-[#F4AEFF]/30'
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
              <h2 className="text-[24px] lg:text-[32px] font-semibold mb-6 lg:mb-8">
                <span className="text-primary">{activeCategory}</span> Questions
              </h2>

              {/* Questions List */}
              <div className="space-y-4">
                {filteredQuestions.length > 0 ? (
                  filteredQuestions.map((item, index) => (
                    <div
                      key={index}
                      className="border border-[#F4AEFF]/30 rounded-[16px] overflow-hidden bg-[#111111]/50 backdrop-blur"
                    >
                      <button
                        onClick={() => toggleQuestion(item.question)}
                        className="w-full flex items-center justify-between p-6 text-left group"
                      >
                        <h3 className="text-[16px] lg:text-[20px] font-medium pr-4 group-hover:text-[#D548EC] transition-colors cursor-pointer">
                          {item.question}
                        </h3>
                        <div className="flex-shrink-0 w-8 h-8 rounded-full border border-[#F4AEFF] flex items-center justify-center group-hover:bg-[#D548EC] group-hover:border-[#D548EC] transition-all">
                          {expandedQuestion === item.question ? (
                            <FiMinus className="text-white" size={16} />
                          ) : (
                            <FiPlus className="text-[#F4AEFF] group-hover:text-white transition-colors" size={16} />
                          )}
                        </div>
                      </button>

                      {/* Answer */}
                      <div className={`overflow-hidden transition-all duration-300 ${expandedQuestion === item.question ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'
                        }`}>
                        <p className="px-6 pb-6 text-[14px] lg:text-[18px] text-gray-300 leading-relaxed font-dm">
                          {item.answer}
                        </p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-12 border border-[#F4AEFF]/30 rounded-[16px]">
                    <p className="text-gray-400 text-[16px] lg:text-[18px]">
                      No questions found matching "{searchTerm}"
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className=" p-20 lg:p-40 flex flex-col items-center gap-30 relative ">
        <div className="flex items-start lg:items-center flex-col lg:flex-row gap-6 w-[360px] lg:w-full ">
          <p className="w-full lg:w-[356px] font-bold text-14 lg:text-[24px] ">
            Stay in the loop with Chaincircle news and updates!
          </p>
          <div className="flex gap-4 text-[14px] lg:text-[24px] w-full lg:w-auto ">
            <input
              type="text"
              placeholder="Enter your email"
              className="border border-[#F4AEFF] rounded-[8px] py-[12px] w-[calc(100%_-_1rem)] lg:w-[434px] text-center outline-none"
            />
            <PurpleBtn icon={"rightArrow"} />
          </div>
        </div>

        <div className="flex items-center gap-20 lg:gap-[111px]">
          <h1 className="max-w-[718px] font-bold text-[24px] lg:text-[64px] ">
            <span className="text-primary">"</span>Built for{" "}
            <span className="text-primary"> Push Chain</span> Project G.U.D
            <span className="text-primary">"</span>
          </h1>

          <div className="flex flex-col gap-4 font-dm text-[12px] lg:text-[24px] text-[#707070]">
            <Link
              className="hover:text-white transition ease-in-out hover:underline hover:scale-110 "
              to={"/about"}
            >
              ABOUT
            </Link>
            <button
              className="hover:text-white transition ease-in-out hover:underline hover:scale-110 text-left"
              onClick={() => {
                const element = document.getElementById("faq");
                if (element) {
                  element.scrollIntoView({
                    behavior: "smooth",
                    block: "start",
                  });
                }
              }}
            >
              FAQ
            </button>
            <Link
              className="hover:text-white transition ease-in-out hover:underline hover:scale-110 "
              to={"/faucet"}
              target="_blank"
              rel="noopener noreferrer"
            >
              FAUCET
            </Link>
            <Link
              className="hover:text-white transition ease-in-out hover:underline hover:scale-110 "
              to={"https://push.org/docs/"}
              target="_blank"
              rel="noopener noreferrer"
            >
              DOCS
            </Link>
            <Link
              className="hover:text-white transition ease-in-out hover:underline hover:scale-110 "
              to={"https://github.com/ChainCircleHQ"}
              target="_blank"
              rel="noopener noreferrer"
            >
              GITHUB
            </Link>
            <Link
              className="hover:text-white transition ease-in-out hover:underline hover:scale-110 "
              to={"https://x.com/chaincircle_?s=21"}
              target="_blank"
              rel="noopener noreferrer"
            >
              X (Twitter)
            </Link>
          </div>
        </div>

        <div className="flex items-center gap-10 pb-20 lg:pb-0 ">
          <img
            src="/assets/footer-logo.png"
            alt="logo"
            className="lg:w-[200px] w-[71px] h-[71px] lg:h-[200px] "
          />
          <h1 className="lg:text-[120px] text-[50px] ">Chaincircle</h1>
        </div>

        <div className="absolute animate-bounce bottom-20 rounded-[35px] border border-white/20 left-1/2 -translate-x-1/2 lg:h-[130px] lg:w-[900px] w-full h-[80px] bg-white/10 backdrop-blur shadow-lg"></div>
      </section>

      {/* Back to Top Button */}
      <div className="flex items-center justify-center pb-10 lg:pb-20">
        <button
          onClick={() => {
            window.scrollTo({
              top: 0,
              behavior: 'smooth'
            });
          }}
          className="flex items-center gap-3 px-6 lg:px-8 py-3 lg:py-4 bg-[#000] dark:bg-[#000] light:bg-gray-100 hover:bg-[#111] dark:hover:bg-[#111] light:hover:bg-gray-200 rounded-full transition-all hover:scale-105 border border-[#F4AEFF] dark:border-[#F4AEFF] light:border-[#D548EC]"
        >
          <span className="text-white dark:text-white light:text-black font-semibold text-[14px] lg:text-[18px] uppercase">Back to top</span>
          <IoArrowUp size={isTabletOrMobile ? 20 : 24} className="text-[#D548EC]" />
        </button>
      </div>
    </div>
  );
}