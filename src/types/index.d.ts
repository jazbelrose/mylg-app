// Type declarations for modules without TypeScript support

declare module 'react-modal' {
  import * as React from 'react';
  
  interface ModalProps {
    isOpen: boolean;
    onRequestClose?: (event: React.MouseEvent | React.KeyboardEvent) => void;
    style?: {
      content?: React.CSSProperties;
      overlay?: React.CSSProperties;
    };
    className?: string;
    overlayClassName?: string;
    bodyOpenClassName?: string;
    htmlOpenClassName?: string;
    ariaHideApp?: boolean;
    shouldFocusAfterRender?: boolean;
    shouldCloseOnOverlayClick?: boolean;
    shouldCloseOnEsc?: boolean;
    shouldReturnFocusAfterClose?: boolean;
    role?: string;
    contentLabel?: string;
    aria?: { [key: string]: string };
    data?: { [key: string]: string };
    children?: React.ReactNode;
  }
  
  export default class Modal extends React.Component<ModalProps> {
    static setAppElement(element: string | HTMLElement): void;
  }
}

declare module './aws-exports' {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const awsConfig: any;
  export default awsConfig;
}

declare module './app/App' {
  import React from 'react';
  const App: React.FC;
  export default App;
}

declare module './app/bootstrapDevErrorHooks' {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const bootstrapDevErrorHooks: any;
  export default bootstrapDevErrorHooks;
}

declare module 'scramble-text' {
  export default class ScrambleText {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    constructor(element: HTMLElement, options?: any);
    play(): void;
    stop(): void;
  }
}

declare module 'fabric' {
  export * from 'fabric/fabric-impl';
}