import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, map, throwError } from 'rxjs';
import { Skill } from '../models/skill.model';

export interface PageResponse<T> {
  content: T[];
  totalPages: number;
  totalElements?: number;
  size?: number;
  number?: number;
}

@Injectable({ providedIn: 'root' })
export class SkillsService {
  private readonly baseUrl = 'http://localhost:8086/skills';

  constructor(private http: HttpClient) {}

  search(
    q: string,
    page: number,
    size: number,
    sortField: string,
    sortDir: 'asc' | 'desc',
    level?: Skill['level'] | null
  ): Observable<PageResponse<Skill>> {
    const params: Record<string, string> = {
      q: (q ?? '').trim(),
      page: String(Math.max(0, page || 0)),
      size: String(Math.max(1, size || 10)),
      sort: `${sortField || 'id'},${sortDir || 'asc'}`,
    };

    if (level) params['level'] = String(level);

    return this.trySequential<PageResponse<Skill>>([
      () =>
        this.http
          .get<unknown>(`${this.baseUrl}/search`, { params })
          .pipe(map((res) => this.normalizeSkillPage(res))),
      () =>
        this.http
          .get<unknown>(this.baseUrl, { params })
          .pipe(map((res) => this.normalizeSkillPage(res))),
    ]);
  }

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

  getScoreboard(size: number = 10) {
  return this.http.get<any[]>(
    `${this.baseUrl}/scoreboard?size=${size}`
  );
}

  getById(id: number): Observable<Skill> {
    return this.trySequential<Skill>([
      () => this.http.get<Skill>(`${this.baseUrl}/${id}`),
      () => this.http.get<Skill>(`${this.baseUrl}/get/${id}`),
    ]);
  }

  getBadge(id: number): Observable<Skill['badge']> {
    return this.trySequential<Skill['badge']>([
      () =>
        this.http
          .get(`${this.baseUrl}/${id}/badge`, { responseType: 'text' })
          .pipe(map((res) => this.normalizeBadge(res))),
      () =>
        this.http
          .get<unknown>(`${this.baseUrl}/${id}/badge`)
          .pipe(map((res) => this.normalizeBadge(res))),
    ]);
  }

  create(skill: Skill): Observable<Skill> {
    return this.trySequential<Skill>([
      () => this.http.post<Skill>(`${this.baseUrl}/add`, skill),
      // When backend returns text/plain errors, Angular throws a JSON parse error; this fallback preserves the raw text.
      () =>
        this.http
          .post(`${this.baseUrl}/add`, skill, { responseType: 'text' })
          .pipe(map((text) => this.parseSkillFromText(text))),
      () => this.http.post<Skill>(this.baseUrl, skill),
      () =>
        this.http
          .post(this.baseUrl, skill, { responseType: 'text' })
          .pipe(map((text) => this.parseSkillFromText(text))),
    ]);
  }

  update(skill: Skill): Observable<Skill> {
    const payload: Skill & { proofs: unknown[] } = {
      ...skill,
      proofs: [],
    };
    const requests: Array<() => Observable<Skill>> = [
      () => this.http.put<Skill>(`${this.baseUrl}/update`, payload),
      () =>
        this.http
          .put(`${this.baseUrl}/update`, payload, { responseType: 'text' })
          .pipe(map((text) => this.parseSkillFromText(text))),
    ];
    if (skill.id) {
      requests.push(() => this.http.put<Skill>(`${this.baseUrl}/${skill.id}`, payload));
      requests.push(() =>
        this.http
          .put(`${this.baseUrl}/${skill.id}`, payload, { responseType: 'text' })
          .pipe(map((text) => this.parseSkillFromText(text)))
      );
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

  private normalizeSkillPage(res: unknown): PageResponse<Skill> {
    if (Array.isArray(res)) {
      return { content: this.normalizeSkills(res), totalPages: 1 };
    }

    const body = res as Record<string, unknown> | null;
    if (!body) return { content: [], totalPages: 0 };

    const contentRaw = body['content'];
    const content = Array.isArray(contentRaw) ? this.normalizeSkills(contentRaw) : this.extractSkills(res);

    const totalPages = this.asNumber(body['totalPages']) ?? 1;
    const totalElements = this.asNumber(body['totalElements']);
    const number = this.asNumber(body['number']);
    const size = this.asNumber(body['size']);

    return { content, totalPages, totalElements, number, size };
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
        badge: this.normalizeBadge(s['badge']),
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

  private parseSkillFromText(text: string): Skill {
    if (!text) throw new Error('Empty response from server.');

    try {
      const parsed = JSON.parse(text) as unknown;
      const row = parsed as Record<string, unknown>;
      return {
        id: this.asNumber(row['id']),
        name: String(row['name'] ?? ''),
        level: String(row['level'] ?? 'BEGINNER') as Skill['level'],
        yearsOfExperience: this.asNumber(row['yearsOfExperience'] ?? row['years_of_experience']) ?? 0,
        description: String(row['description'] ?? ''),
        badge: this.normalizeBadge(row['badge']),
      };
    } catch {
      // If backend returns a non-JSON body (e.g., stacktrace or plain text error), keep it actionable.
      throw new Error(text);
    }
  }

  downloadSkillPdf(id: number): Observable<Blob> {
    return this.http.get(`${this.baseUrl}/${id}/pdf`, {
      responseType: 'blob',
      headers: { Accept: 'application/pdf' },
    });
  }
  private normalizeBadge(value: unknown): Skill['badge'] {
    if (value === null || value === undefined) return undefined;

    let raw = String(value).trim();
    if (!raw) return undefined;

    // Handles both text/plain and application/json (quoted string).
    if ((raw.startsWith('"') && raw.endsWith('"')) || (raw.startsWith("'") && raw.endsWith("'"))) {
      try {
        raw = String(JSON.parse(raw));
      } catch {
        raw = raw.slice(1, -1);
      }
      raw = raw.trim();
    }

    const allowed = new Set(['BEGINNER', 'ADVANCED', 'EXPERT', 'CERTIFIED_EXPERT']);
    return allowed.has(raw) ? (raw as Skill['badge']) : undefined;
  }
}
