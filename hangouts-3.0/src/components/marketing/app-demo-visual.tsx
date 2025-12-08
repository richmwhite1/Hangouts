'use client'

import { useState, useEffect } from 'react'
import { Calendar, Users, Check, Sparkles } from 'lucide-react'

export function AppDemoVisual() {
  const [step, setStep] = useState(0)

  useEffect(() => {
    const timer = setInterval(() => {
      setStep((prev) => (prev + 1) % 4)
    }, 2500)
    return () => clearInterval(timer)
  }, [])

  return (
    <div className="max-w-4xl mx-auto mt-16 px-4">
      <div className="relative">
        {/* Phone mockup */}
        <div className="relative mx-auto w-full max-w-sm">
          {/* Phone frame */}
          <div className="relative bg-black rounded-[3rem] p-4 shadow-2xl shadow-[#FF1493]/30 border-8 border-gray-900">
            {/* Notch */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-40 h-7 bg-black rounded-b-3xl z-10" />
            
            {/* Screen */}
            <div className="relative bg-black rounded-[2.5rem] overflow-hidden aspect-[9/19.5] border border-gray-800">
              {/* Status bar */}
              <div className="absolute top-0 left-0 right-0 h-12 bg-black z-20 flex items-center justify-between px-8 text-white text-xs">
                <span>9:41</span>
                <div className="flex gap-1">
                  <div className="w-4 h-3 border border-white rounded-sm" />
                  <div className="w-4 h-3 border border-white rounded-sm" />
                  <div className="w-4 h-3 border border-white rounded-sm" />
                </div>
              </div>

              {/* App Content - Animated Steps */}
              <div className="absolute inset-0 pt-12">
                {/* Step 1: Create */}
                <div className={`absolute inset-0 transition-all duration-500 ${step === 0 ? 'opacity-100 translate-x-0' : step > 0 ? 'opacity-0 -translate-x-full' : 'opacity-0 translate-x-full'}`}>
                  <div className="p-6 pt-8">
                    <h3 className="text-2xl font-bold text-white mb-6">Create Hangout</h3>
                    <div className="space-y-4">
                      <div className="bg-gray-900 rounded-xl p-4 border border-gray-800">
                        <input 
                          type="text" 
                          value="Weekend Brunch" 
                          readOnly
                          className="bg-transparent text-white text-lg w-full outline-none"
                        />
                      </div>
                      <div className="bg-gray-900 rounded-xl p-4 border border-gray-800 flex items-center gap-3">
                        <Calendar className="w-5 h-5 text-[#FF1493]" />
                        <span className="text-gray-300">Saturday 11am</span>
                      </div>
                      <div className="mt-6">
                        <div className="bg-[#FF1493] text-white rounded-xl py-4 text-center font-bold text-lg shadow-lg shadow-[#FF1493]/50">
                          Send to Friends
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Step 2: Friends Vote */}
                <div className={`absolute inset-0 transition-all duration-500 ${step === 1 ? 'opacity-100 translate-x-0' : step > 1 ? 'opacity-0 -translate-x-full' : 'opacity-0 translate-x-full'}`}>
                  <div className="p-6 pt-8">
                    <h3 className="text-2xl font-bold text-white mb-6">Friends Voting</h3>
                    <div className="space-y-3">
                      {['Sarah', 'Mike', 'Alex'].map((name, i) => (
                        <div key={name} className="bg-gray-900 rounded-xl p-4 border border-gray-800 flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#FF1493] to-purple-600 flex items-center justify-center text-white font-bold">
                              {name[0]}
                            </div>
                            <span className="text-white font-medium">{name}</span>
                          </div>
                          <Check className="w-6 h-6 text-green-400" />
                        </div>
                      ))}
                    </div>
                    <div className="mt-6 bg-[#FF1493]/10 border border-[#FF1493]/30 rounded-xl p-4 text-center">
                      <p className="text-[#FF1493] font-semibold">3 of 3 voted ✓</p>
                    </div>
                  </div>
                </div>

                {/* Step 3: Confirmed */}
                <div className={`absolute inset-0 transition-all duration-500 ${step === 2 ? 'opacity-100 translate-x-0' : step > 2 ? 'opacity-0 -translate-x-full' : 'opacity-0 translate-x-full'}`}>
                  <div className="p-6 pt-8">
                    <div className="bg-gradient-to-br from-[#FF1493]/20 to-purple-600/20 border-2 border-[#FF1493]/50 rounded-2xl p-6 mb-4">
                      <div className="flex items-center justify-center mb-4">
                        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#FF1493] to-purple-600 flex items-center justify-center">
                          <Check className="w-8 h-8 text-white" />
                        </div>
                      </div>
                      <h3 className="text-2xl font-bold text-white text-center mb-2">Plan Confirmed!</h3>
                      <p className="text-center text-gray-300 mb-4">Weekend Brunch</p>
                      <p className="text-center text-gray-400 text-sm">Saturday @ 11am</p>
                    </div>
                    <div className="space-y-3">
                      <div className="bg-gray-900 rounded-xl p-3 border border-gray-800 text-center">
                        <p className="text-sm text-gray-400">Calendar invites sent ✓</p>
                      </div>
                      <div className="bg-gray-900 rounded-xl p-3 border border-gray-800 text-center">
                        <p className="text-sm text-gray-400">3 people confirmed ✓</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Step 4: Celebration */}
                <div className={`absolute inset-0 transition-all duration-500 ${step === 3 ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-full'}`}>
                  <div className="p-6 pt-8 flex items-center justify-center h-full">
                    <div className="text-center">
                      <Sparkles className="w-20 h-20 text-[#FF1493] mx-auto mb-6 animate-pulse" />
                      <h3 className="text-3xl font-bold text-white mb-4">That was easy!</h3>
                      <p className="text-gray-400 text-lg">
                        From idea to confirmed plan<br />in under 2 minutes
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Step Indicator */}
        <div className="flex items-center justify-center gap-2 mt-8">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className={`h-2 rounded-full transition-all duration-300 ${
                step === i ? 'w-8 bg-[#FF1493]' : 'w-2 bg-gray-700'
              }`}
            />
          ))}
        </div>

        {/* Feature Labels */}
        <div className="flex items-center justify-center gap-8 mt-8 text-sm text-gray-500">
          <span className={step === 0 ? 'text-[#FF1493] font-semibold' : ''}>Create</span>
          <span className={step === 1 ? 'text-[#FF1493] font-semibold' : ''}>Vote</span>
          <span className={step === 2 ? 'text-[#FF1493] font-semibold' : ''}>Confirm</span>
          <span className={step === 3 ? 'text-[#FF1493] font-semibold' : ''}>Done</span>
        </div>
      </div>
    </div>
  )
}
