const env = require("../../config/env");

let client = null;
let openRouterConstructor = undefined;

function getOpenRouterConstructor() {
  if (openRouterConstructor !== undefined) {
    return openRouterConstructor;
  }

  try {
    openRouterConstructor = require("@openrouter/sdk").OpenRouter;
  } catch {
    openRouterConstructor = null;
  }

  return openRouterConstructor;
}

function getDefaultHeaders() {
  const headers = {};

  if (env.OPENROUTER_SITE_URL) {
    headers["HTTP-Referer"] = env.OPENROUTER_SITE_URL;
  }

  if (env.OPENROUTER_SITE_NAME) {
    headers["X-Title"] = env.OPENROUTER_SITE_NAME;
  }

  return headers;
}

function getOpenRouterClient() {
  if (!env.OPENROUTER_API_KEY) {
    return null;
  }

  const OpenRouter = getOpenRouterConstructor();
  if (!OpenRouter) {
    return null;
  }

  if (!client) {
    const headers = getDefaultHeaders();
    client = new OpenRouter({
      apiKey: env.OPENROUTER_API_KEY,
      httpReferer: headers["HTTP-Referer"],
      xTitle: headers["X-Title"]
    });
  }

  return client;
}

module.exports = {
  getOpenRouterClient
};
