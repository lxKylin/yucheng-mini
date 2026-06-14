export interface EChartsInstance {
  setOption(option: unknown, notMerge?: boolean): void;
  dispose(): void;
}

export function registerPreprocessor(
  preprocessor: (option: { series?: unknown }) => void
): void;

export function setCanvasCreator(creator: () => unknown): void;

export function setPlatformAPI(api: {
  createCanvas: () => unknown;
  loadImage?: (
    src: string,
    onload: () => void,
    onerror: () => void
  ) => unknown;
}): void;

export function init(
  canvas: unknown,
  theme?: unknown,
  opts?: {
    width?: number;
    height?: number;
    devicePixelRatio?: number;
  }
): EChartsInstance;
