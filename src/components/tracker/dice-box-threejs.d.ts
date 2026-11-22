// The package ships no types. Only what `dice.ts` uses is declared.
declare module "@3d-dice/dice-box-threejs" {
  export default class DiceBox {
    constructor(selector: string, config?: Record<string, unknown>);
    initialize(): Promise<void>;
    roll(notation: string): Promise<unknown>;
    clearDice(): void;
    /** The thrown dice: three.js meshes, read for where each one came to rest. */
    diceList: { position: { clone(): { project(camera: unknown): { x: number; y: number } } } }[];
    camera: unknown;
  }
}
