import { Component, OnInit } from '@angular/core';
import { AbstractControl, FormBuilder, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { finalize } from 'rxjs';
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
  proofTypes = PROOF_TYPE_OPTIONS;
  saving = false;
  errorMessage = '';
  selectedSkillId?: number;
  selectedSkillName = '';
  proofId?: number;
  skillLocked = false;
  imagePreviewUrl = '';
  private objectUrlToRevoke = '';
  selectedFile?: File;

  form: any;
  readonly titleMaxLength = 120;
  readonly maxImageBytes = 2 * 1024 * 1024; // 2MB

  constructor(
    private fb: FormBuilder,
    private skillsService: SkillsService,
    private proofsService: SkillsProofService,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.form = this.fb.group({
      skillId: [null, [Validators.required, ProofFormComponent.positiveIntValidator()]],
      title: [
        '',
        [
          Validators.required,
          ProofFormComponent.trimmedMinLengthValidator(2),
          ProofFormComponent.lettersOnlyValidator(),
          Validators.maxLength(this.titleMaxLength),
        ],
      ],
      type: ['CERTIFICATE', [Validators.required, ProofFormComponent.oneOfValidator(this.proofTypes)]],
      expiresAt: ['', [ProofFormComponent.optionalIsoDateValidator()]],
      fileUrl: [''], // used in edit mode to keep existing file url (and for backend payload)
      proofFile: [null, [ProofFormComponent.imageFileValidator(this.maxImageBytes)]],
    });

    const editId = this.parsePositiveInt(this.route.snapshot.paramMap.get('id'));
    if (editId) {
      this.proofId = editId;
      this.skillLocked = true;
      this.loadForEdit(editId);
      return;
    }

    // If user comes from a specific skill card, bind proof to that skill automatically.
    const skillIdParam = this.route.snapshot.queryParamMap.get('skillId');
    if (skillIdParam) {
      const parsed = this.parsePositiveInt(skillIdParam);
      if (!parsed) {
        this.errorMessage = "Invalid 'skillId' parameter in the URL.";
        return;
      }

      this.skillLocked = true;
      this.selectedSkillId = parsed;
      this.form.patchValue({ skillId: this.selectedSkillId });
      this.form.get('skillId')?.disable();

      this.skillsService.getById(this.selectedSkillId).subscribe({
        next: (s: Skill) => (this.selectedSkillName = s?.name || ''),
        error: (e) => console.error(e),
      });
    } else {
      this.bindSkillPreview();
    }
  }

  submit(): void {
    this.errorMessage = '';
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.saving = true;

    const skillId = this.parsePositiveInt(this.form.getRawValue().skillId);
    if (!skillId) {
      this.saving = false;
      this.errorMessage = 'Invalid Skill ID (must be an integer > 0).';
      return;
    }

    if (!this.proofId && !this.selectedFile) {
      this.saving = false;
      this.errorMessage = 'Photo is required.';
      return;
    }

    const proof: SkillProof = {
      id: this.proofId,
      title: String(this.form.value.title || '').trim(),
      type: this.form.value.type,
      fileUrl: String(this.form.value.fileUrl || '').trim(),
      expiresAt: ProofFormComponent.normalizeIsoDateOnly(this.form.value.expiresAt),
      skillId,
    };

    const doSave = () => {
      const req = this.proofId
        ? this.proofsService.update(proof)
        : this.proofsService.uploadForSkill(skillId, proof.title, proof.type, this.selectedFile as File, proof.expiresAt);

      req
        .pipe(finalize(() => (this.saving = false)))
        .subscribe({
          next: () => this.router.navigate(['/skills-proof/skill', skillId]),
          error: (err) => {
            console.error(err);
            const action = this.proofId ? 'Update' : 'Create';
            this.errorMessage = `${action} proof failed (HTTP ${err?.status ?? '??'}).`;
          },
        });
    };

    // Create mode: refuse to add a proof if the skill doesn't exist.
    if (!this.proofId) {
      this.skillsService.getById(skillId).subscribe({
        next: () => doSave(),
        error: (err) => {
          console.error(err);
          this.saving = false;
          this.errorMessage = `Skill #${skillId} not found. Create the skill before adding a proof.`;
        },
      });
      return;
    }

    // Edit mode: skillId comes from the existing proof and is locked.
    doSave();
  }

  back(): void {
    const skillId = this.parsePositiveInt(this.form?.getRawValue?.().skillId);
    if (skillId) {
      this.router.navigate(['/skills-proof/skill', skillId]);
      return;
    }
    this.router.navigate(['/skills-proof']);
  }

  hasError(controlName: string, errorKey: string): boolean {
    const c = this.form?.get(controlName);
    return !!c && (c.touched || c.dirty) && c.hasError(errorKey);
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement | null;
    const file = input?.files?.[0];

    if (!file) return;

    if (!file.type?.startsWith('image/')) {
      this.form.get('proofFile')?.setErrors({ imageFile: true });
      this.imagePreviewUrl = '';
      this.selectedFile = undefined;
      return;
    }

    if (file.size > this.maxImageBytes) {
      this.form.get('proofFile')?.setErrors({ imageTooLarge: true });
      this.imagePreviewUrl = '';
      this.selectedFile = undefined;
      return;
    }

    this.selectedFile = file;
    this.form.patchValue({ proofFile: file });
    this.form.get('proofFile')?.markAsDirty();
    this.form.get('proofFile')?.updateValueAndValidity();

    if (this.objectUrlToRevoke) URL.revokeObjectURL(this.objectUrlToRevoke);
    this.objectUrlToRevoke = URL.createObjectURL(file);
    this.imagePreviewUrl = this.objectUrlToRevoke;
  }

  clearImage(): void {
    this.selectedFile = undefined;
    this.imagePreviewUrl = '';
    this.form.patchValue({ proofFile: null });
    this.form.get('proofFile')?.markAsDirty();
    this.form.get('proofFile')?.updateValueAndValidity();
    if (this.objectUrlToRevoke) URL.revokeObjectURL(this.objectUrlToRevoke);
    this.objectUrlToRevoke = '';
  }

  private parsePositiveInt(value: unknown): number | undefined {
    const n = typeof value === 'number' ? value : Number(String(value ?? '').trim());
    if (!Number.isInteger(n) || n <= 0) return undefined;
    return n;
  }

  private loadForEdit(id: number): void {
    this.saving = true;
    this.proofsService.getById(id).subscribe({
      next: (p) => {
        this.saving = false;

        const skillId = this.parsePositiveInt(p.skillId ?? p.skill?.id);
        if (skillId) {
          this.selectedSkillId = skillId;
          this.form.patchValue({ skillId });
          this.skillLocked = true;
          this.form.get('skillId')?.disable({ emitEvent: false });

          this.skillsService.getById(skillId).subscribe({
            next: (s: Skill) => (this.selectedSkillName = s?.name || ''),
            error: (e) => console.error(e),
          });
        }

        this.form.patchValue({
          title: p.title ?? '',
          type: p.type ?? 'OTHER',
          fileUrl: p.fileUrl ?? '',
          expiresAt: ProofFormComponent.normalizeIsoDateOnly((p as SkillProof).expiresAt),
        });

        const url = String(p.fileUrl ?? '');
        this.imagePreviewUrl = ProofFormComponent.isImageProofUrl(url) ? url : '';

        // In edit mode, the photo is optional (we keep the existing fileUrl).
        const fileCtrl = this.form.get('proofFile');
        fileCtrl?.clearValidators();
        fileCtrl?.setValidators([ProofFormComponent.optionalImageFileValidator(this.maxImageBytes)]);
        fileCtrl?.setValue(null);
        fileCtrl?.updateValueAndValidity();
      },
      error: (err) => {
        console.error(err);
        this.saving = false;
        this.errorMessage = `Unable to load the proof (HTTP ${err?.status ?? '??'}).`;
      },
    });
  }

  private bindSkillPreview(): void {
    const ctrl = this.form?.get('skillId');
    if (!ctrl) return;

    ctrl.valueChanges.subscribe((value: unknown) => {
      const id = this.parsePositiveInt(value);
      this.selectedSkillId = id;
      this.selectedSkillName = '';
      if (!id) return;

      this.skillsService.getById(id).subscribe({
        next: (s: Skill) => (this.selectedSkillName = s?.name || ''),
        error: () => (this.selectedSkillName = ''),
      });
    });
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

  private static positiveIntValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const raw = control.value;
      if (raw === null || raw === undefined || raw === '') return null; // let required() handle empties
      const n = Number(String(raw).trim());
      if (!Number.isInteger(n) || n <= 0) return { positiveInt: true };
      return null;
    };
  }

  private static lettersOnlyValidator(): ValidatorFn {
    const pattern = /^[\p{L}][\p{L}\s'’-]*$/u;
    return (control: AbstractControl): ValidationErrors | null => {
      const raw = control.value;
      if (raw === null || raw === undefined) return null;
      const v = String(raw).trim();
      if (!v) return null; // let required() handle empties
      return pattern.test(v) ? null : { lettersOnly: true };
    };
  }

  private static urlHttpValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const raw = control.value;
      if (raw === null || raw === undefined) return null;
      const v = String(raw).trim();
      if (!v) return null; // let required() handle empties

      try {
        const u = new URL(v);
        const protocol = (u.protocol || '').toLowerCase();
        if (protocol !== 'http:' && protocol !== 'https:') return { urlHttp: true };
        if (!u.hostname) return { urlHttp: true };
        return null;
      } catch {
        return { urlHttp: true };
      }
    };
  }

  private static isImageProofUrl(value: string): boolean {
    const v = (value || '').trim();
    if (!v) return false;
    if (v.startsWith('data:image/')) return true;
    return /\.(png|jpe?g|gif|webp|bmp|svg)(\?.*)?$/i.test(v);
  }

  private static imageFileValidator(maxBytes: number): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const raw = control.value as File | null;
      if (!raw) return { required: true };
      if (!raw.type?.startsWith('image/')) return { imageFile: true };
      if (raw.size > maxBytes) return { imageTooLarge: true };
      return null;
    };
  }

  private static optionalImageFileValidator(maxBytes: number): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const raw = control.value as File | null;
      if (!raw) return null;
      if (!raw.type?.startsWith('image/')) return { imageFile: true };
      if (raw.size > maxBytes) return { imageTooLarge: true };
      return null;
    };
  }

  private static oneOfValidator(options: readonly string[]): ValidatorFn {
    const set = new Set(options);
    return (control: AbstractControl): ValidationErrors | null => {
      const raw = control.value;
      if (raw === null || raw === undefined || raw === '') return null; // let required() handle empties
      return set.has(String(raw)) ? null : { oneOf: true };
    };
  }

  private static optionalIsoDateValidator(): ValidatorFn {
    const pattern = /^\d{4}-\d{2}-\d{2}$/;
    return (control: AbstractControl): ValidationErrors | null => {
      const raw = control.value;
      if (raw === null || raw === undefined) return null;
      const v = String(raw).trim();
      if (!v) return null;
      return pattern.test(v) ? null : { isoDate: true };
    };
  }

  private static normalizeIsoDateOnly(value: unknown): string | undefined {
    const v = String(value ?? '').trim();
    if (!v) return undefined;
    const candidate = v.includes('T') ? v.slice(0, 10) : v;
    return /^\d{4}-\d{2}-\d{2}$/.test(candidate) ? candidate : undefined;
  }
}
