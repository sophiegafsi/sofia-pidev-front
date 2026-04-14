import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { PortfolioAnalyticsComponent } from './ui/portfolio-analytics/portfolio-analytics.component';
import { PortfolioDetailComponent } from './ui/portfolio-detail/portfolio-detail.component';
import { PortfolioFormComponent } from './ui/portfolio-form/portfolio-form.component';
import { PortfolioListComponent } from './ui/portfolio-list/portfolio-list.component';

const routes: Routes = [
  { path: '', component: PortfolioListComponent },
  { path: 'analytics', component: PortfolioAnalyticsComponent },
  { path: 'new', component: PortfolioFormComponent },
  { path: 'edit/:id', component: PortfolioFormComponent },
  { path: 'detail/:id', component: PortfolioDetailComponent },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class PortfolioRoutingModule {}
