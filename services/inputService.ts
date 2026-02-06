export type PlayerInput = {
  thrust: boolean;
  reverse: boolean;
  rotation: number; // -1 (left), 0 (none), 1 (right)
  fire: boolean;
};

export type InputMapping = {
  thrust: string;
  reverse: string;
  left: string;
  right: string;
  fire: string;
};

export class InputService {
  private keys: Set<string> = new Set();
  private mouseDown: boolean = false;
  private gamepadState = {
    p1: { x: 0, thrust: false, fire: false },
    p2: { x: 0, thrust: false, fire: false }
  };

  // Default key mappings
  private inputMap: Record<1 | 2, InputMapping> = {
    1: { thrust: 'KeyW', reverse: 'KeyS', left: 'KeyA', right: 'KeyD', fire: 'Space' },
    2: { thrust: 'ArrowUp', reverse: 'ArrowDown', left: 'ArrowLeft', right: 'ArrowRight', fire: 'Numpad0' }
  };

  private gamepadMap = {
    p1: { thrust: 0, fire: 1 },
    p2: { thrust: 0, fire: 1 }
  };

  // Store references for cleanup
  private handleKeyDown: (e: KeyboardEvent) => void;
  private handleKeyUp: (e: KeyboardEvent) => void;
  private handleMouseDown: (e: MouseEvent) => void;
  private handleMouseUp: (e: MouseEvent) => void;

  constructor() {
    this.handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return;
      this.keys.add(e.code);
    };
    this.handleKeyUp = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return;
      this.keys.delete(e.code);
    };
    this.handleMouseDown = (e: MouseEvent) => {
      if (e.button === 0) this.mouseDown = true;
    };
    this.handleMouseUp = (e: MouseEvent) => {
      if (e.button === 0) this.mouseDown = false;
    };

    this.setupEventListeners();
  }

  private setupEventListeners() {
    window.addEventListener('keydown', this.handleKeyDown);
    window.addEventListener('keyup', this.handleKeyUp);
    window.addEventListener('mousedown', this.handleMouseDown);
    window.addEventListener('mouseup', this.handleMouseUp);
  }

  private pollGamepads() {
    const gamepads = navigator.getGamepads();
    if (!gamepads) return;

    // Map gamepad 0 to P1
    const gp1 = gamepads[0];
    if (gp1) {
      this.gamepadState.p1.x = Math.abs(gp1.axes[0]) > 0.2 ? gp1.axes[0] : 0;
      const thrustBtn = this.gamepadMap.p1.thrust;
      const fireBtn = this.gamepadMap.p1.fire;
      this.gamepadState.p1.thrust = gp1.buttons[thrustBtn]?.pressed || gp1.buttons[12]?.pressed || false;
      this.gamepadState.p1.fire = gp1.buttons[fireBtn]?.pressed || false;
    }

    // Map gamepad 1 to P2
    const gp2 = gamepads[1];
    if (gp2) {
      this.gamepadState.p2.x = Math.abs(gp2.axes[0]) > 0.2 ? gp2.axes[0] : 0;
      const thrustBtn = this.gamepadMap.p2.thrust;
      const fireBtn = this.gamepadMap.p2.fire;
      this.gamepadState.p2.thrust = gp2.buttons[thrustBtn]?.pressed || gp2.buttons[12]?.pressed || false;
      this.gamepadState.p2.fire = gp2.buttons[fireBtn]?.pressed || false;
    }
  }

  getPlayerInput(playerId: 1 | 2): PlayerInput {
    this.pollGamepads();

    const mapping = this.inputMap[playerId];
    const gpState = playerId === 1 ? this.gamepadState.p1 : this.gamepadState.p2;

    // Keyboard input
    const keyThrust = this.keys.has(mapping.thrust);
    const keyReverse = this.keys.has(mapping.reverse);
    const keyLeft = this.keys.has(mapping.left);
    const keyRight = this.keys.has(mapping.right);
    const keyFire = this.keys.has(mapping.fire);

    // Mouse input (P1 only)
    const mouseFire = playerId === 1 ? this.mouseDown : false;

    // Combine inputs
    let thrust = keyThrust || gpState.thrust;
    let reverse = keyReverse;
    let rotation = 0;

    if (keyLeft) rotation = -1;
    else if (keyRight) rotation = 1;
    else if (Math.abs(gpState.x) > 0.2) {
      rotation = gpState.x > 0 ? 1 : -1;
    }

    let fire = keyFire || mouseFire || gpState.fire;

    return { thrust, reverse, rotation, fire };
  }

  // Check if any key is pressed (for "press any key" screens)
  isAnyKeyPressed(): boolean {
    this.pollGamepads();

    if (this.keys.size > 0) return true;
    if (this.mouseDown) return true;

    const gamepads = navigator.getGamepads();
    if (gamepads) {
      for (const gp of gamepads) {
        if (gp) {
          for (const button of gp.buttons) {
            if (button.pressed) return true;
          }
        }
      }
    }

    return false;
  }

  // Clear all input state (useful when changing scenes)
  clearInput() {
    this.keys.clear();
    this.mouseDown = false;
  }

  // Check for specific key (e.g., Escape for pause)
  isKeyPressed(code: string): boolean {
    return this.keys.has(code);
  }

  // Clean up event listeners
  destroy() {
    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('keyup', this.handleKeyUp);
    window.removeEventListener('mousedown', this.handleMouseDown);
    window.removeEventListener('mouseup', this.handleMouseUp);
  }
}
