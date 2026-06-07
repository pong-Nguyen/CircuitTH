export type ComponentType =
  | 'R'
  | 'C'
  | 'L'
  | 'V'
  | 'I'
  | 'E'
  | 'F'
  | 'G'
  | 'H'
  | 'D'
  | 'LED'
  | 'K'
  | 'Q'
  | 'M'
  | 'GND';

export interface Point {
  x: number;
  y: number;
}

export interface Pin extends Point {}

export interface Wire {
  id: string;
  points: Point[];
}

export type SourceMode = 'DC' | 'AC' | 'PULSE' | 'SIN';

export interface SourceConfig {
  mode: SourceMode;
  dc: string;
  acMag: string;
  acPhase: string;
  pulseInitial: string;
  pulsePulsed: string;
  pulseDelay: string;
  pulseRise: string;
  pulseFall: string;
  pulseWidth: string;
  pulsePeriod: string;
  sinOffset: string;
  sinAmplitude: string;
  sinFrequency: string;
  sinDelay: string;
  sinDamping: string;
  sinPhase: string;
}

export interface DependentSourceConfig {
  vctrl: string;
  gain: string;
}

export interface SwitchConfig {
  closed: boolean;
}

export type LedColor = 'red' | 'green' | 'blue' | 'yellow' | 'white';

export interface LedConfig {
  color: LedColor;
}

export type TransistorKind = 'NPN' | 'PNP' | 'NMOS' | 'PMOS';

export interface TransistorConfig {
  kind: TransistorKind;
  gm: string;
  outputResistance: string;
}

export interface CircuitComponent {
  uuid: string;

  id: string;

  type: ComponentType;

  x: number;
  y: number;

  rotation:
    | 0
    | 90
    | 180
    | 270;

  flipX: boolean;
  flipY: boolean;

  value: string;

  source?: SourceConfig;

  dependent?: DependentSourceConfig;

  switch?: SwitchConfig;

  led?: LedConfig;

  transistor?: TransistorConfig;

  pins: Pin[];
}

export interface CircuitDocument {
  id: string;
  name: string;
  components: CircuitComponent[];
  wires: Wire[];
  simConfig: unknown;
  createdAt: number;
  updatedAt: number;
}
