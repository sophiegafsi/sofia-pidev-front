import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { SkillProof } from '../models/skill-proof.model';

@Injectable({ providedIn: 'root' })
export class SkillsProofService {
  private readonly baseUrl = 'http://localhost:8086/proofs';

  constructor(private http: HttpClient) {}

  createForSkill(skillId: number, proof: SkillProof): Observable<SkillProof> {
    return this.http.post<SkillProof>(`${this.baseUrl}/skill/${skillId}`, proof);
  }

  getAll(): Observable<SkillProof[]> {
    return this.http.get<SkillProof[]>(`${this.baseUrl}/getall`);
  }

  getBySkillId(skillId: number): Observable<SkillProof[]> {
    return this.http.get<SkillProof[]>(`${this.baseUrl}/skill/${skillId}`);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }
}
