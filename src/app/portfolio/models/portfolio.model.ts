export interface Achievement {
  id?: number;
  title: string;
  description: string;
  completionDate: string;
  freelancerId: number;
}

export interface AchievementSkill {
  id?: number;
  skillId: number;
  contributionLevel: string;
  usageDescription: string;
  achievement?: Achievement | { id?: number } | null;
}

export interface AchievementMetric {
  id?: number;
  complexityScore: number;
  impactScore: number;
  durationDays: number;
  achievement?: Achievement | { id?: number } | null;
}

export interface AchievementMetricSuggestion {
  complexityScore: number;
  impactScore: number;
  linkedSkillsCount: number;
  highContributionCount: number;
  mediumContributionCount: number;
  lowContributionCount: number;
}

export interface AchievementDescriptionResult {
  achievementId: number;
  title: string;
  generatedDescription: string;
}

export interface TextToolResult {
  originalText: string;
  transformedText: string;
  operation: string;
  targetLanguage: string;
  changed: boolean;
}

export interface SpringAiReviewResult {
  title: string;
  description: string;
  feedback: string;
  provider: string;
  model: string;
  fallbackUsed: boolean;
  available: boolean;
}

export interface SkillCredibility {
  skillId: number;
  skillName: string;
  occurrences: number;
  averageContributionWeight: number;
  averageComplexityScore: number;
  averageImpactScore: number;
  projectQualityScore: number;
  credibilityScore: number;
}

export interface SkillRanking {
  rank: number;
  skillId: number;
  skillName: string;
  occurrences: number;
  credibilityScore: number;
  frequencyScore: number;
  rankingScore: number;
}

export interface ProfileStrength {
  freelancerId: number;
  achievementsCount: number;
  distinctSkillsCount: number;
  averageContributionWeight: number;
  averageProjectQuality: number;
  achievementsComponent: number;
  diversityComponent: number;
  contributionComponent: number;
  qualityComponent: number;
  overallScore: number;
  profileLevel: string;
}

export interface ContributionDistribution {
  level: string;
  count: number;
  percentage: number;
}

export interface AchievementTimeline {
  period: string;
  achievementsCount: number;
  averageQualityScore: number;
}

export interface AchievementInsight {
  achievementId: number;
  title: string;
  linkedSkillsCount: number;
  qualityScore: number;
}

export interface ProfileStatistics {
  freelancerId: number;
  achievementsCount: number;
  distinctSkillsCount: number;
  averageComplexityScore: number;
  averageImpactScore: number;
  averageDurationDays: number;
  topRankedSkill?: SkillRanking | null;
  mostCredibleSkill?: SkillCredibility | null;
  strongestAchievement?: AchievementInsight | null;
  contributionDistribution: ContributionDistribution[];
  timeline: AchievementTimeline[];
}
