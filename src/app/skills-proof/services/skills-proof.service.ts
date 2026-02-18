import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, map } from 'rxjs';
import { SkillProof } from '../models/skill-proof.model';

@Injectable({ providedIn: 'root' })
export class SkillsProofService {
  private readonly baseUrl = 'http://localhost:8086/proofs';

  constructor(private http: HttpClient) {}

  createForSkill(skillId: number, proof: SkillProof): Observable<SkillProof> {
    return this.http
      .post<unknown>(`${this.baseUrl}/skill/${skillId}`, proof)
      .pipe(map((res) => this.normalizeProof(res as Record<string, unknown>, skillId)));
  }

  getAll(): Observable<SkillProof[]> {
    return this.http
      .get<unknown>(`${this.baseUrl}/getall`)
      .pipe(map((res) => this.extractProofs(res)));
  }

  getBySkillId(skillId: number): Observable<SkillProof[]> {
    return this.http
      .get<unknown>(`${this.baseUrl}/skill/${skillId}`)
      .pipe(
        map((res) => this.extractProofs(res, skillId)),
        catchError(() =>
          this.getAll().pipe(
            map((proofs) => proofs.filter((p) => this.getRelatedSkillId(p) === skillId))
          )
        )
      );
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }

  private extractProofs(res: unknown, forceSkillId?: number): SkillProof[] {
    if (Array.isArray(res)) {
      return res.map((p) => this.normalizeProof(p as Record<string, unknown>, forceSkillId));
    }

    const body = res as Record<string, unknown> | null;
    if (!body) return [];

    const keys = ['data', 'content', 'proofs', 'skillProofs'];
    for (const key of keys) {
      const value = body[key];
      if (Array.isArray(value)) {
        return value.map((p) => this.normalizeProof(p as Record<string, unknown>, forceSkillId));
      }
    }

    if (typeof body === 'object' && body['id']) {
      return [this.normalizeProof(body, forceSkillId)];
    }

    return [];
  }

  private normalizeProof(raw: Record<string, unknown>, forceSkillId?: number): SkillProof {
    const skill = raw['skill'] as { id?: number; name?: string } | undefined;
    const skillId =
      forceSkillId ??
      this.asNumber(raw['skillId']) ??
      this.asNumber(raw['skill_id']) ??
      this.asNumber(raw['skillsId']) ??
      skill?.id;

    return {
      id: this.asNumber(raw['id']),
      title: String(raw['title'] ?? raw['name'] ?? ''),
      type: String(raw['type'] ?? 'OTHER').toUpperCase() as SkillProof['type'],
      fileUrl: String(raw['fileUrl'] ?? raw['file_url'] ?? raw['url'] ?? ''),
      skillId,
      skill: skillId ? { id: skillId, name: skill?.name } : skill ?? null,
    };
  }

  private getRelatedSkillId(proof: SkillProof): number | undefined {
    return proof.skillId ?? proof.skill?.id;
  }

  private asNumber(value: unknown): number | undefined {
    if (typeof value === 'number') return value;
    if (typeof value === 'string' && value.trim() !== '' && !Number.isNaN(Number(value))) {
      return Number(value);
    }
    return undefined;
  }
}
