export type SkillLevel = 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | 'EXPERT';

export interface Skill {
  id?: number;
  name: string;
  level: SkillLevel;
  yearsOfExperience?: number;
  description?: string;
}
