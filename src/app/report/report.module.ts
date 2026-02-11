import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

import { ReportRoutingModule } from './report-routing.module';
import { ReportExportComponent } from './report-export.component';

@NgModule({
  declarations: [ReportExportComponent],
  imports: [
    CommonModule,
    RouterModule,
    ReportRoutingModule
  ]
})
export class ReportModule { }