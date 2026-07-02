import { GameLifecycleStatus } from './types';
import type { GameEventBus } from './managers/event-bus';

export const LIFECYCLE_EVENT = 'lifecycle:change';

const TRANSITIONS: Record<GameLifecycleStatus, GameLifecycleStatus[]> = {
  [GameLifecycleStatus.IDLE]: [GameLifecycleStatus.INITIALIZING],
  [GameLifecycleStatus.INITIALIZING]: [GameLifecycleStatus.LOADING_CONFIG],
  [GameLifecycleStatus.LOADING_CONFIG]: [GameLifecycleStatus.LOADING_ASSETS],
  [GameLifecycleStatus.LOADING_ASSETS]: [GameLifecycleStatus.READY],
  [GameLifecycleStatus.READY]: [GameLifecycleStatus.STARTING],
  [GameLifecycleStatus.STARTING]: [GameLifecycleStatus.RUNNING],
  [GameLifecycleStatus.RUNNING]: [GameLifecycleStatus.PAUSED, GameLifecycleStatus.STOPPING],
  [GameLifecycleStatus.PAUSED]: [GameLifecycleStatus.RUNNING, GameLifecycleStatus.STOPPING],
  [GameLifecycleStatus.STOPPING]: [GameLifecycleStatus.STOPPED],
  [GameLifecycleStatus.STOPPED]: [GameLifecycleStatus.STARTING, GameLifecycleStatus.READY],
  [GameLifecycleStatus.ERROR]: [GameLifecycleStatus.STOPPING],
  [GameLifecycleStatus.DESTROYED]: [],
};

export interface LifecycleChange {
  from: GameLifecycleStatus;
  to: GameLifecycleStatus;
}

/**
 * Enforces a valid lifecycle state machine. Any non-terminal state may move to
 * ERROR or DESTROYED; all other transitions follow the declared graph.
 */
export class GameLifecycle {
  private status: GameLifecycleStatus = GameLifecycleStatus.IDLE;

  constructor(private readonly bus: GameEventBus) {}

  current(): GameLifecycleStatus {
    return this.status;
  }

  is(status: GameLifecycleStatus): boolean {
    return this.status === status;
  }

  canTransition(to: GameLifecycleStatus): boolean {
    if (this.status === GameLifecycleStatus.DESTROYED) return false;
    if (to === GameLifecycleStatus.ERROR || to === GameLifecycleStatus.DESTROYED) return true;
    return TRANSITIONS[this.status].includes(to);
  }

  transition(to: GameLifecycleStatus): void {
    if (!this.canTransition(to)) {
      throw new Error(`Invalid lifecycle transition: ${this.status} → ${to}`);
    }
    const from = this.status;
    this.status = to;
    this.bus.emit<LifecycleChange>(LIFECYCLE_EVENT, { from, to }, 'lifecycle');
  }
}
