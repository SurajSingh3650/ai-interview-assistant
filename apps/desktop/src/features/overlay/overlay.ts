import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";

export async function toggleOverlayWindow() {
  await invoke("toggle_overlay");
}

export async function updateOverlayHint(text: string) {
  await invoke("set_overlay_text", { text });
}

export async function subscribeOverlayUpdates(callback: (text: string) => void) {
  const unlisten = await listen<string>("overlay:update", (event) => {
    callback(event.payload);
  });
  return unlisten;
}
