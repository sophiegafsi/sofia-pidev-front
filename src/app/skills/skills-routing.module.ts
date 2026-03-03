import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { SkillsListComponent } from './ui/skills-list/skills-list.component';
import { SkillFormComponent } from './ui/skill-form/skill-form.component';
import { SkillsScoreboardComponent } from './ui/skills-scoreboard/skills-scoreboard.component';
const routes: Routes = [
  { path: '', component: SkillsListComponent },
  { path: 'new', component: SkillFormComponent },
  { path: 'edit/:id', component: SkillFormComponent },
  { path: 'scoreboard', component: SkillsScoreboardComponent },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class SkillsRoutingModule {}
