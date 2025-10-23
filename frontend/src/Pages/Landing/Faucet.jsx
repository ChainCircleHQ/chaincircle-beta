import React, { useState, useEffect } from 'react'
import { useCircleContract } from '../../hooks/useCircleContract'
import { useCUSDBalance, useTimeUntilNextClaim, useClaimFaucet } from '../../hooks/useFaucet'
import PurpleBtn from '../../Components/PurpleBtn'
import { FaFaucet, FaCheckCircle, FaClock } from 'react-icons/fa'

export default function Faucet() {
  const { userAddress, isConnected } = useCircleContract()
  const { data: balance = '0', refetch: refetchBalance } = useCUSDBalance()
  const { data: timeUntilNext = 0, refetch: refetchTime } = useTimeUntilNextClaim()
  const claimMutation = useClaimFaucet()

  const [claimSuccess, setClaimSuccess] = useState(false)
  const [error, setError] = useState('')
  const [countdown, setCountdown] = useState(5)

  useEffect(() => {
    if (claimMutation.isSuccess && !claimSuccess) {
      setClaimSuccess(true)
      setError('')
      setCountdown(5)
    }
  }, [claimMutation.isSuccess])

  useEffect(() => {
    if (claimSuccess && countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000)
      return () => clearTimeout(timer)
    }
  }, [claimSuccess, countdown])

  useEffect(() => {
    if (claimMutation.isError) {
      const err = claimMutation.error
      console.error('Claim error:', err)
      if (err.message.includes('Claim cooldown') || err.message.includes('too early')) {
        setError('You must wait 24 hours between claims')
      } else {
        setError(err.message || 'Failed to claim tokens. Please try again.')
      }
    }
  }, [claimMutation.isError, claimMutation.error])

  const handleClaim = async (e) => {
    e?.preventDefault()
    e?.stopPropagation()

    if (!isConnected) {
      setError('Please connect your wallet first')
      return
    }

    setError('')
    setClaimSuccess(false)

    try {
      await claimMutation.mutateAsync()
      // After successful claim, redirect to home after 5 seconds
      setTimeout(() => {
        window.location.href = '/'
      }, 5000)
    } catch (err) {
      // Error is handled in useEffect
    }
  }

  const formatTime = (seconds) => {
    if (seconds === 0) return 'Available now'
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    return `${hours}h ${minutes}m remaining`
  }

  const canClaim = timeUntilNext === 0

  return (
    <div className="min-h-screen bg-black text-white p-6 lg:p-20">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex justify-center mb-6">
            <div className="w-20 h-20 lg:w-24 lg:h-24 rounded-full bg-gradient-to-r from-[#D548EC] to-[#F4AEFF] flex items-center justify-center">
              <FaFaucet className="text-white" size={40} />
            </div>
          </div>
          <h1 className="text-[32px] lg:text-[48px] font-bold mb-4">
            CUSD Faucet
          </h1>
          <p className="text-[16px] lg:text-[20px] text-gray-400 max-w-2xl mx-auto">
            Get free testnet CUSD tokens to start using ChainCircle. Claim 1,000 CUSD every 24 hours.
          </p>
        </div>

        {/* Main Card */}
        <div className="bg-[#111111] border border-[#F4AEFF] rounded-[24px] p-8 lg:p-12">
          {/* Balance Display */}
          <div className="text-center mb-8">
            <p className="text-[14px] lg:text-[16px] text-gray-400 mb-2">
              Your CUSD Balance
            </p>
            <p className="text-[36px] lg:text-[48px] font-bold text-[#D548EC]">
              {balance} <span className="text-[24px] lg:text-[32px]">CUSD</span>
            </p>
          </div>

          {/* Connection Status */}
          {!isConnected ? (
            <div className="text-center py-8 border border-yellow-500 rounded-lg bg-yellow-500/10 mb-6">
              <p className="text-yellow-400 text-[14px] lg:text-[16px]">
                Please connect your wallet to claim CUSD tokens
              </p>
            </div>
          ) : (
            <>
              {/* Cooldown Status */}
              <div className={`text-center py-6 rounded-lg mb-6 border ${
                canClaim
                  ? 'border-green-500 bg-green-500/10'
                  : 'border-gray-600 bg-gray-600/10'
              }`}>
                <div className="flex items-center justify-center gap-3 mb-2">
                  <FaClock className={canClaim ? 'text-green-400' : 'text-gray-400'} size={20} />
                  <p className={`text-[16px] lg:text-[18px] font-semibold ${
                    canClaim ? 'text-green-400' : 'text-gray-400'
                  }`}>
                    {formatTime(timeUntilNext)}
                  </p>
                </div>
                <p className="text-[12px] lg:text-[14px] text-gray-400">
                  {canClaim ? 'Ready to claim!' : 'Next claim available in'}
                </p>
              </div>

              {/* Success Message */}
              {claimSuccess && (
                <div className="text-center py-6 border border-green-500 rounded-lg bg-green-500/10 mb-6">
                  <div className="flex items-center justify-center gap-3 mb-2">
                    <FaCheckCircle className="text-green-400" size={24} />
                    <p className="text-green-400 text-[16px] lg:text-[18px] font-semibold">
                      Successfully claimed 1,000 CUSD!
                    </p>
                  </div>
                  <p className="text-[12px] lg:text-[14px] text-gray-400">
                    Tokens have been added to your wallet
                  </p>
                  <p className="text-[12px] lg:text-[14px] text-green-400 mt-2">
                    Redirecting to home in {countdown} seconds...
                  </p>
                </div>
              )}

              {/* Error Message */}
              {error && (
                <div className="text-center py-6 border border-red-500 rounded-lg bg-red-500/10 mb-6">
                  <p className="text-red-400 text-[14px] lg:text-[16px]">
                    {error}
                  </p>
                </div>
              )}

              {/* Claim Button */}
              <div className="max-w-md mx-auto">
                <button
                  onClick={handleClaim}
                  disabled={claimMutation.isPending || !canClaim}
                  className="w-full px-8 py-4 bg-[#D548EC] rounded-full hover:bg-[#B83CC3] transition-all font-bold text-[16px] lg:text-[18px] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {claimMutation.isPending ? 'Claiming...' : 'Claim 1,000 CUSD'}
                </button>
              </div>
            </>
          )}

          {/* Info Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-12 pt-8 border-t border-gray-700">
            <div className="text-center">
              <p className="text-[12px] lg:text-[14px] text-gray-400 mb-1">Claim Amount</p>
              <p className="text-[16px] lg:text-[20px] font-semibold">1,000 CUSD</p>
            </div>
            <div className="text-center">
              <p className="text-[12px] lg:text-[14px] text-gray-400 mb-1">Cooldown Period</p>
              <p className="text-[16px] lg:text-[20px] font-semibold">24 Hours</p>
            </div>
            <div className="text-center">
              <p className="text-[12px] lg:text-[14px] text-gray-400 mb-1">Network</p>
              <p className="text-[16px] lg:text-[20px] font-semibold">Push Chain</p>
            </div>
          </div>
        </div>

        {/* How to Use Section */}
        <div className="mt-12 bg-gradient-to-r from-[#D548EC]/10 to-[#F4AEFF]/10 rounded-[24px] p-6 lg:p-8 border border-[#D548EC]/20">
          <h2 className="text-[20px] lg:text-[28px] font-bold mb-6 text-center">
            How to Use the Faucet
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <div className="flex items-start gap-3 mb-4">
                <div className="w-8 h-8 rounded-full bg-[#D548EC] flex items-center justify-center flex-shrink-0 mt-1">
                  <span className="text-white font-bold">1</span>
                </div>
                <div>
                  <h3 className="text-[16px] lg:text-[18px] font-semibold mb-1">Connect Wallet</h3>
                  <p className="text-[12px] lg:text-[14px] text-gray-400">
                    Connect your wallet from any supported blockchain (Ethereum, Solana, etc.)
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 mb-4">
                <div className="w-8 h-8 rounded-full bg-[#D548EC] flex items-center justify-center flex-shrink-0 mt-1">
                  <span className="text-white font-bold">2</span>
                </div>
                <div>
                  <h3 className="text-[16px] lg:text-[18px] font-semibold mb-1">Claim Tokens</h3>
                  <p className="text-[12px] lg:text-[14px] text-gray-400">
                    Click "Claim 1,000 CUSD" and confirm the transaction in your wallet
                  </p>
                </div>
              </div>
            </div>

            <div>
              <div className="flex items-start gap-3 mb-4">
                <div className="w-8 h-8 rounded-full bg-[#D548EC] flex items-center justify-center flex-shrink-0 mt-1">
                  <span className="text-white font-bold">3</span>
                </div>
                <div>
                  <h3 className="text-[16px] lg:text-[18px] font-semibold mb-1">Wait 24 Hours</h3>
                  <p className="text-[12px] lg:text-[14px] text-gray-400">
                    After claiming, you must wait 24 hours before your next claim
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-[#D548EC] flex items-center justify-center flex-shrink-0 mt-1">
                  <span className="text-white font-bold">4</span>
                </div>
                <div>
                  <h3 className="text-[16px] lg:text-[18px] font-semibold mb-1">Start Saving</h3>
                  <p className="text-[12px] lg:text-[14px] text-gray-400">
                    Use your CUSD to create or join savings circles on ChainCircle
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* FAQ Section */}
        <div className="mt-12">
          <h2 className="text-[20px] lg:text-[24px] font-bold mb-6">
            Frequently Asked Questions
          </h2>

          <div className="space-y-4">
            <div className="border border-gray-700 rounded-lg p-4 lg:p-6">
              <h3 className="text-[14px] lg:text-[16px] font-semibold mb-2">
                What is CUSD?
              </h3>
              <p className="text-[12px] lg:text-[14px] text-gray-400">
                CUSD is a testnet stablecoin used on ChainCircle for testing purposes. It has no real-world value and is only used on Push Chain testnet.
              </p>
            </div>

            <div className="border border-gray-700 rounded-lg p-4 lg:p-6">
              <h3 className="text-[14px] lg:text-[16px] font-semibold mb-2">
                Why do I need CUSD?
              </h3>
              <p className="text-[12px] lg:text-[14px] text-gray-400">
                CUSD is required to participate in savings circles on ChainCircle. You need it to make contributions and join circles.
              </p>
            </div>

            <div className="border border-gray-700 rounded-lg p-4 lg:p-6">
              <h3 className="text-[14px] lg:text-[16px] font-semibold mb-2">
                How often can I claim?
              </h3>
              <p className="text-[12px] lg:text-[14px] text-gray-400">
                You can claim 1,000 CUSD once every 24 hours. The cooldown timer resets after each successful claim.
              </p>
            </div>

            <div className="border border-gray-700 rounded-lg p-4 lg:p-6">
              <h3 className="text-[14px] lg:text-[16px] font-semibold mb-2">
                Do I need gas fees?
              </h3>
              <p className="text-[12px] lg:text-[14px] text-gray-400">
                Yes, you'll need a small amount of PC (Push Chain native token) to pay for transaction gas fees. Get testnet PC from the Push Chain faucet.
              </p>
            </div>
          </div>
        </div>

        {/* Call to Action */}
        <div className="mt-12 text-center">
          <p className="text-[14px] lg:text-[16px] text-gray-400 mb-4">
            Ready to start saving?
          </p>
          <button
            onClick={() => window.location.href = '/chain/circle'}
            className="px-8 py-3 lg:px-12 lg:py-4 bg-transparent border-2 border-[#D548EC] rounded-full hover:bg-[#D548EC] transition-all font-bold text-[14px] lg:text-[16px]"
          >
            Go to Circles
          </button>
        </div>
      </div>
    </div>
  )
}
