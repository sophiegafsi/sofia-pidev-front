import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject, catchError, debounceTime, map, of, startWith, switchMap, tap } from 'rxjs';
import { Skill } from '../../../skills/models/skill.model';
import { SkillsService } from '../../../skills/services/skills.service';
import { SkillProof } from '../../models/skill-proof.model';
import { SkillsProofService } from '../../services/skills-proof.service';

@Component({
  selector: 'app-skills-proof-list',
  templateUrl: './skills-proof-list.component.html',
  styleUrls: ['./skills-proof-list.component.css'],
})
export class SkillsProofListComponent implements OnInit {
  proofs: SkillProof[] = [];
  skillsById = new Map<number, Skill>();
  loading = false;
  errorMessage = '';
  q = '';
  skillIdFilter?: number;
  sortKey: 'id' | 'title' | 'type' = 'id';
  sortDir: 'asc' | 'desc' = 'asc';
  page = 0;
  size = 3;
  totalPages = 1;

  private readonly reload$ = new Subject<void>();

  constructor(
    private proofsService: SkillsProofService,
    private skillsService: SkillsService,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit(): void {
    const skillId = this.route.snapshot.paramMap.get('skillId');
    this.skillIdFilter = skillId ? Number(skillId) : undefined;
    this.loadSkills();
    this.bindReload();
    this.reload();
  }

  reload(): void {
    this.reload$.next();
  }

  loadSkills(): void {
    this.skillsService.getAll().subscribe({
      next: (skills: Skill[]) => {
        this.skillsById.clear();
        for (const s of skills || []) {
          if (s.id) this.skillsById.set(s.id, s);
        }
      },
      error: (err: unknown) => console.error(err),
    });
  }

  onQueryChange(value: string): void {
    this.q = value ?? '';
    this.page = 0;
    this.reload();
  }

  onSortChange(): void {
    this.page = 0;
    this.reload();
  }

  private bindReload(): void {
    this.reload$
      .pipe(
        startWith(void 0),
        debounceTime(250),
        tap(() => {
          this.loading = true;
          this.errorMessage = '';
        }),
        switchMap(() => {
          const obs = this.skillIdFilter
            ? this.proofsService.getBySkillId(this.skillIdFilter)
            : this.proofsService.getAll();

          return obs.pipe(
            map((rows) => this.applyClientFilterAndSort(rows || [])),
            catchError((err: unknown) => {
              console.error(err);
              this.errorMessage = 'Unable to load proofs. Check the backend API.';
              return of([] as SkillProof[]);
            })
          );
        })
      )
      .subscribe((rows) => {
        this.proofs = rows;
        this.totalPages = Math.max(1, Math.ceil((rows || []).length / this.size));
        if (this.page + 1 > this.totalPages) this.page = this.totalPages - 1;
        this.loading = false;
      });
  }

  filtered(): SkillProof[] {
    // Kept for template compatibility. Filtering is already applied during reload().
    return this.proofs;
  }

  paged(): SkillProof[] {
    const start = this.page * this.size;
    return (this.proofs || []).slice(start, start + this.size);
  }

  prev(): void {
    if (this.page > 0) {
      this.page--;
    }
  }

  next(): void {
    if (this.page + 1 < this.totalPages) {
      this.page++;
    }
  }

  skillLabel(p: SkillProof): string {
    const id = p.skillId ?? p.skill?.id;
    if (!id) return 'Unknown skill';
    const skill = this.skillsById.get(id);
    return skill ? `Skill #${id} - ${skill.name}` : `Skill #${id}`;
  }

  isImage(url?: string): boolean {
    const v = String(url || '').trim();
    if (!v) return false;
    if (v.startsWith('data:image/')) return true;
    return /\.(png|jpe?g|gif|webp|bmp|svg)(\?.*)?$/i.test(v);
  }

  expirationBadgeLabel(p: SkillProof): string {
    const status = this.expirationStatus(p);
    if (status === 'EXPIRED') return '❌ EXPIRED';
    if (status === 'EXPIRING_SOON') return '⚠️ EXPIRING SOON';
    return '✅ VALID';
  }

  expirationBadgeStyle(p: SkillProof): Record<string, string> {
    const status = this.expirationStatus(p);
    if (status === 'EXPIRED') return { background: '#ff3b3b' };
    if (status === 'EXPIRING_SOON') return { background: '#e0a800' };
    return { background: '#1f8f3a' };
  }

  private expirationStatus(p: SkillProof): 'VALID' | 'EXPIRING_SOON' | 'EXPIRED' {
    const raw = String(p.expiresAt ?? '').trim();
    if (!raw) return 'VALID';

    const expDay = SkillsProofListComponent.parseIsoDateOnlyToUtcDay(raw);
    if (expDay === undefined) return 'VALID';

    const today = SkillsProofListComponent.todayUtcDay();
    if (expDay < today) return 'EXPIRED';

    const soonThreshold = today + 30 * 24 * 60 * 60 * 1000;
    if (expDay <= soonThreshold) return 'EXPIRING_SOON';

    return 'VALID';
  }

  private static todayUtcDay(): number {
    const now = new Date();
    return Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  }

  private static parseIsoDateOnlyToUtcDay(value: string): number | undefined {
    const v = (value || '').trim();
    if (!v) return undefined;
    const candidate = v.includes('T') ? v.slice(0, 10) : v;

    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(candidate);
    if (!m) return undefined;

    const year = Number(m[1]);
    const month = Number(m[2]);
    const day = Number(m[3]);
    if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) return undefined;
    if (month < 1 || month > 12) return undefined;
    if (day < 1 || day > 31) return undefined;

    const utc = Date.UTC(year, month - 1, day);
    // Validate normalization didn't roll over (e.g. 2026-02-31).
    const d = new Date(utc);
    if (d.getUTCFullYear() !== year || d.getUTCMonth() !== month - 1 || d.getUTCDate() !== day) return undefined;
    return utc;
  }

  goNew(): void {
    const qp: Record<string, number> = {};
    if (this.skillIdFilter) qp['skillId'] = this.skillIdFilter;
    this.router.navigate(['/skills-proof/new'], { queryParams: qp });
  }

  goSkills(): void {
    this.router.navigate(['/skills']);
  }

  goEdit(id?: number): void {
    if (!id) return;
    this.router.navigate(['/skills-proof/edit', id]);
  }

  remove(id?: number): void {
    if (!id) return;

    this.proofsService.delete(id).subscribe({
      next: () => this.reload(),
      error: (err: unknown) => {
        console.error(err);
        this.errorMessage = 'Delete failed. Check the backend API.';
      },
    });
  }

  private asNumber(value: unknown): number | undefined {
    if (typeof value === 'number') return value;
    if (typeof value === 'string' && value.trim() !== '' && !Number.isNaN(Number(value))) {
      return Number(value);
    }
    return undefined;
  }

  private applyClientFilterAndSort(rows: SkillProof[]): SkillProof[] {
    const q = this.q.trim().toLowerCase();
    const filtered = !q
      ? rows.slice()
      : rows.filter((p) => {
          const skillLabel = this.skillLabel(p).toLowerCase();
          return (
            (p.title || '').toLowerCase().includes(q) ||
            (p.type || '').toLowerCase().includes(q) ||
            (p.fileUrl || '').toLowerCase().includes(q) ||
            skillLabel.includes(q)
          );
        });

    const dir = this.sortDir === 'asc' ? 1 : -1;
    const compareText = (a: string, b: string) => a.localeCompare(b, undefined, { sensitivity: 'base' });
    const compareNum = (a: number, b: number) => a - b;

    filtered.sort((a, b) => {
      if (this.sortKey === 'title') return dir * compareText(String(a.title || ''), String(b.title || ''));
      if (this.sortKey === 'type') return dir * compareText(String(a.type || ''), String(b.type || ''));
      return dir * compareNum(Number(a.id ?? 0), Number(b.id ?? 0));
    });

    return filtered;
  }
}
