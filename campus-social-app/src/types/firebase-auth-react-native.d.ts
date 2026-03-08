import "firebase/auth";

declare module "firebase/auth" {
  import { Persistence } from "@firebase/auth";

  export function getReactNativePersistence(storage: unknown): Persistence;
}
