import { Component, DestroyRef, OnInit, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AbstractControl, FormBuilder, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Achievement } from '../../models/portfolio.model';
import { PortfolioService } from '../../services/portfolio.service';
import { PortfolioTheme, PortfolioThemeService } from '../../services/portfolio-theme.service';

type TranslationTarget =
  | 'ENGLISH'
  | 'FRENCH'
  | 'SPANISH'
  | 'GERMAN'
  | 'ITALIAN'
  | 'PORTUGUESE'
  | 'ARABIC';

@Component({
  selector: 'app-portfolio-form',
  templateUrl: './portfolio-form.component.html',
  styleUrls: ['./portfolio-form.component.css'],
})
export class PortfolioFormComponent implements OnInit {
  private readonly destroyRef = inject(DestroyRef);

  id?: number;
  saving = false;
  errorMessage = '';
  toolMessage = '';
  springAiFeedback = '';
  springAiProvider = '';
  toolAction: 'rewrite' | 'translate' | 'mask' | 'review' | '' = '';
  theme: PortfolioTheme = 'dark';
  form: any;

  lastDescriptionSnapshot = '';
  selectedTargetLanguage: TranslationTarget = 'ENGLISH';
  readonly translationTargets: Array<{ value: TranslationTarget; label: string }> = [
    { value: 'ENGLISH', label: 'English' },
    { value: 'FRENCH', label: 'French' },
    { value: 'SPANISH', label: 'Spanish' },
    { value: 'GERMAN', label: 'German' },
    { value: 'ITALIAN', label: 'Italian' },
    { value: 'PORTUGUESE', label: 'Portuguese' },
    { value: 'ARABIC', label: 'Arabic' },
  ];

  readonly titleMaxLength = 120;
  readonly descriptionMaxLength = 1000;

  constructor(
    private fb: FormBuilder,
    private portfolioService: PortfolioService,
    private route: ActivatedRoute,
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

    const routeId = this.route.snapshot.paramMap.get('id');
    if (routeId) {
      this.id = Number(routeId);
      if (Number.isFinite(this.id) && this.id > 0) {
        this.loadForEdit(this.id);
      }
    }
  }

  get isEditMode(): boolean {
    return Number.isFinite(this.id) && Number(this.id) > 0;
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
    this.toolMessage = '';
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.errorMessage = 'Please fill in all fields correctly.';
      return;
    }

    this.saving = true;

    const payload: Achievement = {
      id: this.id,
      title: String(this.form.value.title || '').trim(),
      description: String(this.form.value.description || '').trim(),
      completionDate: String(this.form.value.completionDate || '').trim(),
      freelancerId: Number(this.form.value.freelancerId),
    };

    const request$ = this.isEditMode ? this.portfolioService.updateAchievement(payload) : this.portfolioService.createAchievement(payload);
    request$.subscribe({
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
        const status = (err as { status?: number } | null)?.status;
        if (this.isEditMode || status === 400 || status === 422) {
          this.errorMessage = this.formatSaveError(err, this.isEditMode);
          this.saving = false;
          return;
        }

        this.recoverCreatedAchievement(payload, err);
      },
    });
  }

  back(): void {
    this.router.navigate(['/portfolio']);
  }

  rewriteDescription(): void {
    const description = this.currentDescription();
    if (!description) {
      this.toolMessage = 'Write a description first to use the AI writing tools.';
      return;
    }

    this.lastDescriptionSnapshot = description;
    this.toolAction = 'rewrite';
    this.toolMessage = '';

    this.portfolioService.rewriteAchievementText(description).subscribe({
      next: (result) => {
        const transformed = String(result.transformedText || '').trim();
        if (transformed) {
          this.setDescription(transformed);
        }
        this.toolAction = '';
        this.toolMessage =
          transformed && transformed !== description
            ? 'Description corrected and reformulated professionally.'
            : 'No rewrite suggestion for this sentence.';
      },
      error: (err) => {
        console.error(err);
        this.toolAction = '';
        const status = err?.status ? ` (HTTP ${err.status})` : '';
        this.toolMessage = `Unable to polish the description${status}.`;
      },
    });
  }

  translateDescription(): void {
    const description = this.currentDescription();
    if (!description) {
      this.toolMessage = 'Write a description first to translate it.';
      return;
    }

    this.lastDescriptionSnapshot = description;
    this.toolAction = 'translate';
    this.toolMessage = '';

    this.portfolioService.translateAchievementText(description, this.selectedTargetLanguage).subscribe({
      next: (result) => {
        const transformed = String(result.transformedText || '').trim();
        if (transformed) {
          this.setDescription(transformed);
        }
        this.toolAction = '';
        this.toolMessage =
          transformed && transformed !== description
            ? `Description translated to ${this.selectedTargetLanguageLabel()}.`
            : 'No translation change was produced for this sentence.';
      },
      error: (err) => {
        console.error(err);
        this.toolAction = '';
        const status = err?.status ? ` (HTTP ${err.status})` : '';
        this.toolMessage = `Unable to translate the description${status}.`;
      },
    });
  }

  maskDescription(): void {
    const description = this.currentDescription();
    if (!description) {
      this.toolMessage = 'Write a description first to sanitize it.';
      return;
    }

    this.lastDescriptionSnapshot = description;
    this.toolAction = 'mask';
    this.toolMessage = '';

    this.portfolioService.maskAchievementText(description).subscribe({
      next: (result) => {
        const transformed = String(result.transformedText || '').trim();
        if (transformed) {
          this.setDescription(transformed);
        }
        this.toolAction = '';
        this.toolMessage =
          transformed && transformed !== description
            ? 'Blocked words were detected dynamically and masked.'
            : 'No blocked word was found in the description.';
      },
      error: (err) => {
        console.error(err);
        this.toolAction = '';
        const status = err?.status ? ` (HTTP ${err.status})` : '';
        this.toolMessage = `Unable to sanitize the description${status}.`;
      },
    });
  }

  reviewDescriptionWithSpringAi(): void {
    const title = this.currentTitle();
    const description = this.currentDescription();
    if (!title && !description) {
      this.toolMessage = 'Write a title or description first to use the Spring AI review.';
      return;
    }

    this.toolAction = 'review';
    this.toolMessage = '';
    this.springAiFeedback = '';
    this.springAiProvider = '';

    this.portfolioService.getSpringAiReview(title, description).subscribe({
      next: (result) => {
        this.toolAction = '';
        this.springAiFeedback = String(result.feedback || '').trim();
        this.springAiProvider = [result.provider, result.model].filter(Boolean).join(' - ');
        this.toolMessage = result.fallbackUsed
          ? 'Spring AI local server is not available, so the safe local fallback generated the review.'
          : 'Spring AI local review generated successfully.';
      },
      error: (err) => {
        console.error(err);
        this.toolAction = '';
        const status = err?.status ? ` (HTTP ${err.status})` : '';
        this.toolMessage = `Unable to run the Spring AI review${status}.`;
      },
    });
  }

  undoDescriptionTool(): void {
    if (!this.lastDescriptionSnapshot) {
      return;
    }

    this.setDescription(this.lastDescriptionSnapshot);
    this.toolMessage = 'Previous description restored.';
    this.lastDescriptionSnapshot = '';
  }

  isToolBusy(action: 'rewrite' | 'translate' | 'mask' | 'review'): boolean {
    return this.toolAction === action;
  }

  selectedTargetLanguageLabel(): string {
    return this.translationTargets.find((item) => item.value === this.selectedTargetLanguage)?.label || 'selected language';
  }

  private loadForEdit(id: number): void {
    this.portfolioService.getAchievementById(id).subscribe({
      next: (achievement) => {
        this.form.patchValue({
          title: achievement.title,
          description: achievement.description,
          completionDate: achievement.completionDate,
          freelancerId: achievement.freelancerId,
        });
      },
      error: (err) => {
        console.error(err);
        this.errorMessage = this.formatSaveError(err, true);
      },
    });
  }

  private formatSaveError(err: unknown, isUpdate: boolean): string {
    const e = err as any;
    const status = e?.status;
    const fieldErrors = e?.error?.fieldErrors;
    if (fieldErrors && typeof fieldErrors === 'object') {
      const first = Object.values(fieldErrors).find((value) => typeof value === 'string' && String(value).trim().length > 0);
      if (first) {
        return String(first).trim();
      }
    }

    const candidates = [
      typeof e?.error === 'string' ? e.error : '',
      typeof e?.error?.message === 'string' ? e.error.message : '',
      typeof e?.message === 'string' ? e.message : '',
    ]
      .map((value) => String(value || '').trim())
      .filter(Boolean);
    const backendMessage = candidates.find((value) => !/http failure response/i.test(value));
    if (backendMessage) {
      return backendMessage;
    }

    const statusText = status ? ` (HTTP ${status})` : '';
    return `${isUpdate ? 'Update' : 'Create'} achievement failed${statusText}. Check portfolio-service through the gateway.`;
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

  private currentDescription(): string {
    return String(this.form?.get('description')?.value || '').trim();
  }

  private currentTitle(): string {
    return String(this.form?.get('title')?.value || '').trim();
  }

  private setDescription(value: string): void {
    this.form?.get('description')?.setValue(String(value || '').trim());
    this.form?.get('description')?.markAsDirty();
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
