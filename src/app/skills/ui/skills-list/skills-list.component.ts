import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, forkJoin, of, switchMap } from 'rxjs';
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

  page = 0;
  size = 3;
  totalPages = 1;
  totalElements = 0;

  sortField: 'id' | 'name' | 'level' | 'yearsOfExperience' = 'id';
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
        this.loading = false;
      },
      error: (err) => {
        console.error(err);
        const status = err?.status ? ` (HTTP ${err.status})` : '';
        this.errorMessage = `Impossible de charger les skills${status}. Verifiez que l'API backend tourne sur le port 8086.`;
        this.skills = [];
        this.totalPages = 1;
        this.totalElements = 0;
        this.loading = false;
      },
    });
  }

  filtered(): Skill[] {
    return this.skills;
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


  remove(id?: number): void {
    if (!id) return;
    if (!confirm('Supprimer cette skill ?')) return;
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
          this.errorMessage = `Suppression echouee${status}. Verifiez les relations skills/proofs et les routes backend.`;
        },
      });
  }
}
