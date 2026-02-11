import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

const routes: Routes = [
  { path: '', redirectTo: '/dashboard', pathMatch: 'full' },
  { path: 'dashboard', loadChildren: () => import('./modules/dashboard/dashboard.module').then(m => m.DashboardModule) },
  { path: 'job', loadChildren: () => import('./job/job.module').then(m => m.JobModule) },
  { path: 'report', loadChildren: () => import('./report/report.module').then(m => m.ReportModule) },

  // Routes temporaires pour la sidebar – à remplacer par de vrais modules plus tard
  { path: 'users', redirectTo: '/dashboard' },
  { path: 'freelancers', redirectTo: '/dashboard' },
  { path: 'clients', redirectTo: '/dashboard' },
  { path: 'jobs', redirectTo: '/dashboard' },
  { path: 'applications', redirectTo: '/dashboard' },
  { path: 'categories', redirectTo: '/dashboard' },
  { path: 'quick-actions', redirectTo: '/dashboard' },
  { path: 'users/new', redirectTo: '/dashboard' }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }