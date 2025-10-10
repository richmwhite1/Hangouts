import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export interface ConsensusResult {
  consensusLevel: number
  totalVotes: number
  participantCount: number
  leadingOption: string | null
  timeToConsensus: number | null
  velocity: number
  optionBreakdown: Array<{
    optionId: string
    text: string
    voteCount: number
    percentage: number
    isLeading: boolean
  }>
  isConsensusReached: boolean
  threshold: number
  algorithm: string
  confidence: number
  metadata: {
    calculationTime: number
    lastUpdated: Date
    nextUpdate: Date
  }
}

export interface ConsensusConfig {
  consensusType: 'PERCENTAGE' | 'ABSOLUTE' | 'MAJORITY' | 'SUPERMAJORITY' | 'QUADRATIC' | 'CONDORCET' | 'CUSTOM'
  threshold: number
  minParticipants: number
  timeLimit?: number
  allowTies: boolean
  tieBreaker?: string
  customRules?: Record<string, any>
}

export class ConsensusEngine {
  private cache = new Map<string, { result: ConsensusResult; timestamp: number }>()
  private readonly CACHE_TTL = 30000 // 30 seconds

  /**
   * Calculate consensus for a poll using the specified algorithm
   */
  async calculateConsensus(pollId: string, forceRefresh = false): Promise<ConsensusResult> {
    const startTime = Date.now()

    // Check cache first
    if (!forceRefresh && this.cache.has(pollId)) {
      const cached = this.cache.get(pollId)!
      if (Date.now() - cached.timestamp < this.CACHE_TTL) {
        return cached.result
      }
    }

    try {
      // Fetch poll data
      const poll = await prisma.polls.findUnique({
        where: { id: pollId },
        include: {
          pollOptions: {
            include: { votes: true },
            orderBy: { order: 'asc' }
          },
          participants: true,
          consensusConfig: true,
          consensusHistory: {
            orderBy: { createdAt: 'desc' },
            take: 10
          }
        }
      })

      if (!poll) {
        throw new Error('Poll not found')
      }

      const config: ConsensusConfig = {
        consensusType: poll.consensusConfig?.consensusType || 'MAJORITY',
        threshold: poll.consensusConfig?.threshold || 50,
        minParticipants: poll.consensusConfig?.minParticipants || 1,
        timeLimit: poll.consensusConfig?.timeLimit,
        allowTies: poll.consensusConfig?.allowTies || false,
        tieBreaker: poll.consensusConfig?.tieBreaker,
        customRules: poll.consensusConfig?.customRules
      }

      // Calculate consensus based on algorithm
      let result: ConsensusResult

      switch (config.consensusType) {
        case 'PERCENTAGE':
          result = await this.calculatePercentageConsensus(poll, config)
          break
        case 'ABSOLUTE':
          result = await this.calculateAbsoluteConsensus(poll, config)
          break
        case 'MAJORITY':
          result = await this.calculateMajorityConsensus(poll, config)
          break
        case 'SUPERMAJORITY':
          result = await this.calculateSuperMajorityConsensus(poll, config)
          break
        case 'QUADRATIC':
          result = await this.calculateQuadraticConsensus(poll, config)
          break
        case 'CONDORCET':
          result = await this.calculateCondorcetConsensus(poll, config)
          break
        case 'CUSTOM':
          result = await this.calculateCustomConsensus(poll, config)
          break
        default:
          result = await this.calculateMajorityConsensus(poll, config)
      }

      // Add metadata
      result.metadata = {
        calculationTime: Date.now() - startTime,
        lastUpdated: new Date(),
        nextUpdate: new Date(Date.now() + this.CACHE_TTL)
      }

      // Cache result
      this.cache.set(pollId, { result, timestamp: Date.now() })

      // Save to consensus history
      await this.saveConsensusHistory(pollId, result)

      return result
    } catch (error) {
      console.error('Error calculating consensus:', error)
      throw error
    }
  }

  /**
   * Percentage-based consensus (simple majority by percentage)
   */
  private async calculatePercentageConsensus(poll: any, config: ConsensusConfig): Promise<ConsensusResult> {
    const totalVotes = poll.pollOptions.reduce((sum: number, option: any) => sum + option.votes.length, 0)
    const activeParticipants = poll.participants.filter((p: any) => p.status === 'VOTED').length

    if (totalVotes === 0) {
      return this.createEmptyResult(activeParticipants, config.threshold, 'PERCENTAGE')
    }

    const optionBreakdown = poll.pollOptions.map((option: any) => {
      const voteCount = option.votes.length
      const percentage = (voteCount / totalVotes) * 100
      return {
        optionId: option.id,
        text: option.text,
        voteCount,
        percentage,
        isLeading: false
      }
    })

    // Find leading option
    const leadingOption = optionBreakdown.reduce((max: any, current: any) => 
      current.percentage > max.percentage ? current : max
    )

    // Mark leading option
    optionBreakdown.forEach(option => {
      option.isLeading = option.optionId === leadingOption.optionId
    })

    const consensusLevel = leadingOption.percentage
    const velocity = this.calculateVelocity(poll)
    const timeToConsensus = this.estimateTimeToConsensus(consensusLevel, velocity, config.threshold)

    return {
      consensusLevel,
      totalVotes,
      participantCount: activeParticipants,
      leadingOption: leadingOption.text,
      timeToConsensus,
      velocity,
      optionBreakdown,
      isConsensusReached: consensusLevel >= config.threshold,
      threshold: config.threshold,
      algorithm: 'PERCENTAGE',
      confidence: this.calculateConfidence(consensusLevel, totalVotes, activeParticipants),
      metadata: {} as any // Will be filled by caller
    }
  }

  /**
   * Absolute consensus (based on absolute vote count)
   */
  private async calculateAbsoluteConsensus(poll: any, config: ConsensusConfig): Promise<ConsensusResult> {
    const totalVotes = poll.pollOptions.reduce((sum: number, option: any) => sum + option.votes.length, 0)
    const activeParticipants = poll.participants.filter((p: any) => p.status === 'VOTED').length

    if (totalVotes === 0) {
      return this.createEmptyResult(activeParticipants, config.threshold, 'ABSOLUTE')
    }

    const optionBreakdown = poll.pollOptions.map((option: any) => {
      const voteCount = option.votes.length
      const percentage = (voteCount / totalVotes) * 100
      return {
        optionId: option.id,
        text: option.text,
        voteCount,
        percentage,
        isLeading: false
      }
    })

    const leadingOption = optionBreakdown.reduce((max: any, current: any) => 
      current.voteCount > max.voteCount ? current : max
    )

    optionBreakdown.forEach(option => {
      option.isLeading = option.optionId === leadingOption.optionId
    })

    // For absolute consensus, we compare against the threshold as absolute number
    const consensusLevel = (leadingOption.voteCount / config.threshold) * 100
    const velocity = this.calculateVelocity(poll)
    const timeToConsensus = this.estimateTimeToConsensus(consensusLevel, velocity, 100) // 100% = threshold reached

    return {
      consensusLevel,
      totalVotes,
      participantCount: activeParticipants,
      leadingOption: leadingOption.text,
      timeToConsensus,
      velocity,
      optionBreakdown,
      isConsensusReached: leadingOption.voteCount >= config.threshold,
      threshold: config.threshold,
      algorithm: 'ABSOLUTE',
      confidence: this.calculateConfidence(consensusLevel, totalVotes, activeParticipants),
      metadata: {} as any
    }
  }

  /**
   * Simple majority consensus (50%+ of votes)
   */
  private async calculateMajorityConsensus(poll: any, config: ConsensusConfig): Promise<ConsensusResult> {
    const result = await this.calculatePercentageConsensus(poll, config)
    result.algorithm = 'MAJORITY'
    result.isConsensusReached = result.consensusLevel >= 50 // 50% majority
    return result
  }

  /**
   * Super majority consensus (66%+ of votes)
   */
  private async calculateSuperMajorityConsensus(poll: any, config: ConsensusConfig): Promise<ConsensusResult> {
    const result = await this.calculatePercentageConsensus(poll, config)
    result.algorithm = 'SUPERMAJORITY'
    result.isConsensusReached = result.consensusLevel >= 66 // 66% super majority
    return result
  }

  /**
   * Quadratic voting consensus
   */
  private async calculateQuadraticConsensus(poll: any, config: ConsensusConfig): Promise<ConsensusResult> {
    const totalVotes = poll.pollOptions.reduce((sum: number, option: any) => sum + option.votes.length, 0)
    const activeParticipants = poll.participants.filter((p: any) => p.status === 'VOTED').length

    if (totalVotes === 0) {
      return this.createEmptyResult(activeParticipants, config.threshold, 'QUADRATIC')
    }

    // Calculate quadratic scores (sum of square roots of weights)
    const optionBreakdown = poll.pollOptions.map((option: any) => {
      const quadraticScore = option.votes.reduce((sum: number, vote: any) => 
        sum + Math.sqrt(vote.weight || 1), 0
      )
      const percentage = (quadraticScore / totalVotes) * 100
      return {
        optionId: option.id,
        text: option.text,
        voteCount: option.votes.length,
        percentage,
        isLeading: false
      }
    })

    const leadingOption = optionBreakdown.reduce((max: any, current: any) => 
      current.percentage > max.percentage ? current : max
    )

    optionBreakdown.forEach(option => {
      option.isLeading = option.optionId === leadingOption.optionId
    })

    const consensusLevel = leadingOption.percentage
    const velocity = this.calculateVelocity(poll)
    const timeToConsensus = this.estimateTimeToConsensus(consensusLevel, velocity, config.threshold)

    return {
      consensusLevel,
      totalVotes,
      participantCount: activeParticipants,
      leadingOption: leadingOption.text,
      timeToConsensus,
      velocity,
      optionBreakdown,
      isConsensusReached: consensusLevel >= config.threshold,
      threshold: config.threshold,
      algorithm: 'QUADRATIC',
      confidence: this.calculateConfidence(consensusLevel, totalVotes, activeParticipants),
      metadata: {} as any
    }
  }

  /**
   * Condorcet consensus (pairwise comparison)
   */
  private async calculateCondorcetConsensus(poll: any, config: ConsensusConfig): Promise<ConsensusResult> {
    const totalVotes = poll.pollOptions.reduce((sum: number, option: any) => sum + option.votes.length, 0)
    const activeParticipants = poll.participants.filter((p: any) => p.status === 'VOTED').length

    if (totalVotes === 0) {
      return this.createEmptyResult(activeParticipants, config.threshold, 'CONDORCET')
    }

    // For now, fall back to percentage consensus
    // Full Condorcet implementation would require ranked voting data
    const result = await this.calculatePercentageConsensus(poll, config)
    result.algorithm = 'CONDORCET'
    return result
  }

  /**
   * Custom consensus based on custom rules
   */
  private async calculateCustomConsensus(poll: any, config: ConsensusConfig): Promise<ConsensusResult> {
    // For now, fall back to percentage consensus
    // Custom rules would be implemented based on config.customRules
    const result = await this.calculatePercentageConsensus(poll, config)
    result.algorithm = 'CUSTOM'
    return result
  }

  /**
   * Calculate voting velocity (votes per minute)
   */
  private calculateVelocity(poll: any): number {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000)
    const recentVotes = poll.pollOptions.flatMap((option: any) => 
      option.votes.filter((vote: any) => new Date(vote.createdAt) > oneHourAgo)
    )
    return recentVotes.length / 60 // votes per minute
  }

  /**
   * Estimate time to reach consensus
   */
  private estimateTimeToConsensus(currentConsensus: number, velocity: number, threshold: number): number | null {
    if (velocity === 0 || currentConsensus >= threshold) return null
    
    const remainingConsensus = threshold - currentConsensus
    const estimatedMinutes = remainingConsensus / (velocity * 0.1) // Rough estimation
    
    return Math.max(0, Math.round(estimatedMinutes))
  }

  /**
   * Calculate confidence level (0-1)
   */
  private calculateConfidence(consensusLevel: number, totalVotes: number, participantCount: number): number {
    // Base confidence on consensus level and sample size
    const consensusFactor = Math.min(consensusLevel / 100, 1)
    const sampleFactor = Math.min(totalVotes / Math.max(participantCount, 1), 1)
    
    return (consensusFactor * 0.7 + sampleFactor * 0.3)
  }

  /**
   * Create empty result for polls with no votes
   */
  private createEmptyResult(participantCount: number, threshold: number, algorithm: string): ConsensusResult {
    return {
      consensusLevel: 0,
      totalVotes: 0,
      participantCount,
      leadingOption: null,
      timeToConsensus: null,
      velocity: 0,
      optionBreakdown: [],
      isConsensusReached: false,
      threshold,
      algorithm,
      confidence: 0,
      metadata: {} as any
    }
  }

  /**
   * Save consensus history
   */
  private async saveConsensusHistory(pollId: string, result: ConsensusResult): Promise<void> {
    try {
      await prisma.consensusHistory.create({
        data: {
          pollId,
          consensusLevel: result.consensusLevel,
          totalVotes: result.totalVotes,
          participantCount: result.participantCount,
          leadingOption: result.leadingOption,
          timeToConsensus: result.timeToConsensus,
          velocity: result.velocity
        }
      })
    } catch (error) {
      console.error('Error saving consensus history:', error)
    }
  }

  /**
   * Get consensus trends for a poll
   */
  async getConsensusTrends(pollId: string, hours = 24): Promise<Array<{
    timestamp: Date
    consensusLevel: number
    totalVotes: number
    participantCount: number
    velocity: number
  }>> {
    const since = new Date(Date.now() - hours * 60 * 60 * 1000)
    
    const history = await prisma.consensusHistory.findMany({
      where: {
        pollId,
        createdAt: { gte: since }
      },
      orderBy: { createdAt: 'asc' }
    })

    return history.map(entry => ({
      timestamp: entry.createdAt,
      consensusLevel: entry.consensusLevel,
      totalVotes: entry.totalVotes,
      participantCount: entry.participantCount,
      velocity: entry.velocity || 0
    }))
  }

  /**
   * Clear cache for a poll
   */
  clearCache(pollId: string): void {
    this.cache.delete(pollId)
  }

  /**
   * Clear all cache
   */
  clearAllCache(): void {
    this.cache.clear()
  }
}

export const consensusEngine = new ConsensusEngine()
export default consensusEngine


















