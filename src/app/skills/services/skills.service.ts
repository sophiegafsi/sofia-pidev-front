import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, map, throwError } from 'rxjs';
import { Skill } from '../models/skill.model';

@Injectable({ providedIn: 'root' })
export class SkillsService {
  private readonly baseUrl = 'http://localhost:8086/skills';

  constructor(private http: HttpClient) {}

  getAll(): Observable<Skill[]> {
    return this.trySequential<Skill[]>([
      () => this.http.get<unknown>(`${this.baseUrl}/getall`).pipe(map((res) => this.extractSkills(res))),
      () => this.http.get(`${this.baseUrl}/getall`, { responseType: 'text' }).pipe(map((res) => this.extractSkillsFromText(res))),
      () => this.http.get<unknown>(`${this.baseUrl}/all`).pipe(map((res) => this.extractSkills(res))),
      () => this.http.get(`${this.baseUrl}/all`, { responseType: 'text' }).pipe(map((res) => this.extractSkillsFromText(res))),
      () => this.http.get<unknown>(this.baseUrl).pipe(map((res) => this.extractSkills(res))),
      () => this.http.get(this.baseUrl, { responseType: 'text' }).pipe(map((res) => this.extractSkillsFromText(res))),
    ]);
  }

  getById(id: number): Observable<Skill> {
    return this.trySequential<Skill>([
      () => this.http.get<Skill>(`${this.baseUrl}/${id}`),
      () => this.http.get<Skill>(`${this.baseUrl}/get/${id}`),
    ]);
  }

  create(skill: Skill): Observable<Skill> {
    return this.trySequential<Skill>([
      () => this.http.post<Skill>(`${this.baseUrl}/add`, skill),
      () => this.http.post<Skill>(this.baseUrl, skill),
    ]);
  }

  update(skill: Skill): Observable<Skill> {
    const payload: Skill & { proofs: unknown[] } = {
      ...skill,
      proofs: [],
    };
    const requests: Array<() => Observable<Skill>> = [
      () => this.http.put<Skill>(`${this.baseUrl}/update`, payload),
    ];
    if (skill.id) {
      requests.push(() => this.http.put<Skill>(`${this.baseUrl}/${skill.id}`, payload));
    }
    return this.trySequential<Skill>(requests);
  }

  delete(id: number): Observable<void> {
    return this.trySequential<void>([
      () => this.http.delete<void>(`${this.baseUrl}/${id}`),
      () => this.http.delete<void>(`${this.baseUrl}/delete/${id}`),
    ]);
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

  private extractSkills(res: unknown): Skill[] {
    if (Array.isArray(res)) return this.normalizeSkills(res);
    const body = res as Record<string, unknown> | null;
    if (!body) return [];

    const keys = ['data', 'content', 'skills', 'items'];
    for (const key of keys) {
      if (Array.isArray(body[key])) return this.normalizeSkills(body[key] as unknown[]);
    }
    return [];
  }

  private normalizeSkills(rows: unknown[]): Skill[] {
    return rows.map((row) => {
      const s = row as Record<string, unknown>;
      return {
        id: this.asNumber(s['id']),
        name: String(s['name'] ?? ''),
        level: String(s['level'] ?? 'BEGINNER') as Skill['level'],
        yearsOfExperience: this.asNumber(s['yearsOfExperience'] ?? s['years_of_experience']) ?? 0,
        description: String(s['description'] ?? ''),
      };
    });
  }

  private extractSkillsFromText(text: string): Skill[] {
    if (!text) return [];

    // Fallback parser when backend sends recursive/non-parseable JSON (skill->proofs->skill loops).
    const pattern =
      /"id"\s*:\s*(\d+)\s*,\s*"name"\s*:\s*"([^"]*)"\s*,\s*"level"\s*:\s*"([^"]*)"\s*,\s*"yearsOfExperience"\s*:\s*(\d+)\s*,\s*"description"\s*:\s*"([^"]*)"/g;

    const byId = new Map<number, Skill>();
    let m: RegExpExecArray | null;

    while ((m = pattern.exec(text)) !== null) {
      const id = Number(m[1]);
      if (!id) continue;

      byId.set(id, {
        id,
        name: this.unescapeJsonText(m[2]),
        level: (m[3] || 'BEGINNER') as Skill['level'],
        yearsOfExperience: Number(m[4] || 0),
        description: this.unescapeJsonText(m[5]),
      });
    }

    return Array.from(byId.values());
  }

  private unescapeJsonText(value: string): string {
    return value
      .replace(/\\"/g, '"')
      .replace(/\\n/g, '\n')
      .replace(/\\r/g, '\r')
      .replace(/\\t/g, '\t')
      .replace(/\\\\/g, '\\');
  }

  private asNumber(value: unknown): number | undefined {
    if (typeof value === 'number') return value;
    if (typeof value === 'string' && value.trim() !== '' && !Number.isNaN(Number(value))) {
      return Number(value);
    }
    return undefined;
  }
}
