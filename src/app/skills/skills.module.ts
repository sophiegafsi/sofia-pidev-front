import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

import { SkillsRoutingModule } from './skills-routing.module';
import { SkillsListComponent } from './ui/skills-list/skills-list.component';
import { SkillFormComponent } from './ui/skill-form/skill-form.component';

@NgModule({
  declarations: [SkillsListComponent, SkillFormComponent],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    SkillsRoutingModule
  ],
})
export class SkillsModule {}
