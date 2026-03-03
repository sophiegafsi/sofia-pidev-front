export type ProofType = 'CERTIFICATE' | 'BADGE' | 'DIPLOMA' | 'OTHER';

export const PROOF_TYPE_OPTIONS: ProofType[] = [
  'CERTIFICATE',
  'BADGE',
  'DIPLOMA',
  'OTHER',
];

export interface SkillProof {
  id?: number;
  title: string;
  type: ProofType;
  fileUrl: string;
  /**
   * Expiration date (ISO date-only format: YYYY-MM-DD).
   */
  expiresAt?: string;
  skillId?: number;
  skill?: { id?: number; name?: string } | null;
}
