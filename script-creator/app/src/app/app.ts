import {
  AfterViewInit,
  Component,
  ElementRef,
  inject,
  OnDestroy,
  signal,
} from '@angular/core';
import {
  NavigationEnd,
  Router,
  RouterLink,
  RouterLinkActive,
  RouterOutlet,
} from '@angular/router';
import { filter, type Subscription } from 'rxjs';
import { HelpDrawer } from './help/help-drawer';
import { MastheadModelSelector } from './masthead-model-selector';
import { OnboardingState } from './onboarding/onboarding-state';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    RouterLink,
    RouterLinkActive,
    RouterOutlet,
    HelpDrawer,
    MastheadModelSelector,
  ],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App implements AfterViewInit, OnDestroy {
  private readonly router = inject(Router);
  private readonly onboarding = inject(OnboardingState);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private initialNavigationHandled = false;
  private readonly navigationSubscription: Subscription;
  private mastheadResizeObserver: ResizeObserver | null = null;
  protected readonly helpOpen = signal(false);

  constructor() {
    this.navigationSubscription = this.router.events.pipe(
      filter((event): event is NavigationEnd => event instanceof NavigationEnd),
    ).subscribe((event) => {
      if (this.initialNavigationHandled) return;
      this.initialNavigationHandled = true;
      if (!isDefaultRoute(event.urlAfterRedirects)) return;
      void this.showWelcomeForFreshDefaultLoad();
    });
  }

  ngAfterViewInit(): void {
    const masthead = this.host.nativeElement.querySelector('.masthead');
    if (!masthead || typeof ResizeObserver === 'undefined') return;
    const publishHeight = () => {
      document.documentElement.style.setProperty(
        '--sc-masthead-height',
        `${Math.round(masthead.getBoundingClientRect().height)}px`,
      );
    };
    publishHeight();
    this.mastheadResizeObserver = new ResizeObserver(publishHeight);
    this.mastheadResizeObserver.observe(masthead);
  }

  ngOnDestroy(): void {
    this.navigationSubscription.unsubscribe();
    this.mastheadResizeObserver?.disconnect();
  }

  protected openHelp(): void {
    this.helpOpen.set(true);
  }

  protected closeHelp(): void {
    this.helpOpen.set(false);
    queueMicrotask(() => {
      document.querySelector<HTMLButtonElement>('#help-trigger')?.focus();
    });
  }

  private async showWelcomeForFreshDefaultLoad(): Promise<void> {
    if (
      await this.onboarding.shouldAutoShow()
      && isDefaultRoute(this.router.url)
    ) {
      await this.router.navigateByUrl('/welcome');
    }
  }
}

function isDefaultRoute(url: string): boolean {
  return url.split('#', 1)[0] === '/';
}
