import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Skill } from '../models/skill.model';

@Injectable({ providedIn: 'root' })
export class SkillsService {
  private readonly baseUrl = 'http://localhost:8086/skills';

  constructor(private http: HttpClient) {}

  getAll(): Observable<Skill[]> {
    return this.http.get<Skill[]>(`${this.baseUrl}/getall`);
  }

  getById(id: number): Observable<Skill> {
    return this.http.get<Skill>(`${this.baseUrl}/${id}`);
  }

  create(skill: Skill): Observable<Skill> {
    return this.http.post<Skill>(`${this.baseUrl}/add`, skill);
  }

  update(skill: Skill): Observable<Skill> {
    return this.http.put<Skill>(`${this.baseUrl}/update`, skill);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }
}
