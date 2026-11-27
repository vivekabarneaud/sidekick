import { requireOptionalNativeModule } from 'expo';

type Native = {
  hasStepSensor(): boolean;
  readSteps(): Promise<{ steps: number; boot: number } | null>;
  watchRuns(): Promise<boolean>;
  /** JSON: [{ "at": ms, "kind": "start" | "end" }] */
  takeRunEvents(): string;
};

/** The Android code in ./android. null in Expo Go. */
export const Motion = requireOptionalNativeModule<Native>('Motion');
