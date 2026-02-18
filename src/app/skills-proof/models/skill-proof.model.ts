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
  type: ProofType;      // ✅ backend attend "type"
  fileUrl: string;      // ✅ backend attend "fileUrl"
  skillId?: number;     // utile côté front (facultatif)
}
