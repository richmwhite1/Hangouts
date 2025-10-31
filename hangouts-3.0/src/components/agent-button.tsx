'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Bot } from 'lucide-react'
import { AgentChat } from '@/components/agent-chat'

export function AgentButton() {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <>
      <Button
        onClick={() => setIsOpen(true)}
        variant="default"
        size="default"
        className="gap-2"
      >
        <Bot className="h-4 w-4" />
        AI Assistant
      </Button>
      
      {/* Only render the chat dialog when open */}
      {isOpen && (
        <div className="fixed inset-0 z-50">
          <AgentChat isOpen={isOpen} onClose={() => setIsOpen(false)} />
        </div>
      )}
    </>
  )
}


