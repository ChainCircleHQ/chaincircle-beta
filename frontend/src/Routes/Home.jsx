import React, { useEffect, useRef, useState } from 'react'
import PurpleBtn from '../Components/PurpleBtn';
import TransBtn from '../Components/TransBtn';
import { Link, useNavigate } from 'react-router';
import { usePushWalletContext, PushUI, PushUniversalAccountButton } from '@pushchain/ui-kit';
import { useGlobalStats } from '../hooks/useCircleData';
import { IoClose, IoArrowUp } from 'react-icons/io5';
import { FaCoins, FaGasPump, FaBook } from 'react-icons/fa';

export default function Home() {
  const stepsRef = useRef(null);
  const videoSectionRef = useRef(null);
  const navigate = useNavigate();
  const { connectionStatus, handleConnectToPushWallet } = usePushWalletContext();
  const { data: globalStats } = useGlobalStats();
  const [showWelcomePopup, setShowWelcomePopup] = useState(false);

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
    const shouldNavigate = sessionStorage.getItem('navigateToDashboard');
    if (connectionStatus === PushUI.CONSTANTS.CONNECTION.STATUS.CONNECTED && shouldNavigate === 'true') {
      sessionStorage.removeItem('navigateToDashboard');
      navigate('/chain/dashboard');
    }
  }, [connectionStatus, navigate]);

 const handleSignUpClick = () => {
  // Don't set navigation flag - keep user on landing page
  handleConnectToPushWallet();
};
  const handleStartSavingClick = () => {
    if (connectionStatus === PushUI.CONSTANTS.CONNECTION.STATUS.CONNECTED) {
      navigate('/chain/dashboard');
    } else {
      sessionStorage.setItem('navigateToDashboard', 'true');
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
            <div onClick={handleStartSavingClick}>
              <PurpleBtn
                text={"Start Saving"}
                font={"bold"}
                icon={"rightArrow"}
              />
            </div>
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
            alt="mockup"
          />
        </div>

        {/* Background */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 -z-[5] ">
          <img src="/assets/blur.png" alt="" className="w-[650px] h-[550px] " />
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
            className="w-full h-full object-cover"
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
          Watch how ChainCircle revolutionizes cross-chain savings
        </p>
      </section>

      {/* How it works */}
      <section className="p-20 relative scroll-mt-32" id="how-it-works">
        {/* Background */}
        <div className="absolute top-20 right-40 lg:right-100 w-[350px] h-[350px] -z-[1]">
          <img
            src="/assets/wiw-bg.png"
            alt=""
            className="w-full h-full object-cover"
          />
        </div>
        <div className="absolute -bottom-20 left-0 w-full h-[350px] -z-[1]">
          <img
            src="/assets/Blur-oval.png"
            alt=""
            className="w-full h-full object-cover"
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
              alt=""
              className="w-[80px] h-[80px] lg:w-[110px] lg:h-[110px] object-cover absolute top-0 left-1/2 -translate-y-1/2 -translate-x-1/2"
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
              alt=""
              className="w-[80px] h-[80px] lg:w-[110px] lg:h-[110px] object-cover absolute top-0 left-1/2 -translate-y-1/2 -translate-x-1/2"
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
              alt=""
              className="w-[80px] h-[80px] lg:w-[110px] lg:h-[110px] object-cover absolute top-0 left-1/2 -translate-y-1/2 -translate-x-1/2"
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
            className="w-full h-full object-cover"
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
                alt=""
                className="h-[120px] w-[120px]"
              />
            </div>
          )}

          {/* Grids */}
          <div className="shadow shadow-[#F4AEFF] rounded-[16px]  w-full py-[50px] px-[30px] flex items-center gap-0 lg:gap-[30px] ">
            <img
              src="/assets/padlock.png"
              alt=""
              className="h-[110px] w-[110px] lg:h-[80px] lg:w-[80px] object-cover"
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
              alt=""
              className="h-[110px] w-[110px] lg:h-[80px] lg:w-[80px] object-cover"
            />
          </div>

          <div className="shadow shadow-[#F4AEFF] rounded-[16px] w-full py-[50px] px-[30px] flex items-center ggap-0 lg:gap-[30px] ">
            <img
              src="/assets/Reputation-Icon.png"
              alt=""
              className="h-[110px] w-[110px] lg:h-[80px] lg:w-[80px] object-cover"
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
                ${globalStats?.totalPooled ? parseFloat(globalStats.totalPooled).toLocaleString(undefined, {minimumFractionDigits: 0, maximumFractionDigits: 0}) : '0'} pooled
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
                ${globalStats?.totalPooled ? parseFloat(globalStats.totalPooled).toLocaleString(undefined, {minimumFractionDigits: 0, maximumFractionDigits: 0}) : '0'} pooled
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
            <Link
              className="hover:text-white transition ease-in-out hover:underline hover:scale-110 "
              to={"/faq"}
            >
              FAQ
            </Link>
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
          className="flex items-center gap-3 px-6 lg:px-8 py-3 lg:py-4 bg-[#000] hover:bg-[#111] rounded-full transition-all hover:scale-105 border border-[#F4AEFF]"
        >
          <span className="text-white font-semibold text-[14px] lg:text-[18px] uppercase">Back to top</span>
          <IoArrowUp size={isTabletOrMobile ? 20 : 24} className="text-[#D548EC]" />
        </button>
      </div>
    </div>
  );
}