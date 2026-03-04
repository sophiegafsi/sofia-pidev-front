import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, map, throwError } from 'rxjs';
import { SkillProof } from '../models/skill-proof.model';

@Injectable({ providedIn: 'root' })
export class SkillsProofService {
  private readonly baseUrl = 'http://localhost:8086/proofs';
  private readonly apiOrigin = new URL(this.baseUrl).origin;

  constructor(private http: HttpClient) {}

  createForSkill(skillId: number, proof: SkillProof): Observable<SkillProof> {
    return this.http
      .post<unknown>(`${this.baseUrl}/skill/${skillId}`, proof)
      .pipe(map((res) => this.normalizeProof(res as Record<string, unknown>, skillId)));
  }

  uploadForSkill(
    skillId: number,
    title: string,
    type: SkillProof['type'],
    file: File,
    expiresAt?: string
  ): Observable<SkillProof> {
    const fd = new FormData();
    fd.append('title', title);
    fd.append('type', type);
    if (expiresAt) fd.append('expiresAt', expiresAt);
    fd.append('file', file, file.name);

    return this.http
      .post<unknown>(`${this.baseUrl}/skill/${skillId}/upload`, fd)
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

  getById(id: number): Observable<SkillProof> {
    return this.trySequential<SkillProof>([
      () => this.http.get<unknown>(`${this.baseUrl}/${id}`).pipe(map((res) => this.pickFirst(res))),
      () => this.http.get<unknown>(`${this.baseUrl}/get/${id}`).pipe(map((res) => this.pickFirst(res))),
    ]);
  }

  update(proof: SkillProof): Observable<SkillProof> {
    if (!proof.id) {
      return throwError(() => new Error('Missing Proof ID for update().'));
    }

    const payload: Record<string, unknown> = {
      id: proof.id,
      title: proof.title,
      type: proof.type,
      fileUrl: proof.fileUrl,
      file_url: proof.fileUrl,
      url: proof.fileUrl,
    };

    if (proof.expiresAt) {
      payload['expiresAt'] = proof.expiresAt;
      payload['expires_at'] = proof.expiresAt;
      payload['expirationDate'] = proof.expiresAt;
      payload['expiration_date'] = proof.expiresAt;
    } else {
      payload['expiresAt'] = null;
      payload['expires_at'] = null;
      payload['expirationDate'] = null;
      payload['expiration_date'] = null;
    }

    if (proof.skillId) {
      // Different backends map the relation using different JSON shapes/field names.
      payload['skillId'] = proof.skillId;
      payload['skill_id'] = proof.skillId;
      payload['skillsId'] = proof.skillId;
      payload['skills_id'] = proof.skillId;
      payload['skill'] = { id: proof.skillId };
      payload['skills'] = { id: proof.skillId };
    }

    const requests: Array<() => Observable<SkillProof>> = [];

    if (proof.skillId) {
      requests.push(() =>
        this.http
          .put<unknown>(`${this.baseUrl}/skill/${proof.skillId}/${proof.id}`, payload)
          .pipe(map((res) => this.pickFirst(res, proof.skillId)))
      );
      requests.push(() =>
        this.http
          .put<unknown>(`${this.baseUrl}/${proof.id}/skill/${proof.skillId}`, payload)
          .pipe(map((res) => this.pickFirst(res, proof.skillId)))
      );
      requests.push(() =>
        this.http
          .put<unknown>(`${this.baseUrl}/skill/${proof.skillId}`, payload)
          .pipe(map((res) => this.pickFirst(res, proof.skillId)))
      );
    }

    requests.push(
      // Prefer sending the Skill relation to avoid detaching it on the backend.
      () => this.http.put<unknown>(`${this.baseUrl}/update`, payload).pipe(map((res) => this.pickFirst(res, proof.skillId))),
      () => this.http.put<unknown>(`${this.baseUrl}/${proof.id}`, payload).pipe(map((res) => this.pickFirst(res, proof.skillId))),
    );

    return this.trySequential<SkillProof>(requests);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }

  private trySequential<T>(requests: Array<() => Observable<T>>, index = 0): Observable<T> {
    return requests[index]().pipe(
      catchError((err) => {
        if (index < requests.length - 1) {
          return this.trySequential(requests, index + 1);
        }
        return throwError(() => err);
      })
    );
  }

  private pickFirst(res: unknown, forceSkillId?: number): SkillProof {
    const rows = this.extractProofs(res, forceSkillId);
    if (rows.length > 0) return rows[0];

    const body = res as Record<string, unknown> | null;
    if (body) return this.normalizeProof(body, forceSkillId);

    throw new Error('Proof not found.');
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

    const fileUrlRaw = String(raw['fileUrl'] ?? raw['file_url'] ?? raw['url'] ?? '');
    const expiresAtRaw = String(
      raw['expiresAt'] ?? raw['expires_at'] ?? raw['expirationDate'] ?? raw['expiration_date'] ?? ''
    ).trim();
    const expiresAt = this.normalizeIsoDateOnly(expiresAtRaw);

    return {
      id: this.asNumber(raw['id']),
      title: String(raw['title'] ?? raw['name'] ?? ''),
      type: String(raw['type'] ?? 'OTHER').toUpperCase() as SkillProof['type'],
      fileUrl: this.toAbsoluteUrl(fileUrlRaw),
      expiresAt,
      skillId,
      skill: skillId ? { id: skillId, name: skill?.name } : skill ?? null,
    };
  }

  private normalizeIsoDateOnly(value: string): string | undefined {
    const v = (value || '').trim();
    if (!v) return undefined;
    const candidate = v.includes('T') ? v.slice(0, 10) : v;
    return /^\d{4}-\d{2}-\d{2}$/.test(candidate) ? candidate : undefined;
  }

  private toAbsoluteUrl(value: string): string {
    const v = (value || '').trim();
    if (!v) return '';
    if (v.startsWith('http://') || v.startsWith('https://') || v.startsWith('data:')) return v;
    if (v.startsWith('/')) return `${this.apiOrigin}${v}`;
    return v;
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
