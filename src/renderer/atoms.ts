import { atomWithStorage } from "jotai/utils";

export const settingsAtom = atomWithStorage("settings", {
  compactView: false,
  theme: "dark" as "light" | "dark",
});
