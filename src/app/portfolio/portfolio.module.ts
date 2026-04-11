import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

import { PortfolioRoutingModule } from './portfolio-routing.module';
import { PortfolioAnalyticsComponent } from './ui/portfolio-analytics/portfolio-analytics.component';
import { PortfolioDetailComponent } from './ui/portfolio-detail/portfolio-detail.component';
import { PortfolioFormComponent } from './ui/portfolio-form/portfolio-form.component';
import { PortfolioListComponent } from './ui/portfolio-list/portfolio-list.component';

@NgModule({
  declarations: [
    PortfolioAnalyticsComponent,
    PortfolioDetailComponent,
    PortfolioFormComponent,
    PortfolioListComponent
  ],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    PortfolioRoutingModule
  ],
})
export class PortfolioModule {}
