import { Component } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-job-create',
  templateUrl: './job-create.component.html',
  styleUrls: ['./job-create.component.css']
})
export class JobCreateComponent {
  jobTitle = '';
  jobDescription = '';

  constructor(private router: Router) {}

  onSubmit() {
    alert(`Job "${this.jobTitle}" created successfully!`);
    // Ici vous appelleriez un service pour créer l'offre
    this.router.navigate(['/dashboard']);
  }

  onCancel() {
    this.router.navigate(['/dashboard']);
  }
}