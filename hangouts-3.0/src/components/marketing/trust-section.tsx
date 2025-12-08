'use client'

import { Shield, Lock, Eye, Trash2, CheckCircle } from 'lucide-react'
import { Card } from '@/components/ui/card'

export function TrustSection() {
  const trustPoints = [
    {
      icon: Lock,
      title: 'Your privacy is protected',
      description: 'Phone numbers never shared. End-to-end encrypted messaging.',
      color: '#FF1493'
    },
    {
      icon: Eye,
      title: 'You control your data',
      description: 'Choose what to share. Delete your account anytime, instantly.',
      color: '#8B5CF6'
    },
    {
      icon: Shield,
      title: 'Secure by default',
      description: 'Enterprise-grade security. GDPR compliant. SOC 2 standards.',
      color: '#10B981'
    },
    {
      icon: CheckCircle,
      title: 'No spam, ever',
      description: 'We hate spam too. Only notifications you want, when you want them.',
      color: '#F59E0B'
    }
  ]

  return (
    <div className="py-24 bg-black">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 bg-gradient-to-r from-[#FF1493]/10 to-purple-600/10 border border-[#FF1493]/30 rounded-full px-6 py-2 mb-6">
            <Shield className="w-5 h-5 text-[#FF1493]" />
            <span className="text-[#FF1493] font-semibold">Your Privacy Matters</span>
          </div>
          <h2 className="text-4xl md:text-5xl font-bold mb-4 text-white" style={{ fontFamily: 'var(--font-oswald)' }}>
            Built for Trust
          </h2>
          <p className="text-xl text-gray-400 max-w-3xl mx-auto">
            We take your privacy seriously. Your data is yours, and yours alone.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6 max-w-5xl mx-auto">
          {trustPoints.map((point, index) => {
            const Icon = point.icon
            return (
              <Card
                key={index}
                className="bg-gradient-to-br from-gray-900 to-black border border-gray-800 hover:border-gray-700 transition-all duration-300 p-8 group hover:scale-[1.02]"
              >
                <div className="flex items-start gap-4">
                  <div
                    className="flex-shrink-0 w-14 h-14 rounded-xl flex items-center justify-center border transition-all group-hover:scale-110"
                    style={{
                      backgroundColor: `${point.color}15`,
                      borderColor: `${point.color}30`
                    }}
                  >
                    <Icon className="w-7 h-7" style={{ color: point.color }} />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white mb-2">{point.title}</h3>
                    <p className="text-gray-400 leading-relaxed">{point.description}</p>
                  </div>
                </div>
              </Card>
            )
          })}
        </div>

        {/* Trust Badges */}
        <div className="mt-16 pt-12 border-t border-gray-900">
          <div className="flex flex-wrap items-center justify-center gap-12 opacity-60">
            <div className="text-center">
              <Shield className="w-8 h-8 text-gray-500 mx-auto mb-2" />
              <p className="text-xs text-gray-600 font-medium">GDPR<br />Compliant</p>
            </div>
            <div className="text-center">
              <Lock className="w-8 h-8 text-gray-500 mx-auto mb-2" />
              <p className="text-xs text-gray-600 font-medium">256-bit<br />Encryption</p>
            </div>
            <div className="text-center">
              <Eye className="w-8 h-8 text-gray-500 mx-auto mb-2" />
              <p className="text-xs text-gray-600 font-medium">Privacy<br />First</p>
            </div>
            <div className="text-center">
              <Trash2 className="w-8 h-8 text-gray-500 mx-auto mb-2" />
              <p className="text-xs text-gray-600 font-medium">Delete<br />Anytime</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
