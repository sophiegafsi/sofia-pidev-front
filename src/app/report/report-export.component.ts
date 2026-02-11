import { Component } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-report-export',
  templateUrl: './report-export.component.html',
  styleUrls: ['./report-export.component.css']
})
export class ReportExportComponent {
  constructor(private router: Router) {}

  exportAs(format: string) {
    alert(`Exporting report as ${format.toUpperCase()}...`);
    // Implémentez l'export réel ici
  }

  goBack() {
    this.router.navigate(['/dashboard']);
  }
}