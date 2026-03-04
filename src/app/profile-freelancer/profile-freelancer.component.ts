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
    title: 'Full Stack Web Developer',
    image: 'https://via.placeholder.com/200x200?text=Thomas+Dubois',
    about: "With over 7 years of experience, Thomas Dubois has built SaaS applications for startups and solutions for large enterprises. He enjoys working on team projects and frontend development, notably with React.js and Node.js.",
    rate: 50,
    rateUnit: '/h',
    rating: 5,
    ratingCount: 1,
    ratingText: 'Everything is going well and Thomas Dubois is available to discuss and move the product forward.'
  };

  skills: Skill[] = [
    { name: 'HTML' },
    { name: 'CSS' },
    { name: 'React' },
    { name: 'Node.js' }
  ];

  projects: Project[] = [
    {
      title: 'Full Stack Web Developer',
      description: 'Built SaaS applications for startups and solutions for large enterprises.',
      image: 'https://via.placeholder.com/300x200?text=Project+1'
    },
    {
      title: 'Full Stack Web Developer',
      description: 'Built SaaS applications for startups and solutions for large enterprises.',
      image: 'https://via.placeholder.com/300x200?text=Project+2'
    },
    {
      title: 'Full Stack Web Developer',
      description: 'Built SaaS applications for startups and solutions for large enterprises.',
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
