import { Routes } from '@angular/router';
import {
  AgentConsolePage,
  StudioPage,
} from './studio-pages';
import { PipelinePage } from './pipeline/pipeline-page';
import { TopicsPage } from './topics/topics-page';
import { LessonsPage } from './lessons/lessons-page';
import { WelcomePage } from './onboarding/welcome-page';

export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    component: StudioPage,
  },
  {
    path: 'console',
    component: AgentConsolePage,
  },
  {
    path: 'topics',
    component: TopicsPage,
  },
  {
    path: 'pipeline',
    component: PipelinePage,
  },
  {
    path: 'lessons',
    component: LessonsPage,
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
