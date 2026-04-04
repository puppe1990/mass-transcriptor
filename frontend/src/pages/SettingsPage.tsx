import { FormEvent, useEffect, useState } from "react";
import { useParams } from "react-router-dom";

import { getProviderSettings, updateProviderSettings } from "../lib/api";
import type { ProviderSettings } from "../lib/types";

export default function SettingsPage() {
  const { tenantSlug = "" } = useParams();
  const [settings, setSettings] = useState<ProviderSettings | null>(null);
  const [workspaceName, setWorkspaceName] = useState("");
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
        setWorkspaceName(payload.workspace_name);
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
        workspace_name: workspaceName,
        default_provider: defaultProvider,
        assemblyai_api_key: assemblyAiApiKey || undefined,
      });
      setSettings(payload);
      setWorkspaceName(payload.workspace_name);
      setDefaultProvider(payload.default_provider);
      setAssemblyAiApiKey("");
      setStatusMessage(payload.providers.assemblyai.has_api_key ? "AssemblyAI key saved" : "Settings saved");
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Failed to save settings");
    }
  }

  return (
    <section className="settings-shell">
      <div className="settings-shell__intro">
        <p className="settings-shell__eyebrow">Workspace controls</p>
        <h1>Provider Settings</h1>
        <p className="settings-shell__lede">
          Choose which engine runs each transcript and keep external credentials scoped to this workspace only.
        </p>

        <div className="settings-shell__note">
          <p className="settings-shell__label">Workspace</p>
          <strong>{settings?.workspace_name ?? tenantSlug}</strong>
          <p>Slug: {tenantSlug}</p>
          <p>Whisper runs locally. AssemblyAI only works when this workspace has its own API key configured.</p>
        </div>
      </div>

      <div className="settings-card">
        {settings ? (
          <form className="settings-form" onSubmit={onSubmit}>
            <section className="settings-form__section">
              <p className="settings-shell__label">Workspace</p>
              <label className="settings-form__field">
                <span>Workspace name</span>
                <input
                  aria-label="Workspace name"
                  type="text"
                  value={workspaceName}
                  onChange={(event) => setWorkspaceName(event.target.value)}
                  placeholder="Your workspace"
                />
              </label>
            </section>

            <section className="settings-form__section">
              <p className="settings-shell__label">Provider</p>
              <label className="settings-form__field">
                <span>Default provider</span>
                <select
                  aria-label="Default provider"
                  value={defaultProvider}
                  onChange={(event) => setDefaultProvider(event.target.value)}
                >
                  <option value="whisper">whisper</option>
                  <option value="assemblyai">assemblyai</option>
                </select>
              </label>
            </section>

            <section className="settings-form__section">
              <p className="settings-shell__label">Credentials</p>
              <label className="settings-form__field">
                <span>AssemblyAI API key</span>
                <input
                  aria-label="AssemblyAI API key"
                  type="password"
                  value={assemblyAiApiKey}
                  onChange={(event) => setAssemblyAiApiKey(event.target.value)}
                  placeholder={settings.providers.assemblyai.has_api_key ? "Configured" : "Paste API key"}
                />
              </label>
              <div className="settings-form__status-row">
                <span className="settings-shell__label">Status</span>
                <span
                  className={`settings-status ${
                    settings.providers.assemblyai.has_api_key ? "settings-status--ok" : "settings-status--missing"
                  }`}
                >
                  {settings.providers.assemblyai.has_api_key ? "Configured" : "Missing"}
                </span>
              </div>
            </section>

            <div className="settings-form__footer">
              <p>Changes apply to new uploads. Existing jobs keep the provider they were created with.</p>
              <button type="submit">Save Settings</button>
            </div>
          </form>
        ) : (
          <p>Loading settings...</p>
        )}
        {statusMessage ? <p className="settings-feedback settings-feedback--success">{statusMessage}</p> : null}
        {error ? <p className="settings-feedback settings-feedback--error" role="alert">{error}</p> : null}
      </div>
    </section>
  );
}
