import { NativeModules } from "react-native";
import Constants from "expo-constants";

function extractHost(value: string | null | undefined) {
  if (!value) return null;
  const match = String(value).match(/^[a-z]+:\/\/([^/:]+):\d+/i) || String(value).match(/([^/:]+):\d+/);
  return match?.[1] || null;
}

function getDevHostFromMetro() {
  try {
    const scriptURL = String(NativeModules?.SourceCode?.scriptURL || "");
    const fromScript = extractHost(scriptURL);
    if (fromScript) return fromScript;

    const constantsAny = Constants as any;
    const fromHostUri = extractHost(constantsAny?.expoConfig?.hostUri);
    if (fromHostUri) return fromHostUri;

    const fromLinkingUri = extractHost(constantsAny?.linkingUri);
    if (fromLinkingUri) return fromLinkingUri;

    const fromDebuggerHost = extractHost(constantsAny?.expoGoConfig?.debuggerHost);
    if (fromDebuggerHost) return fromDebuggerHost;

    const fromManifestDebuggerHost = extractHost(constantsAny?.manifest2?.extra?.expoGo?.debuggerHost);
    if (fromManifestDebuggerHost) return fromManifestDebuggerHost;

    const fromEnv = extractHost(process.env.EXPO_PUBLIC_DEV_HOST);
    if (fromEnv) return fromEnv;

    return null;
  } catch {
    return null;
  }
}

const devHost = getDevHostFromMetro();

function isLocalhostUrl(value: string | undefined) {
  if (!value) return false;
  return /:\/\/(localhost|127\.0\.0\.1)(:|\/|$)/i.test(value);
}

const envApiBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL;
const envWsBaseUrl = process.env.EXPO_PUBLIC_WS_BASE_URL;
const defaultPort = 8082;

const apiBaseUrl = envApiBaseUrl && !isLocalhostUrl(envApiBaseUrl)
  ? envApiBaseUrl
  : (devHost ? `http://${devHost}:${defaultPort}` : `http://localhost:${defaultPort}`);

const wsBaseUrl = envWsBaseUrl && !isLocalhostUrl(envWsBaseUrl)
  ? envWsBaseUrl
  : (devHost ? `ws://${devHost}:${defaultPort}` : `ws://localhost:${defaultPort}`);

export const config = {
  apiBaseUrl,
  wsBaseUrl
};
