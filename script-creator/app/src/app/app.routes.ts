import { Routes } from '@angular/router';
import {
  AgentConsolePage,
  StudioPage,
} from './studio-pages';
import { PipelinePage } from './pipeline/pipeline-page';
import { TopicsPage } from './topics/topics-page';

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
    path: '**',
    redirectTo: '',
  },
];
