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
  { path: '**', redirectTo: '' }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
