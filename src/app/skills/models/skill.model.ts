export type SkillLevel = 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | 'EXPERT';

// Computed by backend (GET /skills/{id}/badge)
export type SkillBadge = 'BEGINNER' | 'ADVANCED' | 'EXPERT' | 'CERTIFIED_EXPERT';

export interface Skill {
  id?: number;
  name: string;
  level: SkillLevel;
  yearsOfExperience?: number;
  description?: string;
  badge?: SkillBadge;
}
