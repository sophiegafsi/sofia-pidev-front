import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AccueilComponent } from './accueil/accueil.component';
import { ProfileJobComponent } from './profile-job/profile-job.component';
import { ProfileFreelancerComponent } from './profile-freelancer/profile-freelancer.component';

const routes: Routes = [
  { path: '', component: AccueilComponent },
  { path: 'accueil', component: AccueilComponent },
  { path: 'profile-job', component: ProfileJobComponent },
  { path: 'profile-freelancer', component: ProfileFreelancerComponent },
  { path: 'skills', loadChildren: () => import('./skills/skills.module').then((m) => m.SkillsModule) },
  { path: 'skills-proof', loadChildren: () => import('./skills-proof/skills-proof.module').then(m => m.SkillsProofModule) },
  { path: 'portfolio', loadChildren: () => import('./portfolio/portfolio.module').then((m) => m.PortfolioModule) },

  { path: 'skills-proof', loadChildren: () => import('./skills-proof/skills-proof.module').then((m) => m.SkillsProofModule) },
  { path: '**', redirectTo: '' },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule],
})
export class AppRoutingModule {}
