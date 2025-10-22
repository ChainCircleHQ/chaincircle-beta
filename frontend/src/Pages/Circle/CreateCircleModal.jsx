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
const isTabletOrMobile = window.innerWidth <= 1014;

export default function CreateCircleModal({ onClose }) {

   useEffect(() => {
     // Scroll to top when component mounts
     window.scrollTo({
       top: 0,
       left: 0,
       behavior: "smooth", // Smooth scrolling animation
     });
   }, []); 
  
  const [step, setStep] = useState(1);
  
  

  // Single form data object to hold all form fields
  const [formData, setFormData] = useState({
    // Step 1 fields
    circleName: '',
    goalType: '',
    goalDescription: '',
    
    // Step 2 fields
    contributionAmount: '',
    currency: 'CUSD',
    duration: 7,
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

  const handleSubmit = async () => {
    try {
      // Validate required fields
      if (!formData.circleName || !formData.goalType || !formData.contributionAmount || !formData.maxMembers) {
        alert('Please fill in all required fields');
        return;
      }

      // Map goalType string to number
      const goalTypeMap = {
        'Home': GOAL_TYPES.HOME,
        'Education': GOAL_TYPES.EDUCATION,
        'Business': GOAL_TYPES.BUSINESS,
        'Emergency': GOAL_TYPES.EMERGENCY,
        'Travel': GOAL_TYPES.TRAVEL,
        'Other': GOAL_TYPES.OTHER
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
      // Don't show alert - Push Chain already shows transaction status
      onClose();
    } catch (error) {
      console.error('Failed to create circle:', error);
      setTxStatus('');

      // Only show error if it's not a user rejection (Push Chain handles that)
      if (!error.message.includes('user rejected') && !error.message.includes('User rejected')) {
        if (error.message.includes('insufficient funds')) {
          console.error('Insufficient CUSD balance');
        } else {
          console.error('Error creating circle:', error);
        }
      }
    }
  }
  
  return (
    <div className="absolute font-dm z-90 top-0 rounded-[35px] left-0 w-full h-[140%] bg-[#00000062] backdrop-blur-lg bg-opacity-50 flex flex-col items-center">
      <div className="flex items-center gap-8 w-full px-5">
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
      <div className="w-[95%] border-y border-y-[#aaa] py-2 lg:w-[50%] ">
        {step === 1 && (
          <Step1 formData={formData} updateFormData={updateFormData} />
        )}
        {step === 2 && (
          <Step2 formData={formData} updateFormData={updateFormData} />
        )}
        {step === 3 && (
          <Step3 formData={formData} updateFormData={updateFormData} />
        )}
      </div>

      {/* Form Buttons */}
      <div className="w-[95%] py-8 flex items-center justify-between ">
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
            type="text"
            placeholder="Enter an Amount"
            value={formData.contributionAmount}
            onChange={(e) =>
              updateFormData("contributionAmount", e.target.value)
            }
            className="flex-1 text-[12px] lg:text-[21px] border outline-none border-[#F4AEFF] rounded-[8px] p-3 bg-transparent text-gray-400 placeholder-gray-500"
          />
          <select
            value={formData.currency}
            onChange={(e) => updateFormData("currency", e.target.value)}
            className="text-[12px] lg:text-[21px] border outline-none border-[#F4AEFF] rounded-[8px] p-3 bg-black text-white min-w-[80px]"
          >
            <option value="CUSD">CUSD</option>
            <option value="USD">USD</option>
            <option value="ETH">ETH</option>
            <option value="BNB">BNB</option>
          </select>
        </div>
      </div>

      {/* Duration */}
      <div className="flex flex-col gap-2">
        <label className="text-[12px] lg:text-[18px]">Duration (months)</label>
        <div className="flex items-center gap-4">
          <div className="flex-1 flex p-[3px] items-center gap-[3px] bg-[#d648ec5e] h-[25px]">
            {[...Array(12)].map((_, idx) => (
              <div
                className={`flex-1 text-[12px] flex items-center justify-center h-full hover:bg-[#D548EC] hover:text-white cursor-pointer ${
                  idx < formData.duration ? "bg-[#D548EC] text-white" : "bg-transparent text-transparent"
                }`}
                onClick={() => updateFormData("duration", idx + 1)}
              >{idx + 1}</div>
            ))}
          </div>
          <div className="w-[60px] h-[40px] border border-[#F4AEFF] rounded-[8px] flex items-center justify-center bg-transparent">
            <input
              className="text-white text-[14px] outline-none bg-transparent w-full text-center"
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

const Step3 = ({ formData, updateFormData }) => { 
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
        return <RiHome4Fill size={isTabletOrMobile ? 24 : null} />;
      case "Project G-Wagon":
        return <FaCar size={isTabletOrMobile ? 24 : null} />;
      case "Our incoming heir":
        return <FaFaceSmileBeam size={isTabletOrMobile ? 24 : null} />;
      case "Detty December":
        return <MdCelebration size={isTabletOrMobile ? 24 : null} />;
      case "Next Elon Musks":
        return <FaUserAstronaut size={isTabletOrMobile ? 24 : null} />;
      default:
        return <FaCar size={isTabletOrMobile ? 24 : null} />;
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
          <span className="text-[#D548EC] underline cursor-pointer">
            Terms and Conditions
          </span>
        </label>
      </div>
    </div>
  );
}