import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { ReportExportComponent } from './report-export.component';

const routes: Routes = [
  { path: 'export', component: ReportExportComponent }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class ReportRoutingModule { }