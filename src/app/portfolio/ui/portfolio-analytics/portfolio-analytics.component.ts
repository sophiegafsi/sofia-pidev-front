import { isPlatformBrowser } from '@angular/common';
import { Component, DestroyRef, Inject, OnInit, PLATFORM_ID, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { forkJoin } from 'rxjs';
import {
  ContributionDistribution,
  ProfileStatistics,
  ProfileStrength,
  SkillCredibility,
  SkillRanking,
} from '../../models/portfolio.model';
import { PortfolioService } from '../../services/portfolio.service';
import { PortfolioTheme, PortfolioThemeService } from '../../services/portfolio-theme.service';

@Component({
  selector: 'app-portfolio-analytics',
  templateUrl: './portfolio-analytics.component.html',
  styleUrls: ['./portfolio-analytics.component.css'],
})
export class PortfolioAnalyticsComponent implements OnInit {
  private readonly destroyRef = inject(DestroyRef);

  freelancerId = 1;
  strength?: ProfileStrength;
  statistics?: ProfileStatistics;
  credibility: SkillCredibility[] = [];
  ranking: SkillRanking[] = [];

  loading = false;
  exportingPdf = false;
  errorMessage = '';
  theme: PortfolioTheme = 'dark';
  private readonly isBrowser: boolean;

  constructor(
    private portfolioService: PortfolioService,
    private route: ActivatedRoute,
    private router: Router,
    private portfolioThemeService: PortfolioThemeService,
    @Inject(PLATFORM_ID) platformId: object
  ) {
    this.isBrowser = isPlatformBrowser(platformId);
  }

  ngOnInit(): void {
    const queryFreelancerId = Number(this.route.snapshot.queryParamMap.get('freelancerId') || 1);
    if (Number.isInteger(queryFreelancerId) && queryFreelancerId > 0) {
      this.freelancerId = queryFreelancerId;
    }

    if (!this.isBrowser) return;
    this.portfolioThemeService.init(this.isBrowser);
    this.theme = this.portfolioThemeService.theme;
    this.portfolioThemeService.theme$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((theme) => (this.theme = theme));
    this.load();
  }

  toggleTheme(): void {
    this.portfolioThemeService.toggleTheme();
  }

  load(): void {
    if (!Number.isInteger(this.freelancerId) || this.freelancerId <= 0) {
      this.errorMessage = 'Freelancer ID must be a positive integer.';
      return;
    }

    this.loading = true;
    this.errorMessage = '';

    forkJoin({
      strength: this.portfolioService.getProfileStrength(this.freelancerId),
      statistics: this.portfolioService.getProfileStatistics(this.freelancerId),
      credibility: this.portfolioService.getSkillCredibility(this.freelancerId, 12),
      ranking: this.portfolioService.getSkillRanking(this.freelancerId, 10),
    }).subscribe({
      next: (res) => {
        this.strength = res.strength;
        this.statistics = res.statistics;
        this.credibility = res.credibility || [];
        this.ranking = res.ranking || [];
        this.loading = false;
      },
      error: (err) => {
        console.error(err);
        const status = err?.status ? ` (HTTP ${err.status})` : '';
        this.errorMessage = `Unable to load portfolio analytics${status}. Check portfolio-service through the gateway.`;
        this.loading = false;
      },
    });
  }

  reloadForFreelancer(): void {
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { freelancerId: this.freelancerId },
      queryParamsHandling: 'merge',
    });
    this.load();
  }

  downloadPdf(): void {
    if (!this.isBrowser) return;
    if (!Number.isInteger(this.freelancerId) || this.freelancerId <= 0) {
      this.errorMessage = 'Freelancer ID must be a positive integer.';
      return;
    }

    this.exportingPdf = true;
    this.errorMessage = '';

    this.portfolioService.downloadAnalyticsPdf(this.freelancerId).subscribe({
      next: (blob) => {
        const pdf = blob?.type ? blob : new Blob([blob], { type: 'application/pdf' });
        const url = window.URL.createObjectURL(pdf);
        const anchor = document.createElement('a');

        anchor.href = url;
        anchor.download = `portfolio-analytics-${this.freelancerId}.pdf`;
        anchor.rel = 'noopener';
        document.body.appendChild(anchor);
        anchor.click();
        anchor.remove();

        window.setTimeout(() => window.URL.revokeObjectURL(url), 1000);
        this.exportingPdf = false;
      },
      error: (err) => {
        console.error(err);
        const status = err?.status ? ` (HTTP ${err.status})` : '';
        this.errorMessage = `Unable to export the portfolio PDF${status}. Check the portfolio analytics PDF endpoint.`;
        this.exportingPdf = false;
      },
    });
  }

  back(): void {
    this.router.navigate(['/portfolio']);
  }

  profileLevelLabel(level?: string): string {
    const value = String(level || '').toUpperCase();
    if (!value) return 'Niveau en attente';
    if (value === 'ELITE') return 'Profil elite';
    if (value === 'STRONG') return 'Profil solide';
    if (value === 'DEVELOPING') return 'Profil en progression';
    return 'Profil a consolider';
  }

  profileSummary(): string {
    const score = Number(this.strength?.overallScore ?? 0);
    if (score >= 85) return 'Le profil est tres convaincant, avec des projets varies et un impact fort.';
    if (score >= 70) return 'Le profil est solide, deja appuye par des realisations credibles.';
    if (score >= 50) return 'Le profil est coherent, mais il peut encore gagner en profondeur.';
    return 'Le profil est en construction et a besoin de plus de preuves concretes.';
  }

  scoreWidth(score?: number, max = 100): string {
    const safe = Math.max(0, Math.min(max, Number(score ?? 0)));
    return `${(safe / max) * 100}%`;
  }

  metricWidth(score?: number): string {
    return this.scoreWidth(score, 10);
  }

  contributionLabel(weight?: number): string {
    const value = Number(weight ?? 0);
    if (value >= 2.5) return 'Forte';
    if (value >= 1.5) return 'Moyenne';
    return 'Faible';
  }

  contributionHelp(weight?: number): string {
    const value = Number(weight ?? 0);
    if (value >= 2.5) return 'La skill est souvent utilisee avec un role central dans les projets.';
    if (value >= 1.5) return 'La skill contribue regulierement, sans etre toujours la competence principale.';
    return 'La skill apparait plutot en support sur les projets actuels.';
  }

  readableContributionLevel(level?: string): string {
    const value = String(level || '').toUpperCase();
    if (value === 'HIGH') return 'Forte';
    if (value === 'MEDIUM') return 'Moyenne';
    if (value === 'LOW') return 'Faible';
    return value || 'N/A';
  }

  qualityLabel(score?: number): string {
    const value = Number(score ?? 0);
    if (value >= 8.5) return 'Excellente';
    if (value >= 7) return 'Solide';
    if (value >= 5.5) return 'Correcte';
    return 'A renforcer';
  }

  pluralize(count?: number, singular = 'element', plural = 'elements'): string {
    const value = Math.max(0, Number(count ?? 0));
    return `${value} ${value > 1 ? plural : singular}`;
  }

  profileTone(level?: string): string {
    const value = String(level || '').toUpperCase();
    if (value === 'ELITE') return 'tone-elite';
    if (value === 'STRONG') return 'tone-strong';
    return 'tone-developing';
  }

  contributionTone(level?: string): string {
    const value = String(level || '').toUpperCase();
    if (value === 'HIGH') return 'tone-strong';
    if (value === 'MEDIUM') return 'tone-mid';
    return 'tone-low';
  }

  maxTimelineCount(): number {
    return Math.max(1, ...(this.statistics?.timeline || []).map((item) => item.achievementsCount || 0));
  }

  timelineBarWidth(item: { achievementsCount: number }): string {
    const max = this.maxTimelineCount();
    const safe = Math.max(0, Number(item.achievementsCount || 0));
    return `${(safe / max) * 100}%`;
  }

  strongestContribution(distribution: ContributionDistribution[]): ContributionDistribution | undefined {
    return [...(distribution || [])].sort((a, b) => (b.count || 0) - (a.count || 0))[0];
  }
}
