import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, forkJoin, map, of, switchMap } from 'rxjs';
import { Skill } from '../../models/skill.model';
import { SkillsService } from '../../services/skills.service';
import { SkillsProofService } from '../../../skills-proof/services/skills-proof.service';

@Component({
  selector: 'app-skills-list',
  templateUrl: './skills-list.component.html',
  styleUrls: ['./skills-list.component.css'],
})
export class SkillsListComponent implements OnInit {
  skills: Skill[] = [];
  loading = false;
  q = '';
  errorMessage = '';
  private badgeLoadSeq = 0;

  page = 0;
  size = 3;
  totalPages = 1;
  totalElements = 0;

  sortField: 'name' | 'level' | 'yearsOfExperience' = 'name';
  sortDir: 'asc' | 'desc' = 'asc';

  constructor(
    private skillsService: SkillsService,
    private skillsProofService: SkillsProofService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.load();
  }

  onQueryChange(value: string): void {
    this.q = value ?? '';
    this.page = 0;
    this.load();
  }

  onSortChange(): void {
    this.page = 0;
    this.load();
  }

  load(): void {
    this.loading = true;
    this.errorMessage = '';

    this.skillsService.search(this.q, this.page, this.size, this.sortField, this.sortDir).subscribe({
      next: (res) => {
        this.skills = res.content || [];
        this.totalPages = Math.max(1, Number(res.totalPages || 1));
        this.totalElements = Number(res.totalElements ?? this.skills.length) || 0;
        this.loadBadgesForCurrentPage();
        this.loading = false;
      },
      error: (err) => {
        console.error(err);
        const status = err?.status ? ` (HTTP ${err.status})` : '';
        this.errorMessage = `Unable to load skills${status}. Check that the backend API is running on port 8086.`;
        this.skills = [];
        this.totalPages = 1;
        this.totalElements = 0;
        this.loading = false;
      },
    });
  }

  private loadBadgesForCurrentPage(): void {
    const seq = ++this.badgeLoadSeq;
    const ids = (this.skills || [])
      .map((s) => s.id)
      .filter((id): id is number => typeof id === 'number' && Number.isFinite(id));

    if (!ids.length) return;

    forkJoin(
      ids.map((id) =>
        this.skillsService.getBadge(id).pipe(
          catchError(() => of(undefined)),
          map((badge) => ({ id, badge }))
        )
      )
    ).subscribe((rows) => {
      if (seq !== this.badgeLoadSeq) return;
      const byId = new Map(rows.map((r) => [r.id, r.badge] as const));
      this.skills = (this.skills || []).map((s) => (s.id ? { ...s, badge: byId.get(s.id) } : s));
    });
  }

  filtered(): Skill[] {
    return this.skills;
  }

  badgeStyle(badge?: Skill['badge']): Record<string, string> {
    if (!badge) return {};
    if (badge === 'CERTIFIED_EXPERT') return { background: 'rgba(242,153,74,.22)', borderColor: 'rgba(242,153,74,.45)' };
    if (badge === 'EXPERT') return { background: 'rgba(47,128,237,.22)', borderColor: 'rgba(47,128,237,.45)' };
    if (badge === 'ADVANCED') return { background: 'rgba(224,168,0,.22)', borderColor: 'rgba(224,168,0,.45)' };
    return { background: 'rgba(255,255,255,.10)', borderColor: 'rgba(255,255,255,.18)' };
  }

  badgeEmoji(badge?: Skill['badge']): string {
    if (!badge) return '';
    if (badge === 'BEGINNER') return '🥉';
    if (badge === 'ADVANCED') return '🥈';
    if (badge === 'EXPERT') return '🥇';
    return '🏆';
  }

  prev(): void {
    if (this.page > 0) {
      this.page--;
      this.load();
    }
  }

  next(): void {
    if (this.page + 1 < this.totalPages) {
      this.page++;
      this.load();
    }
  }

  goNew(): void {
    this.router.navigate(['/skills/new']);
  }

  goEdit(id?: number): void {
    if (!id) return;
    this.router.navigate(['/skills/edit', id]);
  }

  goProofs(id?: number): void {
    if (!id) {
      this.router.navigate(['/skills-proof']);
      return;
    }
    this.router.navigate(['/skills-proof/skill', id]);
  }

  goAddProof(id?: number): void {
    if (!id) return;
    this.router.navigate(['/skills-proof/new'], { queryParams: { skillId: id } });
  }

  downloadPdf(skillId?: number): void {
    if (!skillId) {
      this.errorMessage = 'Skill ID not found: cannot generate the PDF.';
      return;
    }

    this.errorMessage = '';

    this.skillsService.downloadSkillPdf(skillId).subscribe({
      next: (blob) => {
        const pdf = blob?.type ? blob : new Blob([blob], { type: 'application/pdf' });
        const url = window.URL.createObjectURL(pdf);

        const a = document.createElement('a');
        a.href = url;
        a.download = `skill_${skillId}.pdf`;
        a.rel = 'noopener';
        document.body.appendChild(a);
        a.click();
        a.remove();

        window.setTimeout(() => window.URL.revokeObjectURL(url), 1000);
      },
      error: (err) => {
        console.error('PDF download failed', err);
        const status = err?.status ? ` (HTTP ${err.status})` : '';
        this.errorMessage = `PDF download failed${status}. Check the /skills/{id}/pdf endpoint.`;
      },
    });
  }

  remove(id?: number): void {
    if (!id) return;
    this.skillsProofService
      .getBySkillId(id)
      .pipe(catchError(() => of([])))
      .pipe(
        switchMap((proofs) => {
          if (!proofs?.length) return of(null);
          const deletions = proofs
            .map((p) => p.id)
            .filter((x): x is number => typeof x === 'number')
            .map((proofId) => this.skillsProofService.delete(proofId));
          return deletions.length ? forkJoin(deletions) : of(null);
        }),
        switchMap(() => this.skillsService.delete(id))
      )
      .subscribe({
        next: () => this.load(),
      error: (err) => {
        console.error(err);
        const status = err?.status ? ` (HTTP ${err.status})` : '';
        this.errorMessage = `Delete failed${status}. Check the skills/proofs relations and backend routes.`;
      },
    });
  }
}
