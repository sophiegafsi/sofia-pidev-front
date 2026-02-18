import { NgModule } from '@angular/core';
import { BrowserModule, provideClientHydration } from '@angular/platform-browser';
import { HttpClientModule } from '@angular/common/http';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { AccueilComponent } from './accueil/accueil.component';
import { ProfileJobComponent } from './profile-job/profile-job.component';
import { ProfileFreelancerComponent } from './profile-freelancer/profile-freelancer.component';

@NgModule({
  declarations: [
    AppComponent,
    AccueilComponent,
    ProfileJobComponent,
    ProfileFreelancerComponent
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    HttpClientModule // ✅ obligatoire pour appeler le backend
  ],
  providers: [
    provideClientHydration()
  ],
  bootstrap: [AppComponent]
})
export class AppModule {}
