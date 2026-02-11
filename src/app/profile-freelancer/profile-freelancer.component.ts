import { Component } from '@angular/core';

interface Skill {
  name: string;
}

interface Project {
  title: string;
  description: string;
  image: string;
}

@Component({
  selector: 'app-profile-freelancer',
  templateUrl: './profile-freelancer.component.html',
  styleUrls: ['./profile-freelancer.component.css']
})
export class ProfileFreelancerComponent {
  freelancer = {
    name: 'Thomas Dubois',
    title: 'Développeur Web Full Stack',
    image: 'https://via.placeholder.com/200x200?text=Thomas+Dubois',
    about: 'Fort de plus de 7 ans d\'expérience, Thomas Dubois a développé des applications SaaS pour des startups et des solutions pour de grandes entreprises. Il reconnaître le travail sur des projets avec des équipes et développement frontend, notamment avec React.js et Node.js.',
    rate: 50,
    rateUnit: '/h',
    rating: 5,
    ratingCount: 1,
    ratingText: 'Tout se passe bien et Thomas Dubois se rend disponible pour échanger et faire avancer le produit.'
  };

  skills: Skill[] = [
    { name: 'HTML' },
    { name: 'CSS' },
    { name: 'React' },
    { name: 'Node.js' }
  ];

  projects: Project[] = [
    {
      title: 'Développeur Web Full Stack',
      description: 'Développé des applications SaaS pour des startups et des solutions pour de grandes entreprises.',
      image: 'https://via.placeholder.com/300x200?text=Project+1'
    },
    {
      title: 'Développeur Web Full Stack',
      description: 'Développé des applications SaaS pour des startups et des solutions pour de grandes entreprises.',
      image: 'https://via.placeholder.com/300x200?text=Project+2'
    },
    {
      title: 'Développeur Web Full Stack',
      description: 'Développé des applications SaaS pour des startups et des solutions pour de grandes entreprises.',
      image: 'https://via.placeholder.com/300x200?text=Project+3'
    }
  ];

  contactFreelancer(): void {
    console.log('Contact freelancer:', this.freelancer.name);
  }

  postJob(): void {
    console.log('Post a job');
  }
}
