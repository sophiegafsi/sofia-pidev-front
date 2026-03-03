import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { ProofFormComponent } from './ui/skills-proof-form/skills-proof-form.component';
import { SkillsProofListComponent } from './ui/skills-proof-list/skills-proof-list.component';

const routes: Routes = [
  { path: 'new', component: ProofFormComponent },
  { path: 'edit/:id', component: ProofFormComponent },
  { path: 'list', component: SkillsProofListComponent },
  { path: 'skill/:skillId', component: SkillsProofListComponent },
  { path: '', redirectTo: 'list', pathMatch: 'full' },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class SkillsProofRoutingModule {}
