import { Routes } from '@angular/router';
import {
  AgentConsolePage,
  StudioPage,
} from './studio-pages';
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
    path: '**',
    redirectTo: '',
  },
];
