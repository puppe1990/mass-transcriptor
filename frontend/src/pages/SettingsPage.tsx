import { FormEvent, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useParams } from "react-router-dom";

import { getProviderSettings, updateProviderSettings } from "../lib/api";
import type { ProviderSettings } from "../lib/types";

export default function SettingsPage() {
  const { t } = useTranslation();
  const { tenantSlug = "" } = useParams();
  const [settings, setSettings] = useState<ProviderSettings | null>(null);
  const [workspaceName, setWorkspaceName] = useState("");
  const [defaultProvider, setDefaultProvider] = useState("whisper");
  const [whisperLanguage, setWhisperLanguage] = useState<ProviderSettings["whisper_language"]>("auto");
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
        setWhisperLanguage(payload.whisper_language);
      })
      .catch((nextError) => {
        if (!active) return;
        setError(nextError instanceof Error ? nextError.message : t("settings.loadFailed"));
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
        whisper_language: whisperLanguage,
        assemblyai_api_key: assemblyAiApiKey || undefined,
      });
      setSettings(payload);
      setWorkspaceName(payload.workspace_name);
      setDefaultProvider(payload.default_provider);
      setWhisperLanguage(payload.whisper_language);
      setAssemblyAiApiKey("");
      setStatusMessage(
        payload.providers.assemblyai.has_api_key ? t("settings.assemblyAiKeySaved") : t("settings.settingsSaved")
      );
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : t("settings.saveFailed"));
    }
  }

  return (
    <section className="settings-shell">
      <div className="settings-shell__intro">
        <p className="settings-shell__eyebrow">{t("settings.introEyebrow")}</p>
        <h1>{t("settings.title")}</h1>
        <p className="settings-shell__lede">{t("settings.lede")}</p>

        <div className="settings-shell__note">
          <p className="settings-shell__label">{t("settings.workspace")}</p>
          <strong>{settings?.workspace_name ?? tenantSlug}</strong>
          <p>{t("settings.slug", { tenantSlug })}</p>
          <p>{t("settings.whisperNote")}</p>
        </div>
      </div>

      <div className="settings-card">
        {settings ? (
          <form className="settings-form" onSubmit={onSubmit}>
            <section className="settings-form__section">
              <p className="settings-shell__label">{t("settings.workspace")}</p>
              <label className="settings-form__field">
                <span>{t("settings.workspace")}</span>
                <input
                  aria-label={t("auth.workspaceName")}
                  type="text"
                  value={workspaceName}
                  onChange={(event) => setWorkspaceName(event.target.value)}
                  placeholder={t("settings.yourWorkspace")}
                />
              </label>
            </section>

            <section className="settings-form__section">
              <p className="settings-shell__label">{t("settings.provider")}</p>
              <label className="settings-form__field">
                <span>{t("settings.defaultProvider")}</span>
                <select
                  aria-label={t("settings.defaultProvider")}
                  value={defaultProvider}
                  onChange={(event) => setDefaultProvider(event.target.value)}
                >
                  <option value="whisper">whisper</option>
                  <option value="assemblyai">assemblyai</option>
                </select>
              </label>
              <label className="settings-form__field">
                <span>{t("settings.whisperDefaultLanguage")}</span>
                <select
                  aria-label={t("settings.whisperDefaultLanguage")}
                  value={whisperLanguage}
                  onChange={(event) =>
                    setWhisperLanguage(event.target.value as ProviderSettings["whisper_language"])
                  }
                >
                  <option value="auto">{t("settings.whisperLanguageAuto")}</option>
                  <option value="pt">{t("settings.whisperLanguagePt")}</option>
                  <option value="en">{t("settings.whisperLanguageEn")}</option>
                  <option value="es">{t("settings.whisperLanguageEs")}</option>
                </select>
              </label>
            </section>

            <section className="settings-form__section">
              <p className="settings-shell__label">{t("settings.credentials")}</p>
              <label className="settings-form__field">
                <span>{t("settings.assemblyAiApiKey")}</span>
                <input
                  aria-label={t("settings.assemblyAiApiKey")}
                  type="password"
                  value={assemblyAiApiKey}
                  onChange={(event) => setAssemblyAiApiKey(event.target.value)}
                  placeholder={settings.providers.assemblyai.has_api_key ? t("settings.configured") : t("settings.pasteApiKey")}
                />
              </label>
              <div className="settings-form__status-row">
                <span className="settings-shell__label">{t("settings.status")}</span>
                <span
                  className={`settings-status ${
                    settings.providers.assemblyai.has_api_key ? "settings-status--ok" : "settings-status--missing"
                  }`}
                >
                  {settings.providers.assemblyai.has_api_key ? t("settings.configured") : t("settings.missing")}
                </span>
              </div>
            </section>

            <div className="settings-form__footer">
              <p>{t("settings.applyChanges")}</p>
              <button type="submit">{t("settings.saveSettings")}</button>
            </div>
          </form>
        ) : (
          <p>{t("settings.loading")}</p>
        )}
        {statusMessage ? <p className="settings-feedback settings-feedback--success">{statusMessage}</p> : null}
        {error ? <p className="settings-feedback settings-feedback--error" role="alert">{error}</p> : null}
      </div>
    </section>
  );
}
