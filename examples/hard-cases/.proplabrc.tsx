import type { ComponentType, ReactNode } from 'react';
import { AppProviders } from './src/providers/AppProviders';

/**
 * Project-level PropLab config (preview decorators / providers).
 *
 * Loaded automatically when you run `npx proplab` in this folder.
 * Every preview is wrapped with AppProviders so Auth / Theme / Form
 * context is available.
 */
export default {
  decorators: [
    (Story: ComponentType) => (
      <AppProviders theme="light">
        <Story />
      </AppProviders>
    ),
  ],
};

/** Helper type for decorator callbacks. */
export type PropLabDecorator = (Story: ComponentType) => ReactNode;
