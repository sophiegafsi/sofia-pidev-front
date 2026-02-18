import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { SkillProof } from '../../models/skill-proof.model';
import { SkillsProofService } from '../../services/skills-proof.service';

@Component({
  selector: 'app-skills-proof-list',
  templateUrl: './skills-proof-list.component.html',
  styleUrls: ['./skills-proof-list.component.css'],
})
export class SkillsProofListComponent implements OnInit {
  proofs: SkillProof[] = [];
  loading = false;
  errorMessage = '';

  // ✅ utilisés par le HTML
  q = '';
  skillIdFilter?: number;

  constructor(
    private proofsService: SkillsProofService,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit(): void {
    const skillId = this.route.snapshot.paramMap.get('skillId');
    this.skillIdFilter = skillId ? Number(skillId) : undefined;
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
        this.proofs = data || [];
        this.loading = false;
      },
      error: (err: any) => {
        console.error(err);
        this.errorMessage = "Impossible de charger les proofs. Vérifiez l'API backend.";
        this.loading = false;
      },
    });
  }

  // ✅ utilisé par le HTML
  filtered(): SkillProof[] {
    const x = this.q.trim().toLowerCase();
    if (!x) return this.proofs;

    return this.proofs.filter((p) =>
      (p.title || '').toLowerCase().includes(x) ||
      (p.type || '').toLowerCase().includes(x) ||
      (p.fileUrl || '').toLowerCase().includes(x)
    );
  }

  // ✅ utilisé par le HTML
  goNew(): void {
    // si tu veux créer un proof pour un skill spécifique, on garde le filtre
    const qp: any = {};
    if (this.skillIdFilter) qp.skillId = this.skillIdFilter;
    this.router.navigate(['/skills-proof/new'], { queryParams: qp });
  }

  // ✅ utilisé par le HTML
  goSkills(): void {
    this.router.navigate(['/skills']);
  }

  // optionnel (si ton HTML a un bouton modifier)
  goEdit(id?: number): void {
    if (!id) return;
    // si tu n'as pas encore une page edit, tu peux laisser vide
    alert("Edit proof pas encore implémenté.");
  }

  remove(id?: number): void {
    if (!id) return;
    if (!confirm('Supprimer ce proof ?')) return;

    this.proofsService.delete(id).subscribe({
      next: () => this.load(),
      error: (err: any) => {
        console.error(err);
        this.errorMessage = "Suppression échouée. Vérifiez l'API backend.";
      },
    });
  }
}
