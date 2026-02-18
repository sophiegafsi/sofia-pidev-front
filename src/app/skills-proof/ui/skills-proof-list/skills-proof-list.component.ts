import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
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
    this.load();
  }

  load(): void {
    this.loading = true;
    this.errorMessage = '';

    const obs = this.skillIdFilter
      ? this.proofsService.getBySkillId(this.skillIdFilter)
      : this.proofsService.getAll();

    obs.subscribe({
      next: (data: SkillProof[]) => {
        const direct = data || [];
        if (direct.length > 0) {
          this.proofs = direct;
          this.loading = false;
          return;
        }
        this.loadFromSkillsFallback();
      },
      error: (err: unknown) => {
        console.error(err);
        this.loadFromSkillsFallback();
      },
    });
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

  filtered(): SkillProof[] {
    const x = this.q.trim().toLowerCase();
    if (!x) return this.proofs;

    return this.proofs.filter((p) => {
      const skillLabel = this.skillLabel(p).toLowerCase();
      return (
        (p.title || '').toLowerCase().includes(x) ||
        (p.type || '').toLowerCase().includes(x) ||
        (p.fileUrl || '').toLowerCase().includes(x) ||
        skillLabel.includes(x)
      );
    });
  }

  skillLabel(p: SkillProof): string {
    const id = p.skillId ?? p.skill?.id;
    if (!id) return 'Skill inconnue';
    const skill = this.skillsById.get(id);
    return skill ? `Skill #${id} - ${skill.name}` : `Skill #${id}`;
  }

  goNew(): void {
    const qp: Record<string, number> = {};
    if (this.skillIdFilter) qp['skillId'] = this.skillIdFilter;
    this.router.navigate(['/skills-proof/new'], { queryParams: qp });
  }

  goSkills(): void {
    this.router.navigate(['/skills']);
  }

  remove(id?: number): void {
    if (!id) return;
    if (!confirm('Supprimer ce proof ?')) return;

    this.proofsService.delete(id).subscribe({
      next: () => this.load(),
      error: (err: unknown) => {
        console.error(err);
        this.errorMessage = "Suppression echouee. Verifiez l'API backend.";
      },
    });
  }

  private loadFromSkillsFallback(): void {
    this.skillsService.getAll().subscribe({
      next: (skills: Skill[]) => {
        const rows: SkillProof[] = [];
        for (const s of skills || []) {
          const rawProofs = ((s as unknown as { proofs?: unknown[] }).proofs || []) as Array<Record<string, unknown>>;
          for (const p of rawProofs) {
            rows.push({
              id: this.asNumber(p['id']),
              title: String(p['title'] || ''),
              type: String(p['type'] || 'OTHER').toUpperCase() as SkillProof['type'],
              fileUrl: String(p['fileUrl'] || p['file_url'] || ''),
              skillId: s.id,
              skill: { id: s.id, name: s.name },
            });
          }
        }

        this.proofs = this.skillIdFilter
          ? rows.filter((p) => (p.skillId ?? p.skill?.id) === this.skillIdFilter)
          : rows;

        this.errorMessage = this.proofs.length ? '' : "Aucune preuve trouvee.";
        this.loading = false;
      },
      error: (err: unknown) => {
        console.error(err);
        this.errorMessage = "Impossible de charger les proofs. Verifiez l'API backend.";
        this.loading = false;
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
}
