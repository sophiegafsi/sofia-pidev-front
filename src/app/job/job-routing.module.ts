import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { JobCreateComponent } from './job-create.component';

const routes: Routes = [
  { path: 'create', component: JobCreateComponent }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class JobRoutingModule { }