/**
 * Study plan generator ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â see product spec "AI STUDY PLANNER".
 *
 * Deliberately a deterministic algorithm, not a raw AI text generation:
 * dates and durations are things a plan must get *right*, not something
 * worth risking on model hallucination. The AI's role (see
 * `buildPlanRationale` below) is limited to explaining the plan in plain
 * language ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â never to inventing the schedule itself.
 *
 * Priority rule: lower mastery + higher recent mistake count = higher
 * priority (studied sooner, more often). A brand-new topic (no mastery
 * record yet) is treated as low-mastery so it isn't neglected.
 */

export type SessionKind = "learn" | "practice" | "revision";

export interface TopicInput {
  id: string;
  name: string;
  masteryScore: number | null; // 0-100, null = not yet attempted
  unresolvedMistakes: number;
}

export interface PlanGenerationInput {
  topics: TopicInput[];
  dailyStudyMinutes: number;
  startDate: Date;
  targetDate: Date;
}

export interface PlannedSession {
  dayOffset: number; // days from startDate
  topicId: string;
  topicName: string;
  kind: SessionKind;
  durationMin: number;
}

const MIN_SESSION_MIN = 10;
const REVISION_EVERY_N_DAYS = 4;

function priorityScore(t: TopicInput): number {
  const masteryGap = 100 - (t.masteryScore ?? 20); // unattempted treated as weak (score 20)
  return masteryGap + t.unresolvedMistakes * 8;
}

export function generateStudyPlan(input: PlanGenerationInput): PlannedSession[] {
  const { topics, dailyStudyMinutes, startDate, targetDate } = input;
  if (topics.length === 0 || dailyStudyMinutes <= 0) return [];

  const totalDays = Math.max(
    1,
    Math.round((targetDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)),
  );

  // Weighted round-robin: higher-priority topics appear more often across
  // the available days, rather than doing all of one topic then the next.
  const ranked = [...topics].sort((a, b) => priorityScore(b) - priorityScore(a));
  const totalPriority = ranked.reduce((sum, t) => sum + priorityScore(t), 0) || 1;

  const sessions: PlannedSession[] = [];

  for (let day = 0; day < totalDays; day++) {
    const isRevisionDay = day > 0 && day % REVISION_EVERY_N_DAYS === 0;
    let remainingMinutes = dailyStudyMinutes;

    if (isRevisionDay) {
      const weakest = ranked[0];
      if (!weakest) {
        continue;
      }

      sessions.push({
        dayOffset: day,
        topicId: weakest.id,
        topicName: weakest.name,
        kind: "revision",
        durationMin: Math.min(remainingMinutes, Math.max(MIN_SESSION_MIN, Math.round(dailyStudyMinutes * 0.4))),
      });
      remainingMinutes -= sessions[sessions.length - 1]?.durationMin ?? 0;
    }

    // Allocate the rest of the day proportionally to topic priority,
    // cycling so no single topic monopolizes every day.
    let cursor = 0;
    while (remainingMinutes >= MIN_SESSION_MIN && ranked.length > 0) {
      const topic = ranked[(day + cursor) % ranked.length];
      if (!topic) {
        break;
      }

      const share = Math.max(
        MIN_SESSION_MIN,
        Math.round((priorityScore(topic) / totalPriority) * dailyStudyMinutes),
      );
      const durationMin = Math.min(share, remainingMinutes);
      const kind: SessionKind = topic.masteryScore == null || topic.masteryScore < 40 ? "learn" : "practice";

      sessions.push({ dayOffset: day, topicId: topic.id, topicName: topic.name, kind, durationMin });
      remainingMinutes -= durationMin;
      cursor++;

      if (cursor > ranked.length * 2) break; // safety valve against pathological inputs
    }
  }

  return sessions;
}

/**
 * Rebalancing ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â "don't simply push missed work forward forever."
 *
 * Missed sessions' total minutes are redistributed across the *remaining*
 * days up to the target date, weighted the same way as generation (priority-
 * proportional), capped so no single day gets overloaded. If there isn't
 * enough remaining runway to absorb all missed work, the lowest-priority
 * missed sessions are dropped rather than crushing every remaining day ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â
 * the plan stays usable instead of becoming an ever-growing backlog.
 */
export interface RebalanceInput {
  missedTopics: TopicInput[]; // topics whose sessions were missed, with minutes owed
  missedMinutesByTopic: Record<string, number>;
  remainingDays: number;
  dailyStudyMinutes: number;
  maxExtraMinutesPerDay: number; // e.g. 15-20% over the normal daily budget
}

export function rebalanceMissedWork(input: RebalanceInput): PlannedSession[] {
  const { missedTopics, missedMinutesByTopic, remainingDays, maxExtraMinutesPerDay } = input;
  if (remainingDays <= 0 || missedTopics.length === 0) return [];

  const totalCapacity = remainingDays * maxExtraMinutesPerDay;

  // Greedy allocation by priority: the highest-priority missed topic gets
  // as much of its owed time as capacity allows first, then the next, and
  // so on ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â so when capacity is insufficient, weaker topics are protected
  // and the lowest-priority missed work is what gets dropped, not an equal
  // percentage skimmed off everything uniformly.
  const ranked = [...missedTopics].sort((a, b) => priorityScore(b) - priorityScore(a));

  const sessions: PlannedSession[] = [];
  let capacityLeft = totalCapacity;
  let dayCursor = 0;

  for (const topic of ranked) {
    if (capacityLeft < MIN_SESSION_MIN) break;
    const owed = missedMinutesByTopic[topic.id] ?? 0;
    const allocated = Math.min(owed, capacityLeft);
    if (allocated < MIN_SESSION_MIN) continue;

    capacityLeft -= allocated;

    // Spread this topic's make-up minutes across a few of the soonest days
    // rather than dumping it all on day 0.
    const chunks = Math.max(1, Math.ceil(allocated / maxExtraMinutesPerDay));
    const perChunk = Math.round(allocated / chunks);
    for (let c = 0; c < chunks && dayCursor < remainingDays; c++) {
      sessions.push({
        dayOffset: dayCursor % remainingDays,
        topicId: topic.id,
        topicName: topic.name,
        kind: "revision",
        durationMin: perChunk,
      });
      dayCursor++;
    }
  }

  return sessions;
}
