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

  constructor(
    private skillsService: SkillsService,
    private skillsProofService: SkillsProofService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading = true;
    this.errorMessage = '';
    this.skillsService.getAll().subscribe({
      next: (data) => {
        this.skills = (data || []).sort((a, b) => (b.id || 0) - (a.id || 0));
        this.loading = false;
      },
      error: (err) => {
        console.error(err);
        const status = err?.status ? ` (HTTP ${err.status})` : '';
        this.errorMessage = `Impossible de charger les skills${status}. Verifiez que l'API backend tourne sur le port 8086.`;
        this.loading = false;
      },
    });
  }

  filtered(): Skill[] {
    const x = this.q.trim().toLowerCase();
    if (!x) return this.skills;
    return this.skills.filter(s =>
      (s.name || '').toLowerCase().includes(x) ||
      (s.level || '').toLowerCase().includes(x)
    );
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
