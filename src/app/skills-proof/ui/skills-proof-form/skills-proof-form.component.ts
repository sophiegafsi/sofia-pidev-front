import { Component, OnInit } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { SkillsService } from '../../../skills/services/skills.service';
import { Skill } from '../../../skills/models/skill.model';
import { PROOF_TYPE_OPTIONS, SkillProof } from '../../models/skill-proof.model';
import { SkillsProofService } from '../../services/skills-proof.service';

@Component({
  selector: 'app-skills-proof-form',
  templateUrl: './skills-proof-form.component.html',
  styleUrls: ['./skills-proof-form.component.css'],
})


export class ProofFormComponent implements OnInit {
  skills: Skill[] = [];
  proofTypes = PROOF_TYPE_OPTIONS;
  saving = false;
  errorMessage = '';

  form: any;

  constructor(
    private fb: FormBuilder,
    private skillsService: SkillsService,
    private proofsService: SkillsProofService,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.form = this.fb.group({
      skillId: [null, [Validators.required]],
      title: ['', [Validators.required, Validators.minLength(2)]],
      type: ['CERTIFICATE', [Validators.required]],
      fileUrl: ['', [Validators.required]],
    });

    // charger skills
    this.skillsService.getAll().subscribe({
      next: (data) => (this.skills = data || []),
      error: (e) => console.error(e),
    });

    // si on vient depuis un skill spécifique
    const skillId = this.route.snapshot.queryParamMap.get('skillId');
    if (skillId) this.form.patchValue({ skillId: Number(skillId) });
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.saving = true;
    this.errorMessage = '';

    const skillId = Number(this.form.value.skillId);
    const proof: SkillProof = {
      title: this.form.value.title,
      type: this.form.value.type,
      fileUrl: this.form.value.fileUrl,
    };

    this.proofsService.createForSkill(skillId, proof).subscribe({
      next: () => {
        this.saving = false;
        this.router.navigate(['/skills-proof/skill', skillId]);

      },
      error: (err) => {
        console.error(err);
        this.errorMessage = `Ajout proof échoué (HTTP ${err?.status ?? '??'}).`;
        this.saving = false;
      },
    });
  }

  back(): void {
    this.router.navigate(['/skills']);
  }
}
