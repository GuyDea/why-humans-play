import { Routes } from '@angular/router';
import {
  AgentConsolePage,
  StudioPage,
} from './studio-pages';

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
    path: '**',
    redirectTo: '',
  },
];
