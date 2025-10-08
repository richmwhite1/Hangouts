/**
 * Hangout Flow Logic - Two-Stage System
 * Handles the transition from polling to confirmed plan
 */

export const HANGOUT_STATES = {
  POLLING: 'polling',      // Multiple options, voting active
  CONFIRMED: 'confirmed',  // Single option or poll winner decided
  COMPLETED: 'completed'   // Event finished
} as const;

export type HangoutState = typeof HANGOUT_STATES[keyof typeof HANGOUT_STATES];

export interface HangoutFlowData {
  type: 'quick_plan' | 'multi_option';
  options: Array<{
    id: string;
    title: string;
    description?: string;
    location?: string;
    dateTime?: string;
    price?: number;
    hangoutUrl?: string;
  }>;
  participants: string[];
}

export interface HangoutFlowResult {
  state: HangoutState;
  finalizedOption?: any;
  requiresVoting: boolean;
  requiresRSVP: boolean;
  votes?: Record<string, string>;
  votingDeadline?: Date;
}

/**
 * Determine the hangout flow based on user selections
 */
export const determineHangoutFlow = (userSelections: HangoutFlowData): 'SKIP_TO_RSVP' | 'START_POLLING' => {
  // If user selects "Quick Plan" OR only creates 1 option
  if (userSelections.type === 'quick_plan' || userSelections.options.length === 1) {
    return 'SKIP_TO_RSVP';  // Go directly to Stage 2
  } else {
    return 'START_POLLING'; // Go to Stage 1
  }
};

/**
 * Create hangout with appropriate flow
 */
export const createHangoutFlow = async (hangoutData: any): Promise<HangoutFlowResult> => {
  const flow = determineHangoutFlow(hangoutData);
  
  if (flow === 'SKIP_TO_RSVP') {
    // Single option - skip polling, go straight to RSVP
    return {
      state: HANGOUT_STATES.CONFIRMED,
      finalizedOption: hangoutData.options[0],
      requiresVoting: false,
      requiresRSVP: true
    };
  } else {
    // Multiple options - start with polling
    return {
      state: HANGOUT_STATES.POLLING,
      finalizedOption: null,
      requiresVoting: true,
      requiresRSVP: false,
      votes: {},
      votingDeadline: new Date(Date.now() + 48 * 60 * 60 * 1000) // 48 hours
    };
  }
};

/**
 * Check if voting should be finalized
 */
export const checkAndFinalizeIfReady = (hangout: any): boolean => {
  const userVotes = hangout.userVotes || {};
  const participants = hangout.participants || [];
  
  // For now, let's use a simple approach: require at least 2 votes or deadline passed
  // This can be made more sophisticated later
  const votedCount = Object.keys(userVotes).filter(userId => userVotes[userId] && userVotes[userId].length > 0).length;
  const deadlinePassed = hangout.votingDeadline ? new Date() > new Date(hangout.votingDeadline) : false;
  
  // For testing purposes, let's require at least 1 vote before finalizing
  // In production, this should be configurable based on hangout settings
  const minVotesRequired = Math.max(1, Math.ceil(participants.length * 0.5)); // At least 50% of participants
  
  return votedCount >= minVotesRequired || deadlinePassed;
};

/**
 * Calculate the winning option from votes
 */
export const calculateWinner = (hangout: any): any => {
  const votes = hangout.votes || {};
  const optionVotes: Record<string, number> = {};
  
  Object.values(votes).forEach((optionId: string) => {
    optionVotes[optionId] = (optionVotes[optionId] || 0) + 1;
  });
  
  const winnerId = Object.keys(optionVotes).reduce((a, b) => 
    optionVotes[a] > optionVotes[b] ? a : b
  );
  
  return hangout.options.find((opt: any) => opt.id === winnerId);
};

/**
 * Check if mandatory participants have RSVPed for hangout to proceed
 */
export const checkMandatoryRSVP = (hangout: any): { canProceed: boolean; waitingFor: string[] } => {
  const participants = hangout.participants || [];
  const mandatoryParticipants = participants.filter((p: any) => p.isMandatory);
  
  if (mandatoryParticipants.length === 0) {
    return { canProceed: true, waitingFor: [] };
  }
  
  const waitingFor = mandatoryParticipants
    .filter((p: any) => p.rsvpStatus !== 'YES')
    .map((p: any) => p.user.name);
  
  return {
    canProceed: waitingFor.length === 0,
    waitingFor
  };
};

/**
 * Get vote count for a specific option
 */
export const getVoteCount = (votes: Record<string, string>, optionId: string): number => {
  return Object.values(votes || {}).filter(vote => vote === optionId).length;
};

/**
 * Check if user has voted for a specific option
 */
export const hasUserVotedFor = (votes: Record<string, string>, userId: string, optionId: string): boolean => {
  return votes[userId] === optionId;
};

/**
 * Categorize attendance for display
 */
export const categorizeAttendance = (rsvps: Record<string, string>, participants: any[]) => {
  const going: string[] = [];
  const maybe: string[] = [];
  const notGoing: string[] = [];
  const waiting: string[] = [];
  
  participants.forEach(participant => {
    const rsvp = rsvps[participant.userId];
    const name = participant.user?.name || participant.user?.username || 'Unknown';
    
    switch (rsvp) {
      case 'YES':
        going.push(name);
        break;
      case 'MAYBE':
        maybe.push(name);
        break;
      case 'NO':
        notGoing.push(name);
        break;
      default:
        waiting.push(name);
    }
  });
  
  return {
    going,
    maybe,
    notGoing,
    waiting,
    responded: going.length + maybe.length + notGoing.length
  };
};
