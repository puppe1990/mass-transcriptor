import { FormEvent, useEffect, useState } from "react";
import { useParams } from "react-router-dom";

import { getProviderSettings, updateProviderSettings } from "../lib/api";
import type { ProviderSettings } from "../lib/types";

export default function SettingsPage() {
  const { tenantSlug = "" } = useParams();
  const [settings, setSettings] = useState<ProviderSettings | null>(null);
  const [defaultProvider, setDefaultProvider] = useState("whisper");
  const [assemblyAiApiKey, setAssemblyAiApiKey] = useState("");
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    getProviderSettings(tenantSlug)
      .then((payload) => {
        if (!active) return;
        setSettings(payload);
        setDefaultProvider(payload.default_provider);
      })
      .catch((nextError) => {
        if (!active) return;
        setError(nextError instanceof Error ? nextError.message : "Failed to load settings");
      });
    return () => {
      active = false;
    };
  }, [tenantSlug]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setStatusMessage(null);
    try {
      const payload = await updateProviderSettings(tenantSlug, {
        default_provider: defaultProvider,
        assemblyai_api_key: assemblyAiApiKey || undefined,
      });
      setSettings(payload);
      setDefaultProvider(payload.default_provider);
      setAssemblyAiApiKey("");
      setStatusMessage(payload.providers.assemblyai.has_api_key ? "AssemblyAI key saved" : "Settings saved");
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Failed to save settings");
    }
  }

  return (
    <section className="page">
      <h1>Provider Settings</h1>
      <p>Tenant: {tenantSlug}</p>
      {settings ? (
        <form className="upload-form" onSubmit={onSubmit}>
          <label>
            Default provider
            <select
              aria-label="Default provider"
              value={defaultProvider}
              onChange={(event) => setDefaultProvider(event.target.value)}
            >
              <option value="whisper">whisper</option>
              <option value="assemblyai">assemblyai</option>
            </select>
          </label>
          <label>
            AssemblyAI API key
            <input
              aria-label="AssemblyAI API key"
              type="password"
              value={assemblyAiApiKey}
              onChange={(event) => setAssemblyAiApiKey(event.target.value)}
              placeholder={settings.providers.assemblyai.has_api_key ? "Configured" : "Paste API key"}
            />
          </label>
          <p>AssemblyAI key status: {settings.providers.assemblyai.has_api_key ? "saved" : "missing"}</p>
          <button type="submit">Save Settings</button>
        </form>
      ) : (
        <p>Loading settings...</p>
      )}
      {statusMessage ? <p>{statusMessage}</p> : null}
      {error ? <p role="alert">{error}</p> : null}
    </section>
  );
}
