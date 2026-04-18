import React, { useEffect, useState } from 'react'
import TransBtn from '../../Components/TransBtn';
import PurpleBtn from '../../Components/PurpleBtn';
import { RiHome4Fill } from 'react-icons/ri';
import { FaCar, FaFaceSmileBeam, FaUserAstronaut, FaGraduationCap, FaBriefcase } from 'react-icons/fa6';
import { MdCelebration, MdOutlineHealthAndSafety } from 'react-icons/md';
import { PiCaretDownBold } from "react-icons/pi";
import { IoClose } from "react-icons/io5";
import { useCreateCircle } from '../../hooks/useCircleActions';
import { GOAL_TYPES } from '../../utils/constants';
import { CONTACT } from '../../config/contact';
import { Link } from 'react-router';
import useIsTabletOrMobile from '../../hooks/useIsTabletOrMobile';

export default function CreateCircleModal({ onClose }) {
  const isTabletOrMobile = useIsTabletOrMobile();

   useEffect(() => {
     // Scroll to top when component mounts
     window.scrollTo({
       top: 0,
       left: 0,
       behavior: "smooth", // Smooth scrolling animation
     });
   }, []);

  const [step, setStep] = useState(1);
  const [showTerms, setShowTerms] = useState(false);
  
  

  // Single form data object to hold all form fields
  const [formData, setFormData] = useState({
    // Step 1 fields
    circleName: '',
    goalType: '',
    goalDescription: '',

    // Step 2 fields
    contributionAmount: '',
    currency: 'CUSD',
    duration: 3,
    frequency: 'Weekly',
    maxMembers: '',

    // Step 3 fields
    themeColor: 'Chain yellow',
    estimatedFees: 200,
    whoPaysFist: 'You',
    acceptTerms: false,
  });

  // Function to update form data
  const updateFormData = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleNext = () => {
    setStep((c) => c + 1);
  }

  const handlePrev = () => {
    setStep((c) => c - 1);
  }

  const handleClear = () => {
    // Clear all form fields
    setFormData({
      circleName: '',
      goalType: '',
      goalDescription: '',
      contributionAmount: '',
      currency: 'CUSD',
      duration: 7,
      frequency: 'Weekly',
      maxMembers: '',
      themeColor: 'Chain yellow',
      estimatedFees: 200,
      whoPaysFist: 'You',
      acceptTerms: false,
    });
  }

  const createCircle = useCreateCircle();
  const [txStatus, setTxStatus] = React.useState('');
  const [validationError, setValidationError] = React.useState('');

  const handleSubmit = async () => {
    try {
      // Validate required fields
      if (!formData.circleName || !formData.goalType || !formData.contributionAmount || !formData.maxMembers) {
        setValidationError('Please fill in all required fields');
        return;
      }

      // Validate minimum contribution amount
      if (parseInt(formData.contributionAmount) < 100) {
        setValidationError('Minimum contribution amount is 100 CUSD');
        return;
      }

      // Validate minimum duration
      if (parseInt(formData.duration) < 3) {
        setValidationError('Minimum duration is 3 months');
        return;
      }

      // Validate Terms acceptance
      if (!formData.acceptTerms) {
        setValidationError('You must accept the Terms and Conditions to create a circle');
        return;
      }

      // Clear validation error if all checks pass
      setValidationError('');

      // Map goalType string to the on-chain enum. Keys include both the
      // fancy brand labels used in Step1/Step3 preview AND the plain keys,
      // so a future switch back to plain labels Just Works.
      const goalTypeMap = {
        Home: GOAL_TYPES.HOME,
        Education: GOAL_TYPES.EDUCATION,
        Business: GOAL_TYPES.BUSINESS,
        Emergency: GOAL_TYPES.EMERGENCY,
        Travel: GOAL_TYPES.TRAVEL,
        Other: GOAL_TYPES.OTHER,
        'Dream Home Squad': GOAL_TYPES.HOME,
        'Project G-Wagon': GOAL_TYPES.TRAVEL,
        'Our incoming heir': GOAL_TYPES.EMERGENCY,
        'Detty December': GOAL_TYPES.OTHER,
        'Next Elon Musks': GOAL_TYPES.BUSINESS,
      };

      const goalTypeNum = goalTypeMap[formData.goalType] ?? GOAL_TYPES.OTHER;

      // Map frequency to number (0 = Monthly, 1 = Weekly)
      const frequencyNum = formData.frequency === 'Monthly' ? 0 : 1;

      // Show transaction is starting (Push Chain will handle the rest)
      setTxStatus('Preparing transaction...');

      // Create circle on blockchain
      await createCircle.mutateAsync({
        name: formData.circleName,
        goalType: goalTypeNum,
        amount: formData.contributionAmount,
        duration: formData.duration,
        maxMembers: formData.maxMembers,
        frequency: frequencyNum
      });

      setTxStatus('');
      setValidationError('');
      // Don't show alert - Push Chain already shows transaction status
      onClose();
    } catch (error) {
      setTxStatus('');

      // Only show error if it's not a user rejection (Push Chain handles that)
      if (!error.message.includes('user rejected') && !error.message.includes('User rejected')) {
        if (error.message.includes('insufficient funds')) {
          setValidationError('Insufficient CUSD balance. Please claim from the faucet first.');
        } else {
          setValidationError('Error creating circle. Please try again.');
        }
      }
    }
  }
  
  return (
    <div className="fixed font-dm z-[90] inset-0 bg-black/60 backdrop-blur-lg flex flex-col items-center justify-start overflow-y-auto py-8">
      <div className="flex items-center gap-8 w-full max-w-[800px] px-5">
        <IoClose onClick={()=> onClose()} cursor={"pointer"} className='hover:scale-115 transition-all ease-in-out ' />
        <div className="py-5 w-[90%] flex flex-col items-center">
          <div className="relative w-[90%]  flex items-center justify-between py-4 ">
            <div className="absolute -z-5 w-full h-[10px] top-1/2 left-0 transition-all ease-in-out -translate-y-1/2 flex items-center ">
              {[1, 2].map((s) => (
                <div
                  key={s}
                  className={`flex-1 h-full ${
                    s === 1 ? "rounded-l-full" : "rounded-r-full"
                  } ${step > s ? "bg-[#D548EC]" : "bg-[#AAAAAA]"}`}
                ></div>
              ))}
            </div>
            {[1, 2, 3].map((s) => (
              <div key={s}>
                <div
                  className={`h-[29px] w-[29px] flex items-center justify-center font-bold text-[14px] text-white rounded-full ${
                    step >= s ? "bg-[#D548EC]" : "bg-[#AAAAAA]"
                  } `}
                >
                  {s}
                </div>
              </div>
            ))}
          </div>

          <div className="w-[92%] flex items-center justify-between ">
            {["Basic Info", "Settings", "Review & Create"].map((s, index) => (
              <div key={index}>
                <div
                  className={` text-center font-bold text-[12px] rounded-full ${
                    index <= step - 1 ? "text-[#D548EC]" : "text-[#AAAAAA]"
                  } `}
                >
                  {s}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Form Steps  */}
      <div className="w-[95%] max-w-[800px] border-y border-y-[#aaa] py-2">
        {step === 1 && (
          <Step1 formData={formData} updateFormData={updateFormData} />
        )}
        {step === 2 && (
          <Step2 formData={formData} updateFormData={updateFormData} />
        )}
        {step === 3 && (
          <Step3 formData={formData} updateFormData={updateFormData} onShowTerms={() => setShowTerms(true)} />
        )}
      </div>

      {/* Terms and Conditions Modal */}
      {showTerms && (
        <TermsModal onClose={() => setShowTerms(false)} />
      )}

      {/* Validation Error Message */}
      {validationError && (
        <div className="w-[95%] max-w-[800px] mt-4">
          <div className="bg-red-500/10 border border-red-500 rounded-lg p-4 text-center">
            <p className="text-red-400 text-[14px] lg:text-[16px]">{validationError}</p>
          </div>
        </div>
      )}

      {/* Form Buttons */}
      <div className="w-[95%] max-w-[800px] py-8 flex items-center justify-between">
        <TransBtn
          text={`${step === 1 ? "Clear all Fields" : "Back"}`}
          action={step === 1 ? handleClear : handlePrev}
        />

        <PurpleBtn
          text={`${step === 3 ? (createCircle.isPending ? (txStatus || "Processing...") : "Create Circle") : "Next"}`}
          icon={"rightArrow"}
          action={step === 3 ? handleSubmit : handleNext}
          disabled={createCircle.isPending}
        />
      </div>
    </div>
  );
}

const Step1 = ({ formData, updateFormData }) => { 
  return (
    <div className="p-5 flex flex-col gap-6 ">
      <div className="flex flex-col gap-2 ">
        <label className="text-[12px] lg:text-[18px] ">Circle Name</label>
        <input
          type="text"
          placeholder="Enter circle name"
          value={formData.circleName}
          onChange={(e) => updateFormData("circleName", e.target.value)}
          className="w-full text-[12px] lg:text-[21px] border outline-none border-[#F4AEFF] rounded-[8px] p-3 bg-transparent"
        />
      </div>
      <div className="flex flex-col gap-2 ">
        <label className="text-[12px] lg:text-[18px] ">Goal Type</label>
        <select
          value={formData.goalType}
          onChange={(e) => updateFormData("goalType", e.target.value)}
          className="w-full text-[#aaa] text-[12px] lg:text-[21px] border outline-none border-[#F4AEFF] rounded-[8px] p-3 bg-transparent"
        >
          <option value="">Select an option</option>
          <option value="Dream Home Squad">Dream Home Squad</option>
          <option value="Project G-Wagon">Project G-Wagon</option>
          <option value="Our incoming heir">Our incoming heir</option>
          <option value="Detty December">Detty December</option>
          <option value="Next Elon Musks">Next Elon Musks</option>
        </select>
      </div>
      <div className="flex flex-col gap-2 ">
        <label className="text-[12px] lg:text-[18px] ">Goal Description</label>
        <input
          type="text"
          placeholder="Type a description"
          value={formData.goalDescription}
          onChange={(e) => updateFormData("goalDescription", e.target.value)}
          className="w-full text-[12px] lg:text-[21px] border outline-none border-[#F4AEFF] rounded-[8px] p-3 bg-transparent"
        />
      </div>
    </div>
  );
}

const Step2 = ({ formData, updateFormData }) => { 
  return (
    <div className="p-5 flex flex-col gap-6 text-white">
      {/* Contribution Amount */}
      <div className="flex flex-col gap-2">
        <label className="text-[12px] lg:text-[18px]">
          Contribution Amount:
        </label>
        <div className="flex gap-2">
          <input
            type="number"
            placeholder="Min 100 CUSD"
            value={formData.contributionAmount}
            onChange={(e) => updateFormData("contributionAmount", e.target.value)}
            className="flex-1 text-[12px] lg:text-[21px] border outline-none border-[#F4AEFF] rounded-[8px] p-3 bg-transparent text-white placeholder-gray-500"
          />
          <div className="text-[12px] lg:text-[21px] border border-[#F4AEFF] rounded-[8px] p-3 bg-black text-white min-w-[80px] flex items-center justify-center">
            CUSD
          </div>
        </div>
      </div>

      {/* Duration */}
      <div className="flex flex-col gap-2">
        <label className="text-[12px] lg:text-[18px]">Duration (months)</label>
        <div className="flex items-center gap-4">
          <div className="flex-1 flex p-[3px] items-center gap-[3px] bg-[#d648ec5e] h-[25px]">
            {[...Array(12)].map((_, idx) => {
              const monthValue = idx + 1;
              return (
                <div
                  key={idx}
                  className={`flex-1 text-[12px] flex items-center justify-center h-full hover:bg-[#D548EC] hover:text-white cursor-pointer ${
                    monthValue <= formData.duration ? "bg-[#D548EC] text-white" : "bg-transparent text-transparent"
                  }`}
                  onClick={() => updateFormData("duration", monthValue)}
                >{monthValue}</div>
              );
            })}
          </div>
          <div className="w-[60px] h-[40px] border border-[#F4AEFF] rounded-[8px] flex items-center justify-center bg-transparent">
            <input
              className="text-white text-[14px] outline-none bg-transparent w-full text-center"
              type="number"
              placeholder="Min 3"
              value={formData.duration}
              onChange={(e) => updateFormData("duration", e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Frequency */}
      <div className="flex flex-col gap-2">
        <label className="text-[12px] lg:text-[18px]">Frequency</label>
        <div className="flex gap-2 border border-[#F4AEFF] rounded-[8px]  p-2">
          <button
            onClick={() => updateFormData("frequency", "Weekly")}
            className={`flex-1 p-3 rounded-[8px] text-[12px] lg:text-[18px] transition-all cursor-pointer hover:scale-x-95 ${
              formData.frequency === "Weekly"
                ? "bg-[#D548EC] transition-all ease-in-out text-white"
                : "bg-transparent hover:border border-[#f4aeff] text-gray-400"
            }`}
          >
            Weekly
          </button>
          <button
            onClick={() => updateFormData("frequency", "Monthly")}
            className={`flex-1 p-3 rounded-[8px] text-[12px] lg:text-[18px] transition-all cursor-pointer hover:scale-x-95 ${
              formData.frequency === "Monthly"
                ? "bg-[#D548EC] transition-all ease-in-out text-white"
                : "bg-transparent  hover:border border-[#f4aeff] text-gray-400"
            }`}
          >
            Monthly
          </button>
        </div>
      </div>

      {/* Maximum Members */}
      <div className="flex flex-col gap-2">
        <label className="text-[12px] lg:text-[18px]">Maximum Members</label>
        <select
          value={formData.maxMembers}
          onChange={(e) => updateFormData("maxMembers", e.target.value)}
          className="w-full text-[12px] lg:text-[21px] border outline-none border-[#F4AEFF] rounded-[8px] p-3 bg-black text-gray-400"
        >
          <option value="">Choose a range</option>
          <option value="3">3 members</option>
          <option value="6">6 members</option>
          <option value="9">9 members</option>
          <option value="12">12 members</option>
        </select>
      </div>

      <style jsx>{`
        .slider::-webkit-slider-thumb {
          appearance: none;
          height: 20px;
          width: 20px;
          border-radius: 50%;
          background: #d548ec;
          cursor: pointer;
          border: 2px solid #fff;
        }

        .slider::-moz-range-thumb {
          height: 20px;
          width: 20px;
          border-radius: 50%;
          background: #d548ec;
          cursor: pointer;
          border: 2px solid #fff;
        }
      `}</style>
    </div>
  );
}

const Step3 = ({ formData, updateFormData, onShowTerms }) => {
  const isTabletOrMobile = useIsTabletOrMobile();

  // Theme colors mapping
  const themeColors = {
    'Chain yellow': '#FFA500',
    'Purple': '#D548EC',
    'Blue': '#4887EC',
    'Green': '#48EC4D',
    'Red': '#EC4848'
  };

  // Get circle icon based on goal type
  const getCircleIcon = () => {
    switch (formData.goalType) {
      case "Dream Home Squad":
        return <RiHome4Fill size={isTabletOrMobile ? 24 : 48} />;
      case "Project G-Wagon":
        return <FaCar size={isTabletOrMobile ? 24 : 48} />;
      case "Our incoming heir":
        return <FaFaceSmileBeam size={isTabletOrMobile ? 24 : 48} />;
      case "Detty December":
        return <MdCelebration size={isTabletOrMobile ? 24 : 48} />;
      case "Next Elon Musks":
        return <FaUserAstronaut size={isTabletOrMobile ? 24 : 48} />;
      default:
        return <FaCar size={isTabletOrMobile ? 24 : 48} />;
    }
  };
  

  return (
    <div className="p-5 flex flex-col gap-6 text-white">
      {/* Circle Preview */}
      <div className="flex flex-col gap-2">
        <label className="text-[12px] lg:text-[18px]">Circle Preview</label>
        <div className="border border-[#F4AEFF] rounded-[16px] p-6 bg-[#1a1a1a]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {/* Circle Avatar */}
              <div
                className="lg:w-[102px] lg:h-[102px] w-[80px] h-[80px]  rounded-full flex items-center justify-center text-2xl"
                style={{
                  backgroundColor: themeColors[formData.themeColor] + "40",
                  color: themeColors[formData.themeColor],
                }}
              >
                {getCircleIcon()}
              </div>

              {/* Circle Info */}
              <div className="flex flex-col gap-1">
                <h3 className="text-[16px] lg:text-[20px]">
                  {formData.goalType || "Project G-Wagon"}
                </h3>

                {/* Progress Bar */}
                <div className="flex items-center gap-2">
                  <div className="w-24 h-2 bg-gray-600 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: "0%",
                        backgroundColor: themeColors[formData.themeColor],
                      }}
                    ></div>
                  </div>
                  <span className="text-[12px] text-gray-400">0%</span>
                </div>

                {/* Members Count */}
                <div className="text-[12px] text-gray-400">
                  {formData.maxMembers || "No"}{" "}
                  {formData.maxMembers <= "1" ? "Member" : "Members"}
                </div>
              </div>
            </div>

            {/* Three dots menu */}
            <div className="text-gray-400">⋯</div>
          </div>
        </div>
      </div>

      {/* Select Theme Color */}
      <div className="flex flex-col gap-2">
        <label className="text-[12px] lg:text-[18px]">Select theme color</label>
        <div className="relative">
          <select
            value={formData.themeColor}
            onChange={(e) => updateFormData("themeColor", e.target.value)}
            className="w-full text-[12px] lg:text-[18px] border outline-none border-[#F4AEFF] rounded-[8px] p-3 bg-black text-white appearance-none pr-10"
          >
            <option value="Chain yellow">Chain Yellow</option>
            <option value="Purple">Chain Purple</option>
            <option value="Blue">Chain Blue</option>
            <option value="Green">Chain Green</option>
            <option value="Red">Chain Red</option>
          </select>

          {/* Color indicator */}
          <div
            className="absolute right-12 top-1/2 -translate-y-1/2 w-4 h-4 rounded"
            style={{ backgroundColor: themeColors[formData.themeColor] }}
          ></div>

          {/* Dropdown arrow */}
          <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-[13px] lg:text-[18px] ">
            <PiCaretDownBold />
          </div>
        </div>
      </div>

      {/* Estimated Fees */}
      <div className="flex items-center justify-between">
        <label className="text-[12px] lg:text-[18px]">Estimated fees (%)</label>
        <div className="text-[14px] lg:text-[18px]">
          $ {formData.contributionAmount ? formData.contributionAmount*(1/100) : 0}
        </div>
      </div>

      {/* Who Pays First */}
      <div className="flex items-center justify-between">
        <label className="text-[12px] lg:text-[18px]">Who pays first</label>
        <div className="text-[14px] lg:text-[18px]">{formData.whoPaysFist}</div>
      </div>

      {/* Terms and Conditions */}
      <div className="flex justify-center items-center gap-3 mt-4">
        <input
          type="checkbox"
          id="terms"
          checked={formData.acceptTerms}
          onChange={(e) => updateFormData("acceptTerms", e.target.checked)}
          className=" text-[#D548EC] bg-transparent border-2 h-[17px] w-[17px] border-[#F4AEFF] rounded focus:ring-[#D548EC] focus:ring-2"
        />
        <label
          htmlFor="terms"
          className="text-[12px] lg:text-[16px] text-gray-300"
        >
          I accept Chaincircle's{" "}
          <span
            onClick={onShowTerms}
            className="text-[#D548EC] underline cursor-pointer hover:text-[#B83CC3] transition-colors"
          >
            Terms and Conditions
          </span>
        </label>
      </div>
    </div>
  );
}

const TermsModal = ({ onClose }) => {
  const isTabletOrMobile = useIsTabletOrMobile();
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 font-dm">
      <div className="relative w-full max-w-4xl max-h-[90vh] bg-[#111111] rounded-[20px] border border-[#F4AEFF] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 lg:p-8 border-b border-[#F4AEFF] bg-gradient-to-b from-[#111111] to-[#1a1a1a]">
          <h2 className="text-2xl lg:text-4xl font-bold text-white">
            Terms and Conditions
          </h2>
          <IoClose
            onClick={onClose}
            size={isTabletOrMobile ? 28 : 36}
            className="cursor-pointer hover:scale-110 transition-all text-white"
          />
        </div>

        {/* Content - Scrollable */}
        <div className="flex-1 overflow-y-auto p-6 lg:p-8 space-y-6 text-white">
          <p className="text-[#AAAAAA] text-base lg:text-lg">
            Last updated: {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
          </p>

          {/* Section 1 */}
          <section>
            <h3 className="text-xl lg:text-2xl font-bold mb-3 text-[#D548EC]">
              1. Acceptance of Terms
            </h3>
            <p className="text-[#CCCCCC] text-base lg:text-lg leading-relaxed">
              By accessing and using ChainCircle ("the Platform"), you accept and agree to be bound by the terms and provision of this agreement. If you do not agree to these Terms and Conditions, please do not use the Platform.
            </p>
          </section>

          {/* Section 2 */}
          <section>
            <h3 className="text-xl lg:text-2xl font-bold mb-3 text-[#D548EC]">
              2. Description of Service
            </h3>
            <p className="text-[#CCCCCC] text-sm lg:text-base leading-relaxed mb-3">
              ChainCircle is a decentralized savings circle platform built on Push Chain that enables users to:
            </p>
            <ul className="list-disc list-inside space-y-2 text-[#CCCCCC] text-base lg:text-lg ml-4">
              <li>Create and join savings circles with other users</li>
              <li>Make periodic contributions using CUSD (Circle USD)</li>
              <li>Receive payouts according to the circle's schedule</li>
              <li>Earn reputation points and badges through participation</li>
              <li>Participate in governance (for qualified users)</li>
            </ul>
          </section>

          {/* Section 3 */}
          <section>
            <h3 className="text-xl lg:text-2xl font-bold mb-3 text-[#D548EC]">
              3. User Responsibilities
            </h3>
            <p className="text-[#CCCCCC] text-sm lg:text-base leading-relaxed mb-3">
              As a user of ChainCircle, you agree to:
            </p>
            <ul className="list-disc list-inside space-y-2 text-[#CCCCCC] text-base lg:text-lg ml-4">
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
            <h3 className="text-xl lg:text-2xl font-bold mb-3 text-[#D548EC]">
              4. Financial Risks
            </h3>
            <p className="text-[#CCCCCC] text-sm lg:text-base leading-relaxed mb-3">
              <strong className="text-white">IMPORTANT:</strong> By using ChainCircle, you acknowledge and accept the following risks:
            </p>
            <ul className="list-disc list-inside space-y-2 text-[#CCCCCC] text-base lg:text-lg ml-4">
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
            <h3 className="text-xl lg:text-2xl font-bold mb-3 text-[#D548EC]">
              5. Circle Creation and Participation
            </h3>
            <p className="text-[#CCCCCC] text-sm lg:text-base leading-relaxed mb-3">
              When creating or joining a circle:
            </p>
            <ul className="list-disc list-inside space-y-2 text-[#CCCCCC] text-base lg:text-lg ml-4">
              <li>You commit to making all scheduled contributions on time</li>
              <li>Late payments may result in reputation penalties</li>
              <li>Circle creators are responsible for accurate configuration</li>
              <li>Once a circle starts, terms cannot be modified</li>
              <li>Early withdrawal may not be possible without penalties</li>
            </ul>
          </section>

          {/* Section 6 */}
          <section>
            <h3 className="text-xl lg:text-2xl font-bold mb-3 text-[#D548EC]">
              6. Reputation System
            </h3>
            <p className="text-[#CCCCCC] text-base lg:text-lg leading-relaxed">
              ChainCircle uses a reputation system to track user behavior. Your reputation score is determined by payment history, circle completion, and other factors. Negative actions (late payments, defaults) will decrease your reputation and may limit your access to certain features.
            </p>
          </section>

          {/* Section 7 */}
          <section>
            <h3 className="text-xl lg:text-2xl font-bold mb-3 text-[#D548EC]">
              7. Smart Contract Interactions
            </h3>
            <p className="text-[#CCCCCC] text-base lg:text-lg leading-relaxed">
              All transactions on ChainCircle are executed through smart contracts on the Push Chain blockchain. Once a transaction is confirmed on the blockchain, it is irreversible. You are responsible for verifying all transaction details before confirmation.
            </p>
          </section>

          {/* Section 8 */}
          <section>
            <h3 className="text-xl lg:text-2xl font-bold mb-3 text-[#D548EC]">
              8. Limitation of Liability
            </h3>
            <p className="text-[#CCCCCC] text-base lg:text-lg leading-relaxed">
              ChainCircle and its developers shall not be liable for any direct, indirect, incidental, special, consequential, or exemplary damages resulting from your use of the Platform, including but not limited to loss of funds, loss of profits, or loss of data.
            </p>
          </section>

          {/* Section 9 */}
          <section>
            <h3 className="text-xl lg:text-2xl font-bold mb-3 text-[#D548EC]">
              9. Prohibited Activities
            </h3>
            <p className="text-[#CCCCCC] text-sm lg:text-base leading-relaxed mb-3">
              You may not:
            </p>
            <ul className="list-disc list-inside space-y-2 text-[#CCCCCC] text-base lg:text-lg ml-4">
              <li>Use the Platform for money laundering or illegal activities</li>
              <li>Attempt to hack, exploit, or manipulate smart contracts</li>
              <li>Create circles with the intent to defraud other users</li>
              <li>Use automated bots or scripts to gain unfair advantages</li>
              <li>Impersonate other users or entities</li>
            </ul>
          </section>

          {/* Section 10 */}
          <section>
            <h3 className="text-xl lg:text-2xl font-bold mb-3 text-[#D548EC]">
              10. Privacy and Data
            </h3>
            <p className="text-[#CCCCCC] text-base lg:text-lg leading-relaxed">
              Your wallet address and on-chain activities are publicly visible on the blockchain. While ChainCircle does not collect personal information, blockchain transactions are transparent and permanent.
            </p>
          </section>

          {/* Section 11 */}
          <section>
            <h3 className="text-xl lg:text-2xl font-bold mb-3 text-[#D548EC]">
              11. Modifications to Terms
            </h3>
            <p className="text-[#CCCCCC] text-base lg:text-lg leading-relaxed">
              ChainCircle reserves the right to modify these Terms and Conditions at any time. Continued use of the Platform after changes constitutes acceptance of the modified terms. Material changes will be communicated through the Platform.
            </p>
          </section>

          {/* Section 12 */}
          <section>
            <h3 className="text-xl lg:text-2xl font-bold mb-3 text-[#D548EC]">
              12. Termination
            </h3>
            <p className="text-[#CCCCCC] text-base lg:text-lg leading-relaxed">
              ChainCircle may terminate or suspend your access to the Platform at any time for violation of these Terms and Conditions or for any other reason at our sole discretion, without prior notice.
            </p>
          </section>

          {/* Section 13 */}
          <section>
            <h3 className="text-xl lg:text-2xl font-bold mb-3 text-[#D548EC]">
              13. Governing Law
            </h3>
            <p className="text-[#CCCCCC] text-base lg:text-lg leading-relaxed">
              These Terms and Conditions shall be governed by and construed in accordance with applicable laws. Any disputes arising from these terms shall be resolved through binding arbitration.
            </p>
          </section>

          {/* Section 14 */}
          <section>
            <h3 className="text-xl lg:text-2xl font-bold mb-3 text-[#D548EC]">
              14. Contact Information
            </h3>
            <p className="text-[#CCCCCC] text-sm lg:text-base leading-relaxed mb-3">
              For questions or concerns about these Terms and Conditions, please contact us:
            </p>
            <ul className="list-none space-y-2 text-[#CCCCCC] text-base lg:text-lg ml-4">
              <li>Email: <a href={`mailto:${CONTACT.email}`} className="text-[#D548EC] hover:underline">{CONTACT.email}</a></li>
              <li>Twitter: <a href={CONTACT.twitterUrl} target="_blank" rel="noopener noreferrer" className="text-[#D548EC] hover:underline">{CONTACT.twitter}</a></li>
              <li>GitHub: <a href={CONTACT.githubUrl} target="_blank" rel="noopener noreferrer" className="text-[#D548EC] hover:underline">{CONTACT.github}</a></li>
            </ul>
          </section>

          {/* Agreement */}
          <section className="p-4 lg:p-6 border border-[#D548EC] rounded-lg bg-[#D548EC]/10">
            <p className="text-white font-semibold text-lg lg:text-xl mb-3">
              By using ChainCircle, you acknowledge that:
            </p>
            <ul className="list-disc list-inside space-y-2 text-[#CCCCCC] text-base lg:text-lg ml-4">
              <li>You have read and understood these Terms and Conditions</li>
              <li>You accept all risks associated with using the Platform</li>
              <li>You are solely responsible for your financial decisions</li>
              <li>You will comply with all terms outlined above</li>
            </ul>
          </section>
        </div>

        {/* Footer with Close Button */}
        <div className="p-6 lg:p-8 border-t border-[#F4AEFF] bg-gradient-to-t from-[#111111] to-[#1a1a1a]">
          <PurpleBtn
            text="Close"
            action={onClose}
          />
        </div>
      </div>
    </div>
  );
}