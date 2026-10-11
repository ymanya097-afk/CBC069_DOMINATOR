import {
  Member,
  Task,
  Availability,
  Preferences,
  TimeSlot,
  DayOfWeek
} from '../types.ts';

export interface AssignmentScoreBreakdown {
  availableInSlot: boolean;
  categoryPreferred: boolean;
  workloadRank: number; // 0 is lightest
  workloadMinutes: number;
  hasCompletedCategoryBefore: boolean;
  urgentAndAvailableNow: boolean;
}

export interface MemberRecommendation {
  memberId: string;
  member: Member;
  humanReason: string;
  isEligible: boolean;
  ineligibilityReason?: string;
  // internal fields not exposed to client
  _score: number;
  _workload: number;
}

export interface EngineResult {
  recommendedMemberId: string | null;
  recommendedMember: Member | null;
  reason: string;
  allCandidates: MemberRecommendation[];
  hint?: string;
}

const DAYS: DayOfWeek[] = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday'
];

export function getTimeSlot(date: Date): TimeSlot {
  const hour = date.getHours();
  if (hour >= 5 && hour < 12) return 'Morning';
  if (hour >= 12 && hour < 17) return 'Afternoon';
  if (hour >= 17 && hour < 22) return 'Evening';
  return 'Night';
}

export function getDayOfWeek(date: Date): DayOfWeek {
  return DAYS[date.getDay()];
}

/**
 * Pure, testable function to rank members and select the best assignment
 */
export function evaluateTaskAssignment(params: {
  task: Task;
  members: Member[];
  availabilities: Record<string, Availability | null>;
  preferences: Record<string, Preferences | null>;
  allTasks: Task[];
  excludeMemberIds?: string[];
  referenceDate?: Date;
}): EngineResult {
  const {
    task,
    members,
    availabilities,
    preferences,
    allTasks,
    excludeMemberIds = [],
    referenceDate = new Date()
  } = params;

  const deadlineDate = new Date(task.deadline);
  const taskDay = getDayOfWeek(deadlineDate);
  const taskSlot = getTimeSlot(deadlineDate);

  const nowDay = getDayOfWeek(referenceDate);
  const nowSlot = getTimeSlot(referenceDate);

  const msToDeadline = deadlineDate.getTime() - referenceDate.getTime();
  const isUrgent = msToDeadline > 0 && msToDeadline <= 48 * 60 * 60 * 1000;

  // Calculate workloads (active effort in minutes)
  const memberWorkloads: Record<string, number> = {};
  for (const m of members) {
    const activeTasks = allTasks.filter(
      t =>
        t.assigned_to_member_id === m.id &&
        (t.status === 'Assigned' || t.status === 'Accepted' || t.status === 'In Progress') &&
        t.id !== task.id
    );
    memberWorkloads[m.id] = activeTasks.reduce((sum, t) => sum + (t.effort || 30), 0);
  }

  // Count past completed tasks in same category
  const completedCounts: Record<string, number> = {};
  for (const m of members) {
    const completed = allTasks.filter(
      t =>
        t.assigned_to_member_id === m.id &&
        t.status === 'Completed' &&
        t.category === task.category
    );
    completedCounts[m.id] = completed.length;
  }

  // Filter eligible members
  const evaluatedCandidates: MemberRecommendation[] = [];

  // Sort members by workload ascending to determine rank
  const sortedByWorkload = [...members].sort(
    (a, b) => (memberWorkloads[a.id] || 0) - (memberWorkloads[b.id] || 0)
  );

  const eligibleMembers = members.filter(m => {
    if (excludeMemberIds.includes(m.id)) return false;
    return true;
  });

  if (eligibleMembers.length === 0) {
    const hint = members.length > 0
      ? 'All other household members are excluded from this assignment. Reschedule or assign manually.'
      : 'Invite or add family members to assign this task.';

    return {
      recommendedMemberId: null,
      recommendedMember: null,
      reason: 'No eligible members available to take this task.',
      allCandidates: members.map(m => ({
        memberId: m.id,
        member: m,
        humanReason: 'Excluded from assignment',
        isEligible: false,
        ineligibilityReason: 'Excluded',
        _score: 0,
        _workload: memberWorkloads[m.id] || 0
      })),
      hint
    };
  }

  // Rank eligible members by workload
  const eligibleWorkloads = eligibleMembers
    .map(m => ({ id: m.id, workload: memberWorkloads[m.id] || 0 }))
    .sort((a, b) => a.workload - b.workload);

  const numEligible = eligibleWorkloads.length;

  for (const member of members) {
    const isExcluded = excludeMemberIds.includes(member.id);

    if (isExcluded) {
      evaluatedCandidates.push({
        memberId: member.id,
        member,
        humanReason: 'Excluded from this reassignment',
        isEligible: false,
        ineligibilityReason: 'Excluded',
        _score: 0,
        _workload: memberWorkloads[member.id] || 0
      });
      continue;
    }

    let score = 0;
    const reasonPhrases: string[] = [];

    // 1. Available for task's time slot and status is Available: +40
    const availRecord = availabilities[member.id];
    const isFreeInSlot =
      availRecord?.slots?.[taskDay]?.[taskSlot] !== false; // Default true if unspecified
    if (isFreeInSlot) {
      score += 40;
      reasonPhrases.push(`Free on ${taskDay} ${taskSlot.toLowerCase()}`);
    } else {
      reasonPhrases.push(`Busy during ${taskDay} ${taskSlot.toLowerCase()}`);
    }

    // 2. Category is in preferences: +20
    const prefRecord = preferences[member.id];
    const hasCategory =
      prefRecord?.categories?.includes(task.category) ?? true;
    if (hasCategory) {
      score += 20;
      reasonPhrases.push(`likes ${task.category.toLowerCase()}`);
    }

    // 3. Lowest current workload (rank-based, lightest gets the full +20): up to +20
    const workRankIndex = eligibleWorkloads.findIndex(e => e.id === member.id);
    const workload = memberWorkloads[member.id] || 0;
    let workloadScore = 0;
    if (numEligible === 1) {
      workloadScore = 20;
    } else {
      const rankProportion = (numEligible - 1 - workRankIndex) / (numEligible - 1);
      workloadScore = Math.round(20 * rankProportion);
    }
    score += workloadScore;

    if (workRankIndex === 0) {
      reasonPhrases.push('lightest workload this week');
    } else if (workloadScore >= 12) {
      reasonPhrases.push('light task load');
    } else {
      reasonPhrases.push('moderate current workload');
    }

    // 4. Has completed similar tasks before: +10
    const pastCompleted = completedCounts[member.id] || 0;
    if (pastCompleted > 0) {
      score += 10;
      reasonPhrases.push(`completed ${pastCompleted} similar task${pastCompleted > 1 ? 's' : ''}`);
    }

    // 5. Task deadline is near (within 48 hours) and member is available now: +10
    const isFreeNow =
      availRecord?.slots?.[nowDay]?.[nowSlot] !== false;
    if (isUrgent && isFreeNow) {
      score += 10;
      reasonPhrases.push('available now for upcoming deadline');
    }

    // Formulate a clean, natural human sentence
    const humanReason = formatHumanSentence(reasonPhrases);

    evaluatedCandidates.push({
      memberId: member.id,
      member,
      humanReason,
      isEligible: true,
      _score: score,
      _workload: workload
    });
  }

  // Filter only eligible candidates and sort by score descending, then lower workload
  const candidatesToRank = evaluatedCandidates.filter(c => c.isEligible);
  candidatesToRank.sort((a, b) => {
    if (b._score !== a._score) {
      return b._score - a._score;
    }
    // Break ties by lower workload
    return a._workload - b._workload;
  });

  const best = candidatesToRank[0] || null;

  return {
    recommendedMemberId: best ? best.memberId : null,
    recommendedMember: best ? best.member : null,
    reason: best ? best.humanReason : 'No eligible members found.',
    allCandidates: evaluatedCandidates,
    hint: best ? undefined : 'Adjust task deadline slot or member availability.'
  };
}

/**
 * Format plain sentences: "Free on Friday evening, likes cleaning, lightest workload this week."
 */
function formatHumanSentence(phrases: string[]): string {
  if (phrases.length === 0) return 'Available member';
  // Capitalize the first letter of the first phrase
  const first = phrases[0].charAt(0).toUpperCase() + phrases[0].slice(1);
  const rest = phrases.slice(1).map(p => p.toLowerCase());
  const combined = [first, ...rest].join(', ');
  return combined.endsWith('.') ? combined : `${combined}.`;
}

/**
 * Handle multiple overlapping tasks (handling Critical/High tasks by earliest deadline first)
 */
export function assignMultipleTasks(params: {
  tasks: Task[];
  members: Member[];
  availabilities: Record<string, Availability | null>;
  preferences: Record<string, Preferences | null>;
  allTasks: Task[];
}): Map<string, EngineResult> {
  const { tasks, members, availabilities, preferences, allTasks } = params;
  const results = new Map<string, EngineResult>();

  // Sort critical and high tasks by earliest deadline first
  const priorityWeight: Record<string, number> = {
    Critical: 4,
    High: 3,
    Medium: 2,
    Low: 1
  };

  const sortedTasks = [...tasks].sort((a, b) => {
    const pDiff = (priorityWeight[b.priority] || 0) - (priorityWeight[a.priority] || 0);
    if (pDiff !== 0) return pDiff;
    return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
  });

  // Track dynamic simulated tasks to avoid stacking all critical tasks on one member
  const currentTaskState = [...allTasks];

  for (const task of sortedTasks) {
    const evalResult = evaluateTaskAssignment({
      task,
      members,
      availabilities,
      preferences,
      allTasks: currentTaskState
    });

    results.set(task.id, evalResult);

    if (evalResult.recommendedMemberId) {
      // Simulate this task being assigned to member so subsequent tasks re-evaluate workload fairly
      currentTaskState.push({
        ...task,
        assigned_to_member_id: evalResult.recommendedMemberId,
        status: 'Assigned'
      });
    }
  }

  return results;
}
