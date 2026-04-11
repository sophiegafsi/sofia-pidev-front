import { Component, DestroyRef, OnInit, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AbstractControl, FormBuilder, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { Achievement } from '../../models/portfolio.model';
import { PortfolioService } from '../../services/portfolio.service';
import { PortfolioTheme, PortfolioThemeService } from '../../services/portfolio-theme.service';

@Component({
  selector: 'app-portfolio-form',
  templateUrl: './portfolio-form.component.html',
  styleUrls: ['./portfolio-form.component.css'],
})
export class PortfolioFormComponent implements OnInit {
  private readonly destroyRef = inject(DestroyRef);

  saving = false;
  errorMessage = '';
  theme: PortfolioTheme = 'dark';
  form: any;

  readonly titleMaxLength = 120;
  readonly descriptionMaxLength = 1000;

  constructor(
    private fb: FormBuilder,
    private portfolioService: PortfolioService,
    private router: Router,
    private portfolioThemeService: PortfolioThemeService
  ) {}

  ngOnInit(): void {
    this.portfolioThemeService.init(typeof window !== 'undefined');
    this.theme = this.portfolioThemeService.theme;
    this.portfolioThemeService.theme$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((theme) => (this.theme = theme));

    this.form = this.fb.group({
      title: [
        '',
        [
          Validators.required,
          PortfolioFormComponent.trimmedMinLengthValidator(2),
          PortfolioFormComponent.containsLetterValidator(),
          Validators.maxLength(this.titleMaxLength),
        ],
      ],
      description: [
        '',
        [
          Validators.required,
          PortfolioFormComponent.trimmedMinLengthValidator(5),
          Validators.maxLength(this.descriptionMaxLength),
        ],
      ],
      completionDate: ['', [Validators.required, PortfolioFormComponent.isoDateValidator()]],
      freelancerId: [1, [Validators.required, PortfolioFormComponent.positiveIntValidator()]],
    });
  }

  toggleTheme(): void {
    this.portfolioThemeService.toggleTheme();
  }

  hasError(controlName: string, errorKey: string): boolean {
    const c = this.form?.get(controlName);
    return !!c && (c.touched || c.dirty) && c.hasError(errorKey);
  }

  submit(): void {
    this.errorMessage = '';
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.errorMessage = 'Please fill in all fields correctly.';
      alert('Please fill in all fields correctly before saving.');
      return;
    }

    this.saving = true;

    const payload: Achievement = {
      title: String(this.form.value.title || '').trim(),
      description: String(this.form.value.description || '').trim(),
      completionDate: String(this.form.value.completionDate || '').trim(),
      freelancerId: Number(this.form.value.freelancerId),
    };

    this.portfolioService.createAchievement(payload).subscribe({
      next: (achievement) => {
        this.saving = false;
        if (achievement.id) {
          this.router.navigate(['/portfolio/detail', achievement.id]);
          return;
        }
        setTimeout(() => this.router.navigate(['/portfolio']), 500);
      },
      error: (err) => {
        console.error(err);
        this.recoverCreatedAchievement(payload, err);
      },
    });
  }

  back(): void {
    this.router.navigate(['/portfolio']);
  }

  private recoverCreatedAchievement(payload: Achievement, err: unknown): void {
    const status = (err as { status?: number } | null)?.status;
    this.errorMessage = 'Achievement was submitted. Verifying the backend response...';

    setTimeout(() => {
      this.portfolioService.getAchievements().subscribe({
        next: (rows) => {
          const created = [...(rows || [])]
            .reverse()
            .find((achievement) => this.isSameAchievement(achievement, payload));

          this.saving = false;

          if (created?.id) {
            this.errorMessage = '';
            this.router.navigate(['/portfolio/detail', created.id]);
            return;
          }

          // The backend can save correctly, then fail while serializing the response.
          // In that case we avoid showing a false failure and return to the list.
          this.errorMessage = '';
          setTimeout(() => this.router.navigate(['/portfolio']), 250);
        },
        error: (readErr) => {
          console.error(readErr);
          this.saving = false;
          if (status === 0 || status === 500) {
            this.errorMessage = '';
            setTimeout(() => this.router.navigate(['/portfolio']), 250);
            return;
          }

          const statusText = status ? ` (HTTP ${status})` : '';
          this.errorMessage = `Create achievement failed${statusText}. Check portfolio-service through the gateway.`;
        },
      });
    }, 700);
  }

  private isSameAchievement(a: Achievement, b: Achievement): boolean {
    return (
      String(a.title || '').trim().toLowerCase() === String(b.title || '').trim().toLowerCase() &&
      String(a.description || '').trim().toLowerCase() === String(b.description || '').trim().toLowerCase() &&
      Number(a.freelancerId || 0) === Number(b.freelancerId || 0)
    );
  }

  private static trimmedMinLengthValidator(min: number): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const raw = control.value;
      if (raw === null || raw === undefined) return null;
      const v = String(raw).trim();
      if (v.length === 0) return null;
      return v.length < min ? { trimmedMinLength: { requiredLength: min, actualLength: v.length } } : null;
    };
  }

  private static containsLetterValidator(): ValidatorFn {
    const hasLetter = /\p{L}/u;
    return (control: AbstractControl): ValidationErrors | null => {
      const raw = control.value;
      if (raw === null || raw === undefined) return null;
      const v = String(raw).trim();
      if (!v) return null;
      return hasLetter.test(v) ? null : { containsLetter: true };
    };
  }

  private static positiveIntValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const raw = control.value;
      if (raw === null || raw === undefined || raw === '') return null;
      const n = Number(String(raw).trim());
      if (!Number.isInteger(n) || n <= 0) return { positiveInt: true };
      return null;
    };
  }

  private static isoDateValidator(): ValidatorFn {
    const pattern = /^\d{4}-\d{2}-\d{2}$/;
    return (control: AbstractControl): ValidationErrors | null => {
      const raw = control.value;
      if (raw === null || raw === undefined || raw === '') return null;
      return pattern.test(String(raw).trim()) ? null : { isoDate: true };
    };
  }
}
