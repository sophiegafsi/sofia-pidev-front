import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

import { SkillsProofRoutingModule } from './skills-proof-routing.module';
import { ProofFormComponent } from './ui/skills-proof-form/skills-proof-form.component';
import { SkillsProofListComponent } from './ui/skills-proof-list/skills-proof-list.component';

@NgModule({
  declarations: [
    ProofFormComponent,
    SkillsProofListComponent
  ],
  imports: [
    CommonModule,
    FormsModule,          // ✅ pour ngModel / ngValue
    ReactiveFormsModule,  // ✅ pour formGroup
    SkillsProofRoutingModule
  ],
})
export class SkillsProofModule {}
