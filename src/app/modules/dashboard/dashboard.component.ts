import { Component, OnInit } from '@angular/core';
import { DashboardService } from './dashboard.service';
import { DashboardStats } from './dashboard.model';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css']
})
export class DashboardComponent implements OnInit {
  stats!: DashboardStats;

  constructor(private dashboardService: DashboardService) {}

  ngOnInit(): void {
    this.dashboardService.getStats().subscribe((data: DashboardStats) => {
      this.stats = data;
    });
  }
}