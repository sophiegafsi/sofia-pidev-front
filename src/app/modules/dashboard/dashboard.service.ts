import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { DashboardStats } from './dashboard.model';

@Injectable({
  providedIn: 'root'
})
export class DashboardService {
  getStats(): Observable<DashboardStats> {
    return of({
      totalUsers: 2184,
      usersIncreasePercent: 8,
      activeJobs: 312,
      jobsIncreasePercent: 12,
      applications: 94,
      revenue: 4680,
      revenueIncreasePercent: 5
    });
  }
}