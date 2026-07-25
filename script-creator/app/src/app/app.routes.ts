import { Routes } from '@angular/router';
import {
  AgentConsolePage,
  StudioPage,
} from './studio-pages';
import { DiscoverPage } from './discover/discover-page';
import { PipelinePage } from './pipeline/pipeline-page';
import { TopicsPage } from './topics/topics-page';
import { LessonsPage } from './lessons/lessons-page';
import { WelcomePage } from './onboarding/welcome-page';

export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    component: StudioPage,
    data: { keepAlive: true },
  },
  {
    path: 'console',
    component: AgentConsolePage,
    data: { keepAlive: true },
  },
  {
    path: 'topics',
    component: TopicsPage,
    data: { keepAlive: true },
  },
  {
    path: 'pipeline',
    component: PipelinePage,
    data: { keepAlive: true },
  },
  {
    path: 'lessons',
    component: LessonsPage,
    data: { keepAlive: true },
  },
  {
    path: 'discover',
    component: DiscoverPage,
    data: { keepAlive: true },
  },
  {
    path: 'welcome',
    component: WelcomePage,
  },
  {
    path: '**',
    redirectTo: '',
  },
];
