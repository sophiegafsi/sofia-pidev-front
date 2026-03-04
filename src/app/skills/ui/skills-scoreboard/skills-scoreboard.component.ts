import { Component, OnInit } from '@angular/core';
import { SkillsService } from '../../services/skills.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-skills-scoreboard',
  templateUrl: './skills-scoreboard.component.html',
  styleUrls: ['./skills-scoreboard.component.css']
})
export class SkillsScoreboardComponent implements OnInit {

  scores: any[] = [];
  loading = false;
  errorMessage = '';

  constructor(
    private skillsService: SkillsService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading = true;
    this.skillsService.getScoreboard(10).subscribe({
      next: (data) => {
        this.scores = data;
        this.loading = false;
      },
      error: (err) => {
        console.error(err);
        this.errorMessage = 'Unable to load the scoreboard.';
        this.loading = false;
      }
    });
  }

  back(): void {
    this.router.navigate(['/skills']);
  }
}
