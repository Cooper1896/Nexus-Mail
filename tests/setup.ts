import '@testing-library/jest-dom';
import './importMetaMock';

// Mock Electron API with event listener tracking
const createEventEmitter = () => {
  const listeners: Map<string, Set<Function>> = new Map();
  
  return {
    on: jest.fn((event: string, handler: Function) => {
      if (!listeners.has(event)) {
        listeners.set(event, new Set());
      }
      listeners.get(event)!.add(handler);
    }),
    off: jest.fn((event: string, handler: Function) => {
      if (listeners.has(event)) {
        listeners.get(event)!.delete(handler);
      }
    }),
    emit: (event: string, ...args: any[]) => {
      if (listeners.has(event)) {
        listeners.get(event)!.forEach(handler => handler(...args));
      }
    },
  };
};

const oauthEmitter = createEventEmitter();
const ipcEmitter = createEventEmitter();

Object.defineProperty(window, 'electronAPI', {
  value: {
    oauth: {
      login: jest.fn(),
      on: oauthEmitter.on,
      off: oauthEmitter.off,
    },
    store: {
      get: jest.fn(),
      set: jest.fn(),
    },
    ipcRenderer: {
      on: ipcEmitter.on,
      off: ipcEmitter.off,
      send: jest.fn(),
      invoke: jest.fn(),
    }
  },
  writable: true
});

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});