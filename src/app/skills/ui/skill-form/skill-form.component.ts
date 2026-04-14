import { Component, OnInit } from '@angular/core';
import { AbstractControl, FormBuilder, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';
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
  readonly nameMaxLength = 80;
  readonly descriptionMaxLength = 800;

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private skillsService: SkillsService
  ) {}

  ngOnInit(): void {
    this.form = this.fb.group({
      name: [
        '',
        [
          Validators.required,
          SkillFormComponent.trimmedMinLengthValidator(2),
          SkillFormComponent.containsLetterValidator(),
          Validators.maxLength(this.nameMaxLength),
        ],
      ],
      level: ['BEGINNER', [Validators.required]],
      yearsOfExperience: [0, [Validators.required, SkillFormComponent.nonNegativeIntValidator(0, 80)]],
      description: [
        '',
        [
          Validators.required,
          SkillFormComponent.trimmedMinLengthValidator(5),
          Validators.maxLength(this.descriptionMaxLength),
        ],
      ],
    });

    const p = this.route.snapshot.paramMap.get('id');
    if (p) {
      this.id = Number(p);
      this.skillsService.getById(this.id).subscribe({
        next: (s) => this.form.patchValue(s),
        error: (e: unknown) => console.error(e),
      });
    }
  }

  hasError(controlName: string, errorKey: string): boolean {
    const c = this.form?.get(controlName);
    return !!c && (c.touched || c.dirty) && c.hasError(errorKey);
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.errorMessage = 'Please fill in all fields correctly.';
      return;
    }

    this.saving = true;
    this.errorMessage = '';

    const payload: Skill = {
      id: this.id,
      name: String(this.form.value.name || '').trim(),
      level: this.form.value.level,
      yearsOfExperience: Number(String(this.form.value.yearsOfExperience ?? '').trim() || 0),
      description: String(this.form.value.description || '').trim(),
    };

    const nameNorm = payload.name.toLowerCase();

    // Check uniqueness client-side so we can show a clear message even if backend returns 500 generic.
    this.skillsService.search(payload.name, 0, 200, 'name', 'asc').subscribe({
      next: (res) => {
        const exists = (res.content || []).some((s) => {
          const sameName = String(s.name || '').trim().toLowerCase() === nameNorm;
          const otherId = this.id ? Number(s.id ?? 0) !== this.id : true;
          return sameName && otherId;
        });

        if (exists) {
          this.errorMessage = 'This skill name already exists. Choose another name.';
          this.saving = false;
          return;
        }

        const req = this.id ? this.skillsService.update(payload) : this.skillsService.create(payload);
        req.subscribe({
          next: () => {
            this.saving = false;
            this.router.navigate(['/skills']);
          },
          error: (err: unknown) => {
            console.error(err);
            this.errorMessage = this.formatSaveError(err);
            this.saving = false;
          },
        });
      },
      error: (_err: unknown) => {
        // If search endpoint isn't available, fall back to backend validation.
        const req = this.id ? this.skillsService.update(payload) : this.skillsService.create(payload);
        req.subscribe({
          next: () => {
            this.saving = false;
            this.router.navigate(['/skills']);
          },
          error: (err: unknown) => {
            console.error(err);
            this.errorMessage = this.formatSaveError(err);
            this.saving = false;
          },
        });
      },
    });
  }

  back(): void {
    this.router.navigate(['/skills']);
  }

  private formatSaveError(err: unknown): string {
    const e = err as any;
    const status = e?.status;

    const extract = (v: unknown): string => (typeof v === 'string' ? v : '');
    const tryJson = (v: unknown): string => {
      try {
        return v && typeof v === 'object' ? JSON.stringify(v) : '';
      } catch {
        return '';
      }
    };

    const candidates = [
      extract(e?.error),
      extract(e?.error?.text), // HttpClient fallback when responseType is 'text'
      extract(e?.error?.message),
      extract(e?.error?.error?.message), // Sometimes nested (e.g., parsing error wrappers)
      extract(e?.error?.error),
      extract(e?.error?.details),
      extract(e?.message),
      tryJson(e?.error),
    ]
      .map((x) => String(x || '').trim())
      .filter(Boolean);

    const joined = candidates.join(' | ');
    if (/already\s+exist|already\s+exists|duplicate|constraint|unique|existe\s+d[ée]j[aà]/i.test(joined)) {
      return 'This skill name already exists. Choose another name.';
    }

    if (/\buser_id\b/i.test(joined) && /default\s+value|cannot\s+be\s+null|not\s+null|must\s+not\s+be\s+null/i.test(joined)) {
      return "Backend error: `user_id` is required. If you're testing without users, make `skills.user_id` nullable (or remove it) on the backend/database.";
    }

    const msg = candidates.find((x) => x.toLowerCase() !== 'internal server error');
    if (msg) return msg;

    return typeof status === 'number' ? `Server error (HTTP ${status}).` : 'Server error.';
  }

  private static trimmedMinLengthValidator(min: number): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const raw = control.value;
      if (raw === null || raw === undefined) return null;
      const v = String(raw).trim();
      if (v.length === 0) return null; // let required() handle empties
      return v.length < min ? { trimmedMinLength: { requiredLength: min, actualLength: v.length } } : null;
    };
  }

  private static containsLetterValidator(): ValidatorFn {
    const hasLetter = /\p{L}/u;
    return (control: AbstractControl): ValidationErrors | null => {
      const raw = control.value;
      if (raw === null || raw === undefined) return null;
      const v = String(raw).trim();
      if (!v) return null; // let required() handle empties
      return hasLetter.test(v) ? null : { containsLetter: true };
    };
  }

  private static nonNegativeIntValidator(min: number, max: number): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const raw = control.value;
      if (raw === null || raw === undefined || raw === '') return null; // let required() handle empties
      const n = Number(String(raw).trim());
      if (!Number.isFinite(n) || !Number.isInteger(n)) return { int: true };
      if (n < min) return { min: { min, actual: n } };
      if (n > max) return { max: { max, actual: n } };
      return null;
    };
  }
}
