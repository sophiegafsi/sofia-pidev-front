import { Component, OnInit } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Skill, SkillLevel } from '../../models/skill.model';
import { SkillsService } from '../../services/skills.service';

@Component({
  selector: 'app-skill-form',
  templateUrl: './skill-form.component.html',
  styleUrls: ['./skill-form.component.css'],
})
export class SkillFormComponent implements OnInit {
  id?: number;
  saving = false;
  errorMessage = '';
  levels: SkillLevel[] = ['BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'EXPERT'];

  form: any;

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private skillsService: SkillsService
  ) {}

  ngOnInit(): void {
    this.form = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(2)]],
      level: ['BEGINNER', [Validators.required]],
      yearsOfExperience: [0, [Validators.min(0)]],
      description: [''],
    });

    const p = this.route.snapshot.paramMap.get('id');
    if (p) {
      this.id = Number(p);
      this.skillsService.getById(this.id).subscribe({
        next: (s) => this.form.patchValue(s),
        error: (e) => console.error(e),
      });
    }
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.saving = true;
    this.errorMessage = '';

    const payload: Skill = {
      id: this.id,
      name: this.form.value.name,
      level: this.form.value.level,
      yearsOfExperience: Number(this.form.value.yearsOfExperience || 0),
      description: this.form.value.description || '',
    };

    const req = this.id ? this.skillsService.update(payload) : this.skillsService.create(payload);

    req.subscribe({
      next: () => {
        this.saving = false;
        this.router.navigate(['/skills']);
      },
      error: (err) => {
        console.error(err);
        this.errorMessage = `Enregistrement skill échoué (HTTP ${err?.status ?? '??'}).`;
        this.saving = false;
      },
    });
  }

  back(): void {
    this.router.navigate(['/skills']);
  }
}
