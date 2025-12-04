/**
 * Type declarations for jest-axe custom matchers
 */

import 'jest-axe';

declare global {
  namespace jest {
    interface Matchers<R> {
      toHaveNoViolations(): R;
    }
  }
}
