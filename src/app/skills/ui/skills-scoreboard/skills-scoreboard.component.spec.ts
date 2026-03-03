import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SkillsScoreboardComponent } from './skills-scoreboard.component';

describe('SkillsScoreboardComponent', () => {
  let component: SkillsScoreboardComponent;
  let fixture: ComponentFixture<SkillsScoreboardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [SkillsScoreboardComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SkillsScoreboardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
