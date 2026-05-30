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

  pins: Pin[];
}
