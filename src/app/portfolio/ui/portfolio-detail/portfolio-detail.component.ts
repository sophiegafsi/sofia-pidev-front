import { Component, DestroyRef, Inject, OnInit, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AbstractControl, FormBuilder, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { forkJoin } from 'rxjs';
import { Skill } from '../../../skills/models/skill.model';
import { SkillsService } from '../../../skills/services/skills.service';
import {
  Achievement,
  AchievementDescriptionResult,
  AchievementMetric,
  AchievementMetricSuggestion,
  AchievementSkill,
} from '../../models/portfolio.model';
import { PortfolioService } from '../../services/portfolio.service';
import { PortfolioTheme, PortfolioThemeService } from '../../services/portfolio-theme.service';

@Component({
  selector: 'app-portfolio-detail',
  templateUrl: './portfolio-detail.component.html',
  styleUrls: ['./portfolio-detail.component.css'],
})
export class PortfolioDetailComponent implements OnInit {
  private readonly destroyRef = inject(DestroyRef);

  achievementId?: number;
  achievement?: Achievement;
  achievementSkills: AchievementSkill[] = [];
  metrics: AchievementMetric[] = [];
  suggestedMetric?: AchievementMetricSuggestion;
  skillsById = new Map<number, Skill>();

  loading = false;
  savingSkill = false;
  savingMetric = false;
  generatingDescription = false;
  applyingGeneratedDescription = false;
  errorMessage = '';
  skillMessage = '';
  metricMessage = '';
  aiMessage = '';
  generatedDescription = '';
  theme: PortfolioTheme = 'dark';
  contributionLevels = ['HIGH', 'MEDIUM', 'LOW'];
  deletingMetricIds = new Set<number>();

  skillForm: any;
  metricForm: any;
  private reloadTimer?: ReturnType<typeof setTimeout>;
  private readonly isBrowser: boolean;

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private portfolioService: PortfolioService,
    private skillsService: SkillsService,
    private portfolioThemeService: PortfolioThemeService,
    @Inject(PLATFORM_ID) platformId: object
  ) {
    this.isBrowser = isPlatformBrowser(platformId);
  }

  ngOnInit(): void {
    this.skillForm = this.fb.group({
      skillId: [null, [Validators.required, PortfolioDetailComponent.positiveIntValidator()]],
      contributionLevel: ['', [Validators.required, PortfolioDetailComponent.trimmedMinLengthValidator(2), Validators.maxLength(60)]],
      usageDescription: ['', [Validators.maxLength(800)]],
    });

    this.metricForm = this.fb.group({
      durationDays: [1, [Validators.required, PortfolioDetailComponent.positiveIntValidator()]],
    });

    const id = this.parsePositiveInt(this.route.snapshot.paramMap.get('id'));
    if (!id) {
      this.errorMessage = 'Invalid achievement ID.';
      return;
    }

    this.achievementId = id;
    if (!this.isBrowser) return;
    this.portfolioThemeService.init(this.isBrowser);
    this.theme = this.portfolioThemeService.theme;
    this.portfolioThemeService.theme$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((theme) => (this.theme = theme));
    this.loadSkills();
    this.load();
  }

  toggleTheme(): void {
    this.portfolioThemeService.toggleTheme();
  }

  load(): void {
    if (!this.achievementId) return;

    this.loading = true;
    this.errorMessage = '';
    forkJoin({
      achievement: this.portfolioService.getAchievementById(this.achievementId),
      skills: this.portfolioService.getAchievementSkills(this.achievementId),
      metrics: this.portfolioService.getAchievementMetrics(this.achievementId),
      suggestion: this.portfolioService.getSuggestedAchievementMetric(this.achievementId),
    }).subscribe({
      next: (res) => {
        this.achievement = res.achievement;
        this.achievementSkills = res.skills || [];
        this.metrics = res.metrics || [];
        this.suggestedMetric = res.suggestion;
        this.loading = false;
      },
      error: (err) => {
        console.error(err);
        const status = err?.status ? ` (HTTP ${err.status})` : '';
        this.errorMessage = `Unable to load portfolio detail${status}. Check portfolio-service through the gateway.`;
        this.loading = false;
      },
    });
  }

  refreshSoon(): void {
    if (this.reloadTimer) clearTimeout(this.reloadTimer);
    this.reloadTimer = setTimeout(() => this.load(), 450);
  }

  loadSkills(): void {
    this.skillsService.getAll().subscribe({
      next: (skills) => {
        this.skillsById.clear();
        for (const s of skills || []) {
          if (s.id) this.skillsById.set(s.id, s);
        }
      },
      error: (err) => console.error(err),
    });
  }

  addSkill(): void {
    this.skillMessage = '';
    if (!this.achievementId) return;
    if (this.skillForm.invalid) {
      this.skillForm.markAllAsTouched();
      this.skillMessage = 'Please fill in the required fields (skill and contribution level).';
      return;
    }

    const skillId = this.parsePositiveInt(this.skillForm.value.skillId);
    if (!skillId) {
      this.skillMessage = 'Add skill failed. Check that Skill ID is valid.';
      return;
    }

    const payload: AchievementSkill = {
      skillId,
      contributionLevel: this.normalizeContributionLevel(this.skillForm.value.contributionLevel),
      usageDescription: String(this.skillForm.value.usageDescription || '').trim(),
    };

    this.savingSkill = true;
    this.portfolioService.addAchievementSkill(this.achievementId, payload).subscribe({
      next: (created) => {
        this.savingSkill = false;
        this.skillMessage = 'Skill linked successfully.';
        this.achievementSkills = [
          ...this.achievementSkills,
          {
            ...payload,
            id: created.id,
            achievement: { id: this.achievementId },
          },
        ];
        this.skillForm.reset({ skillId: null, contributionLevel: '', usageDescription: '' });
        this.refreshSoon();
      },
      error: (err) => {
        console.error(err);
        this.recoverAddedSkill(payload, err);
      },
    });
  }

  addMetric(): void {
    this.metricMessage = '';
    if (!this.achievementId) return;
    if (this.metricForm.invalid) {
      this.metricForm.markAllAsTouched();
      this.metricMessage = 'Please fill in the metric form correctly.';
      return;
    }

    const suggestion = this.suggestedMetric;
    const payload: AchievementMetric = {
      complexityScore: Number(suggestion?.complexityScore ?? 1),
      impactScore: Number(suggestion?.impactScore ?? 1),
      durationDays: Number(this.metricForm.value.durationDays),
    };

    this.savingMetric = true;
    this.portfolioService.addAchievementMetric(this.achievementId, payload).subscribe({
      next: (created) => {
        this.savingMetric = false;
        this.metricMessage = 'Metric saved. Complexity and impact are now linked to the current skills.';
        this.metrics = [
          {
            ...payload,
            id: created.id,
            achievement: { id: this.achievementId },
          },
        ];
        this.metricForm.reset({ durationDays: 1 });
        this.refreshSoon();
      },
      error: (err) => {
        console.error(err);
        this.recoverAddedMetric(payload, err);
      },
    });
  }

  private recoverAddedSkill(payload: AchievementSkill, err: unknown): void {
    const status = (err as { status?: number } | null)?.status;
    this.skillMessage = 'Skill was submitted. Verifying the backend response...';

    setTimeout(() => {
      if (!this.achievementId) return;

      this.portfolioService.getAchievementSkills(this.achievementId).subscribe({
        next: (rows) => {
          const created = [...(rows || [])].reverse().find((row) => this.isSameAchievementSkill(row, payload));
          this.savingSkill = false;

          if (created) {
            this.skillMessage = 'Skill linked successfully.';
            this.achievementSkills = rows || [];
            this.skillForm.reset({ skillId: null, contributionLevel: '', usageDescription: '' });
            return;
          }

          const statusText = status ? ` (HTTP ${status})` : '';
          this.skillMessage = this.formatSkillSaveError(err, statusText);
        },
        error: (readErr) => {
          console.error(readErr);
          this.savingSkill = false;
          const statusText = status ? ` (HTTP ${status})` : '';
          this.skillMessage = this.formatSkillSaveError(err, statusText);
        },
      });
    }, 700);
  }

  private recoverAddedMetric(payload: AchievementMetric, err: unknown): void {
    const status = (err as { status?: number } | null)?.status;
    this.metricMessage = 'Metric was submitted. Verifying the backend response...';

    setTimeout(() => {
      if (!this.achievementId) return;

      this.portfolioService.getAchievementMetrics(this.achievementId).subscribe({
        next: (rows) => {
          const created = [...(rows || [])].reverse().find((row) => this.isSameAchievementMetric(row, payload));
          this.savingMetric = false;

          if (created) {
            this.metricMessage = 'Metric saved. Complexity and impact are now linked to the current skills.';
            this.metrics = rows || [];
            this.metricForm.reset({ durationDays: 1 });
            return;
          }

          const statusText = status ? ` (HTTP ${status})` : '';
          this.metricMessage = `Add metric failed${statusText}. Check the AchievementMetric endpoint.`;
        },
        error: (readErr) => {
          console.error(readErr);
          this.savingMetric = false;
          const statusText = status ? ` (HTTP ${status})` : '';
          this.metricMessage = `Add metric failed${statusText}. Check the AchievementMetric endpoint.`;
        },
      });
    }, 700);
  }

  private isSameAchievementSkill(a: AchievementSkill, b: AchievementSkill): boolean {
    return (
      Number(a.skillId || 0) === Number(b.skillId || 0) &&
      String(a.contributionLevel || '').trim().toLowerCase() === String(b.contributionLevel || '').trim().toLowerCase() &&
      String(a.usageDescription || '').trim().toLowerCase() === String(b.usageDescription || '').trim().toLowerCase()
    );
  }

  private normalizeContributionLevel(value: unknown): string {
    return String(value || '').trim().toUpperCase().replace(/[\s-]+/g, '_');
  }

  private formatSkillSaveError(err: unknown, statusText: string): string {
    const raw = this.extractErrorText(err);
    if (/ContributionLevel|contributionLevel|not one of the values|Enum|deserialize/i.test(raw)) {
      return `Add skill failed${statusText}. Contribution level must match the backend enum exactly. Try one of: ${this.contributionLevels.join(', ')}.`;
    }
    if (/skillId|skill_id/i.test(raw)) {
      return `Add skill failed${statusText}. Check that the Skill ID exists.`;
    }
    return `Add skill failed${statusText}. ${raw || 'Check the AchievementSkill endpoint.'}`;
  }

  private extractErrorText(err: unknown): string {
    const e = err as { error?: unknown; message?: string } | null;
    const values = [
      typeof e?.error === 'string' ? e.error : '',
      e?.error && typeof e.error === 'object' ? JSON.stringify(e.error) : '',
      e?.message || '',
    ];
    return values.map((value) => String(value || '').trim()).filter(Boolean).join(' | ');
  }

  private isSameAchievementMetric(a: AchievementMetric, b: AchievementMetric): boolean {
    return (
      Number(a.complexityScore || 0) === Number(b.complexityScore || 0) &&
      Number(a.impactScore || 0) === Number(b.impactScore || 0) &&
      Number(a.durationDays || 0) === Number(b.durationDays || 0)
    );
  }

  removeSkill(id?: number): void {
    if (!id) return;

    const beforeDelete = this.achievementSkills.slice();
    this.achievementSkills = this.achievementSkills.filter((skill) => skill.id !== id);
    this.skillMessage = '';

    this.portfolioService.deleteAchievementSkill(id).subscribe({
      next: () => this.load(),
      error: (err) => {
        console.error(err);
        this.verifySkillDeleted(id, beforeDelete, err);
      },
    });
  }

  removeMetric(id?: number): void {
    if (!id) return;
    if (this.deletingMetricIds.has(id)) return;

    const beforeDelete = this.metrics.slice();
    this.deletingMetricIds.add(id);
    this.metrics = this.metrics.filter((metric) => metric.id !== id);
    this.metricMessage = '';

    this.portfolioService.deleteAchievementMetric(id).subscribe({
      next: () => {
        this.deletingMetricIds.delete(id);
        this.metricMessage = '';
        this.load();
      },
      error: (err) => {
        console.error(err);
        this.verifyMetricDeleted(id, beforeDelete, err);
      },
    });
  }

  private verifySkillDeleted(id: number, rollbackRows: AchievementSkill[], err: unknown): void {
    setTimeout(() => {
      if (!this.achievementId) return;

      this.portfolioService.getAchievementSkills(this.achievementId).subscribe({
        next: (rows) => {
          const stillExists = (rows || []).some((skill) => Number(skill.id) === id);
          if (!stillExists) {
            this.skillMessage = '';
            this.achievementSkills = rows || [];
            return;
          }

          this.achievementSkills = rollbackRows;
          const status = (err as { status?: number } | null)?.status;
          const statusText = status ? ` (HTTP ${status})` : '';
          this.skillMessage = `Delete skill link failed${statusText}. Check the backend API.`;
        },
        error: (readErr) => {
          console.error(readErr);
          this.skillMessage = '';
          this.refreshSoon();
        },
      });
    }, 700);
  }

  private verifyMetricDeleted(id: number, rollbackRows: AchievementMetric[], err: unknown): void {
    setTimeout(() => {
      if (!this.achievementId) return;

      this.portfolioService.getAchievementMetrics(this.achievementId).subscribe({
        next: (rows) => {
          const stillExists = (rows || []).some((metric) => Number(metric.id) === id);
          if (!stillExists) {
            this.deletingMetricIds.delete(id);
            this.metricMessage = '';
            this.metrics = rows || [];
            return;
          }

          this.deletingMetricIds.delete(id);
          this.metrics = rollbackRows;
          const status = (err as { status?: number } | null)?.status;
          const statusText = status ? ` (HTTP ${status})` : '';
          this.metricMessage = `Delete metric failed${statusText}. Check the backend API.`;
        },
        error: (readErr) => {
          console.error(readErr);
          this.deletingMetricIds.delete(id);
          this.metricMessage = '';
          this.refreshSoon();
        },
      });
    }, 700);
  }

  isDeletingMetric(id?: number): boolean {
    return !!id && this.deletingMetricIds.has(id);
  }

  skillLabel(row: AchievementSkill): string {
    const skill = this.skillsById.get(row.skillId);
    return skill?.name || 'Unknown skill';
  }

  availableSkills(): Skill[] {
    const linkedIds = new Set(
      (this.achievementSkills || [])
        .map((row) => Number(row.skillId || 0))
        .filter((id) => Number.isInteger(id) && id > 0)
    );

    return Array.from(this.skillsById.values())
      .filter((skill) => skill.id && !linkedIds.has(skill.id))
      .sort((a, b) => String(a.name || '').localeCompare(String(b.name || ''), undefined, { sensitivity: 'base' }));
  }

  hasSkillError(controlName: string, errorKey: string): boolean {
    const c = this.skillForm?.get(controlName);
    return !!c && (c.touched || c.dirty) && c.hasError(errorKey);
  }

  hasMetricError(controlName: string, errorKey: string): boolean {
    const c = this.metricForm?.get(controlName);
    return !!c && (c.touched || c.dirty) && c.hasError(errorKey);
  }

  back(): void {
    this.router.navigate(['/portfolio']);
  }

  generateDescription(): void {
    if (!this.achievementId || this.generatingDescription) return;

    this.generatingDescription = true;
    this.aiMessage = '';

    this.portfolioService.generateAchievementDescription(this.achievementId).subscribe({
      next: (result: AchievementDescriptionResult) => {
        this.generatedDescription = result.generatedDescription || '';
        this.generatingDescription = false;
        this.aiMessage = this.generatedDescription
          ? 'A portfolio-ready summary has been generated.'
          : 'No description could be generated for this achievement.';
      },
      error: (err) => {
        console.error(err);
        this.generatingDescription = false;
        const status = err?.status ? ` (HTTP ${err.status})` : '';
        this.aiMessage = `Unable to generate the description${status}.`;
      },
    });
  }

  applyGeneratedDescription(): void {
    if (!this.achievement || !this.generatedDescription || this.applyingGeneratedDescription) return;

    this.applyingGeneratedDescription = true;
    this.aiMessage = '';

    const updatedAchievement: Achievement = {
      ...this.achievement,
      description: this.generatedDescription,
    };

    this.portfolioService.updateAchievement(updatedAchievement).subscribe({
      next: (achievement) => {
        this.achievement = {
          ...updatedAchievement,
          ...(achievement || {}),
          description: this.generatedDescription,
        };
        this.applyingGeneratedDescription = false;
        this.aiMessage = 'Generated summary applied to the achievement description.';
      },
      error: (err) => {
        console.error(err);
        this.applyingGeneratedDescription = false;
        const status = err?.status ? ` (HTTP ${err.status})` : '';
        this.aiMessage = `Unable to apply the generated description${status}.`;
      },
    });
  }

  contributionMixSummary(): string {
    const suggestion = this.suggestedMetric;
    if (!suggestion) {
      return 'Waiting for linked skills to compute the metric suggestion.';
    }

    return `${suggestion.linkedSkillsCount} linked skills: ${suggestion.highContributionCount} high, ${suggestion.mediumContributionCount} medium, ${suggestion.lowContributionCount} low contributions.`;
  }

  goAnalytics(): void {
    const freelancerId = this.achievement?.freelancerId;
    if (freelancerId) {
      this.router.navigate(['/portfolio/analytics'], { queryParams: { freelancerId } });
      return;
    }
    this.router.navigate(['/portfolio/analytics']);
  }

  private parsePositiveInt(value: unknown): number | undefined {
    const n = typeof value === 'number' ? value : Number(String(value ?? '').trim());
    if (!Number.isInteger(n) || n <= 0) return undefined;
    return n;
  }

  private static trimmedMinLengthValidator(min: number): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const raw = control.value;
      if (raw === null || raw === undefined) return null;
      const v = String(raw).trim();
      if (v.length === 0) return null;
      return v.length < min ? { trimmedMinLength: { requiredLength: min, actualLength: v.length } } : null;
    };
  }

  private static positiveIntValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const raw = control.value;
      if (raw === null || raw === undefined || raw === '') return null;
      const n = Number(String(raw).trim());
      if (!Number.isInteger(n) || n <= 0) return { positiveInt: true };
      return null;
    };
  }

  private static scoreValidator(min: number, max: number): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const raw = control.value;
      if (raw === null || raw === undefined || raw === '') return null;
      const n = Number(String(raw).trim());
      if (!Number.isFinite(n)) return { number: true };
      if (n < min) return { min: { min, actual: n } };
      if (n > max) return { max: { max, actual: n } };
      return null;
    };
  }
}
