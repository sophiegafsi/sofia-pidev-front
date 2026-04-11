import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, map, throwError } from 'rxjs';
import {
  Achievement,
  AchievementInsight,
  AchievementMetric,
  AchievementSkill,
  AchievementTimeline,
  ContributionDistribution,
  ProfileStatistics,
  ProfileStrength,
  SkillCredibility,
  SkillRanking,
} from '../models/portfolio.model';

@Injectable({ providedIn: 'root' })
export class PortfolioService {
  private readonly baseUrl = '/api/portfolio';

  constructor(private http: HttpClient) {}

  createAchievement(achievement: Achievement): Observable<Achievement> {
    return this.http
      .post(`${this.baseUrl}/achievements`, achievement, { responseType: 'text' })
      .pipe(map((res) => this.pickAchievement(res, achievement)));
  }

  getAchievements(): Observable<Achievement[]> {
    return this.trySequential<Achievement[]>([
      () =>
        this.http
          .get<unknown>(`${this.baseUrl}/achievements`)
          .pipe(map((res) => this.extractList(res).map((row) => this.normalizeAchievement(row)))),
      () =>
        this.http
          .get(`${this.baseUrl}/achievements`, { responseType: 'text' })
          .pipe(map((res) => this.extractList(this.parseTextResponse(res)).map((row) => this.normalizeAchievement(row)))),
    ]);
  }

  getAchievementById(id: number): Observable<Achievement> {
    return this.trySequential<Achievement>([
      () =>
        this.http
          .get<unknown>(`${this.baseUrl}/achievements/${id}`)
          .pipe(map((res) => this.normalizeAchievement(res as Record<string, unknown>))),
      () =>
        this.http
          .get(`${this.baseUrl}/achievements/${id}`, { responseType: 'text' })
          .pipe(map((res) => this.normalizeAchievement(this.parseTextResponse(res) as Record<string, unknown>))),
    ]);
  }

  deleteAchievement(id: number): Observable<void> {
    return this.http.delete(`${this.baseUrl}/achievements/${id}`, { responseType: 'text' }).pipe(map(() => undefined));
  }

  addAchievementSkill(achievementId: number, skill: AchievementSkill): Observable<AchievementSkill> {
    const payloads = this.buildAchievementSkillPayloads(achievementId, skill);
    return this.http
      .post(`${this.baseUrl}/achievement-skills/achievement/${achievementId}`, payloads[0], { responseType: 'text' })
      .pipe(map((res) => this.pickAchievementSkill(res, payloads[0], achievementId)));
  }

  getAchievementSkills(achievementId: number): Observable<AchievementSkill[]> {
    return this.trySequential<AchievementSkill[]>([
      () =>
        this.http
          .get<unknown>(`${this.baseUrl}/achievement-skills/achievement/${achievementId}`)
          .pipe(map((res) => this.extractList(res).map((row) => this.normalizeAchievementSkill(row, achievementId)))),
      () =>
        this.http
          .get(`${this.baseUrl}/achievement-skills/achievement/${achievementId}`, { responseType: 'text' })
          .pipe(map((res) => this.extractList(this.parseTextResponse(res)).map((row) => this.normalizeAchievementSkill(row, achievementId)))),
    ]);
  }

  deleteAchievementSkill(id: number): Observable<void> {
    return this.http.delete(`${this.baseUrl}/achievement-skills/${id}`, { responseType: 'text' }).pipe(map(() => undefined));
  }

  addAchievementMetric(achievementId: number, metric: AchievementMetric): Observable<AchievementMetric> {
    const payload = {
      ...metric,
      achievement: { id: achievementId },
    };

    return this.http
      .post(`${this.baseUrl}/achievement-metrics/achievement/${achievementId}`, payload, { responseType: 'text' })
      .pipe(map((res) => this.pickAchievementMetric(res, payload, achievementId)));
  }

  getAchievementMetrics(achievementId: number): Observable<AchievementMetric[]> {
    return this.trySequential<AchievementMetric[]>([
      () =>
        this.http
          .get<unknown>(`${this.baseUrl}/achievement-metrics/achievement/${achievementId}`)
          .pipe(map((res) => this.extractList(res).map((row) => this.normalizeAchievementMetric(row, achievementId)))),
      () =>
        this.http
          .get(`${this.baseUrl}/achievement-metrics/achievement/${achievementId}`, { responseType: 'text' })
          .pipe(map((res) => this.extractList(this.parseTextResponse(res)).map((row) => this.normalizeAchievementMetric(row, achievementId)))),
    ]);
  }

  deleteAchievementMetric(id: number): Observable<void> {
    return this.http.delete(`${this.baseUrl}/achievement-metrics/${id}`, { responseType: 'text' }).pipe(map(() => undefined));
  }

  getSkillCredibility(freelancerId: number, limit = 10): Observable<SkillCredibility[]> {
    return this.http
      .get<unknown>(`${this.baseUrl}/skills/credibility`, {
        params: {
          freelancerId: String(freelancerId),
          limit: String(limit),
        },
      })
      .pipe(map((res) => this.extractList(res).map((row) => this.normalizeSkillCredibility(row))));
  }

  getSkillRanking(freelancerId: number, limit = 10): Observable<SkillRanking[]> {
    return this.http
      .get<unknown>(`${this.baseUrl}/skills/ranking`, {
        params: {
          freelancerId: String(freelancerId),
          limit: String(limit),
        },
      })
      .pipe(map((res) => this.extractList(res).map((row) => this.normalizeSkillRanking(row))));
  }

  getProfileStrength(freelancerId: number): Observable<ProfileStrength> {
    return this.http
      .get<unknown>(`${this.baseUrl}/profile/score`, {
        params: { freelancerId: String(freelancerId) },
      })
      .pipe(map((res) => this.normalizeProfileStrength(res as Record<string, unknown>)));
  }

  getProfileStatistics(freelancerId: number): Observable<ProfileStatistics> {
    return this.http
      .get<unknown>(`${this.baseUrl}/profile/statistics`, {
        params: { freelancerId: String(freelancerId) },
      })
      .pipe(map((res) => this.normalizeProfileStatistics(res as Record<string, unknown>)));
  }

  downloadAnalyticsPdf(freelancerId: number): Observable<Blob> {
    return this.http.get(`${this.baseUrl}/profile/report/pdf`, {
      params: { freelancerId: String(freelancerId) },
      responseType: 'blob',
      headers: { Accept: 'application/pdf' },
    });
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

  private extractList(res: unknown): Array<Record<string, unknown>> {
    if (Array.isArray(res)) return res as Array<Record<string, unknown>>;

    const body = res as Record<string, unknown> | null;
    if (!body) return [];

    const keys = ['data', 'content', 'items', 'achievements', 'achievementSkills', 'achievementMetrics'];
    for (const key of keys) {
      const value = body[key];
      if (Array.isArray(value)) return value as Array<Record<string, unknown>>;
    }

    if (body['id']) return [body];
    return [];
  }

  private buildAchievementSkillPayloads(achievementId: number, skill: AchievementSkill): AchievementSkill[] {
    const base = {
      skillId: skill.skillId,
      contributionLevel: String(skill.contributionLevel || '').trim().toUpperCase().replace(/[\s-]+/g, '_'),
      usageDescription: skill.usageDescription,
    };

    return [
      {
        ...base,
        achievement: { id: achievementId },
      },
      base,
    ];
  }

  private pickAchievement(res: string, fallback: Achievement): Achievement {
    const parsed = this.parseTextResponse(res);
    if (parsed && typeof parsed === 'object') {
      const normalized = this.normalizeAchievement(parsed as Record<string, unknown>);
      return normalized.id || normalized.title ? normalized : fallback;
    }
    return fallback;
  }

  private pickAchievementSkill(res: string, fallback: AchievementSkill, achievementId: number): AchievementSkill {
    const parsed = this.parseTextResponse(res);
    if (parsed && typeof parsed === 'object') {
      const normalized = this.normalizeAchievementSkill(parsed as Record<string, unknown>, achievementId);
      return normalized.id || normalized.skillId ? normalized : fallback;
    }
    return {
      ...fallback,
      achievement: { id: achievementId },
    };
  }

  private pickAchievementMetric(res: string, fallback: AchievementMetric, achievementId: number): AchievementMetric {
    const parsed = this.parseTextResponse(res);
    if (parsed && typeof parsed === 'object') {
      const normalized = this.normalizeAchievementMetric(parsed as Record<string, unknown>, achievementId);
      return normalized.id || normalized.durationDays ? normalized : fallback;
    }
    return {
      ...fallback,
      achievement: { id: achievementId },
    };
  }

  private parseTextResponse(text: string): unknown {
    const trimmed = String(text ?? '').trim();
    if (!trimmed) return null;
    try {
      return JSON.parse(trimmed) as unknown;
    } catch {
      return null;
    }
  }

  private normalizeAchievement(raw: Record<string, unknown>): Achievement {
    return {
      id: this.asNumber(raw['id']),
      title: String(raw['title'] ?? ''),
      description: String(raw['description'] ?? ''),
      completionDate: this.normalizeIsoDateOnly(raw['completionDate'] ?? raw['completion_date']),
      freelancerId: this.asNumber(raw['freelancerId'] ?? raw['freelancer_id']) ?? 0,
    };
  }

  private normalizeAchievementSkill(raw: Record<string, unknown>, achievementId?: number): AchievementSkill {
    const achievement = raw['achievement'] as Record<string, unknown> | undefined;
    return {
      id: this.asNumber(raw['id']),
      skillId: this.asNumber(raw['skillId'] ?? raw['skill_id']) ?? 0,
      contributionLevel: String(raw['contributionLevel'] ?? raw['contribution_level'] ?? ''),
      usageDescription: String(raw['usageDescription'] ?? raw['usage_description'] ?? ''),
      achievement: achievement?.['id'] || achievementId ? { id: this.asNumber(achievement?.['id']) ?? achievementId } : null,
    };
  }

  private normalizeAchievementMetric(raw: Record<string, unknown>, achievementId?: number): AchievementMetric {
    const achievement = raw['achievement'] as Record<string, unknown> | undefined;
    return {
      id: this.asNumber(raw['id']),
      complexityScore: this.asNumber(raw['complexityScore'] ?? raw['complexity_score']) ?? 0,
      impactScore: this.asNumber(raw['impactScore'] ?? raw['impact_score']) ?? 0,
      durationDays: this.asNumber(raw['durationDays'] ?? raw['duration_days']) ?? 0,
      achievement: achievement?.['id'] || achievementId ? { id: this.asNumber(achievement?.['id']) ?? achievementId } : null,
    };
  }

  private normalizeSkillCredibility(raw: Record<string, unknown>): SkillCredibility {
    return {
      skillId: this.asNumber(raw['skillId']) ?? 0,
      skillName: String(raw['skillName'] ?? ''),
      occurrences: this.asNumber(raw['occurrences']) ?? 0,
      averageContributionWeight: this.asNumber(raw['averageContributionWeight']) ?? 0,
      averageComplexityScore: this.asNumber(raw['averageComplexityScore']) ?? 0,
      averageImpactScore: this.asNumber(raw['averageImpactScore']) ?? 0,
      projectQualityScore: this.asNumber(raw['projectQualityScore']) ?? 0,
      credibilityScore: this.asNumber(raw['credibilityScore']) ?? 0,
    };
  }

  private normalizeSkillRanking(raw: Record<string, unknown>): SkillRanking {
    return {
      rank: this.asNumber(raw['rank']) ?? 0,
      skillId: this.asNumber(raw['skillId']) ?? 0,
      skillName: String(raw['skillName'] ?? ''),
      occurrences: this.asNumber(raw['occurrences']) ?? 0,
      credibilityScore: this.asNumber(raw['credibilityScore']) ?? 0,
      frequencyScore: this.asNumber(raw['frequencyScore']) ?? 0,
      rankingScore: this.asNumber(raw['rankingScore']) ?? 0,
    };
  }

  private normalizeProfileStrength(raw: Record<string, unknown>): ProfileStrength {
    return {
      freelancerId: this.asNumber(raw['freelancerId']) ?? 0,
      achievementsCount: this.asNumber(raw['achievementsCount']) ?? 0,
      distinctSkillsCount: this.asNumber(raw['distinctSkillsCount']) ?? 0,
      averageContributionWeight: this.asNumber(raw['averageContributionWeight']) ?? 0,
      averageProjectQuality: this.asNumber(raw['averageProjectQuality']) ?? 0,
      achievementsComponent: this.asNumber(raw['achievementsComponent']) ?? 0,
      diversityComponent: this.asNumber(raw['diversityComponent']) ?? 0,
      contributionComponent: this.asNumber(raw['contributionComponent']) ?? 0,
      qualityComponent: this.asNumber(raw['qualityComponent']) ?? 0,
      overallScore: this.asNumber(raw['overallScore']) ?? 0,
      profileLevel: String(raw['profileLevel'] ?? ''),
    };
  }

  private normalizeContributionDistribution(raw: Record<string, unknown>): ContributionDistribution {
    return {
      level: String(raw['level'] ?? ''),
      count: this.asNumber(raw['count']) ?? 0,
      percentage: this.asNumber(raw['percentage']) ?? 0,
    };
  }

  private normalizeTimeline(raw: Record<string, unknown>): AchievementTimeline {
    return {
      period: String(raw['period'] ?? ''),
      achievementsCount: this.asNumber(raw['achievementsCount']) ?? 0,
      averageQualityScore: this.asNumber(raw['averageQualityScore']) ?? 0,
    };
  }

  private normalizeAchievementInsight(raw: Record<string, unknown>): AchievementInsight {
    return {
      achievementId: this.asNumber(raw['achievementId']) ?? 0,
      title: String(raw['title'] ?? ''),
      linkedSkillsCount: this.asNumber(raw['linkedSkillsCount']) ?? 0,
      qualityScore: this.asNumber(raw['qualityScore']) ?? 0,
    };
  }

  private normalizeProfileStatistics(raw: Record<string, unknown>): ProfileStatistics {
    const topRankedSkill = raw['topRankedSkill'] && typeof raw['topRankedSkill'] === 'object'
      ? this.normalizeSkillRanking(raw['topRankedSkill'] as Record<string, unknown>)
      : null;

    const mostCredibleSkill = raw['mostCredibleSkill'] && typeof raw['mostCredibleSkill'] === 'object'
      ? this.normalizeSkillCredibility(raw['mostCredibleSkill'] as Record<string, unknown>)
      : null;

    const strongestAchievement = raw['strongestAchievement'] && typeof raw['strongestAchievement'] === 'object'
      ? this.normalizeAchievementInsight(raw['strongestAchievement'] as Record<string, unknown>)
      : null;

    const contributionDistribution = Array.isArray(raw['contributionDistribution'])
      ? (raw['contributionDistribution'] as Array<Record<string, unknown>>).map((row) =>
          this.normalizeContributionDistribution(row)
        )
      : [];

    const timeline = Array.isArray(raw['timeline'])
      ? (raw['timeline'] as Array<Record<string, unknown>>).map((row) => this.normalizeTimeline(row))
      : [];

    return {
      freelancerId: this.asNumber(raw['freelancerId']) ?? 0,
      achievementsCount: this.asNumber(raw['achievementsCount']) ?? 0,
      distinctSkillsCount: this.asNumber(raw['distinctSkillsCount']) ?? 0,
      averageComplexityScore: this.asNumber(raw['averageComplexityScore']) ?? 0,
      averageImpactScore: this.asNumber(raw['averageImpactScore']) ?? 0,
      averageDurationDays: this.asNumber(raw['averageDurationDays']) ?? 0,
      topRankedSkill,
      mostCredibleSkill,
      strongestAchievement,
      contributionDistribution,
      timeline,
    };
  }

  private normalizeIsoDateOnly(value: unknown): string {
    const v = String(value ?? '').trim();
    if (!v) return '';
    const candidate = v.includes('T') ? v.slice(0, 10) : v;
    return /^\d{4}-\d{2}-\d{2}$/.test(candidate) ? candidate : v;
  }

  private asNumber(value: unknown): number | undefined {
    if (typeof value === 'number') return value;
    if (typeof value === 'string' && value.trim() !== '' && !Number.isNaN(Number(value))) {
      return Number(value);
    }
    return undefined;
  }
}
