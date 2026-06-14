import type { CSSProperties } from 'react';

declare global {
  namespace JSX {
    interface IntrinsicElements {
      'ec-canvas': {
        id?: string;
        className?: string;
        style?: CSSProperties;
        'canvas-id'?: string;
        ec?: {
          disableTouch?: boolean;
          lazyLoad?: boolean;
          option?: unknown;
          onInit?: (
            canvas: unknown,
            width: number,
            height: number,
            dpr: number
          ) => unknown;
        };
        'force-use-old-canvas'?: boolean;
      };
    }
  }
}
