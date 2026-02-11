import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';

import { JobRoutingModule } from './job-routing.module';
import { JobCreateComponent } from './job-create.component';

@NgModule({
  declarations: [JobCreateComponent],
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    JobRoutingModule
  ]
})
export class JobModule { }