# Whisper Language Setting Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a workspace-level Whisper default language setting that is configurable in the frontend and applied by the backend worker.

**Architecture:** Reuse `tenant_provider_settings.config_json` for Whisper-specific config, extend the settings API contract with `whisper_language`, and pass the resolved value into Whisper transcription only when it is not `auto`. Keep AssemblyAI behavior unchanged.

**Tech Stack:** FastAPI, SQLAlchemy, Pydantic, React, TypeScript, Vitest, pytest

---

### Task 1: Backend settings contract

**Files:**
- Modify: `backend/tests/test_provider_settings_api.py`
- Modify: `backend/app/schemas.py`
- Modify: `backend/app/services/provider_settings.py`
- Modify: `backend/app/api/routes.py`

- [ ] **Step 1: Write the failing backend API tests**

```python
def test_get_provider_settings_returns_workspace_defaults():
    ...
    assert response.json() == {
        "workspace_name": "Acme",
        "default_provider": "whisper",
        "whisper_language": "auto",
        "providers": {
            "whisper": {"enabled": True, "has_api_key": False},
            "assemblyai": {"enabled": False, "has_api_key": False},
        },
    }


def test_patch_provider_settings_encrypts_api_key_and_changes_default_provider():
    ...
    response = client.patch(
        "/t/acme/settings/providers",
        headers=headers,
        json={
            "workspace_name": "Acme Audio Lab",
            "default_provider": "assemblyai",
            "whisper_language": "pt",
            "assemblyai_api_key": "super-secret-key",
        },
    )
    assert response.json()["whisper_language"] == "pt"


def test_patch_provider_settings_rejects_unsupported_whisper_language():
    ...
    response = client.patch(
        "/t/acme/settings/providers",
        headers=headers,
        json={
            "workspace_name": "Acme",
            "default_provider": "whisper",
            "whisper_language": "fr",
        },
    )
    assert response.status_code == 422
```

- [ ] **Step 2: Run backend settings tests and verify failure**

Run: `cd /Users/matheuspuppe/Desktop/Projetos/mass-transcriptor/backend && pytest tests/test_provider_settings_api.py -q`
Expected: FAIL because `whisper_language` is missing and unsupported values are not validated.

- [ ] **Step 3: Write the minimal backend implementation**

```python
class ProviderSettingsResponse(BaseModel):
    workspace_name: str
    default_provider: str
    whisper_language: str
    providers: dict[str, ProviderStateResponse]


class ProviderSettingsUpdateRequest(BaseModel):
    workspace_name: str
    default_provider: str
    whisper_language: str = "auto"
    assemblyai_api_key: str | None = None
```

```python
ALLOWED_WHISPER_LANGUAGES = {"auto", "pt", "en", "es"}

def resolve_whisper_language(session: Session, tenant_id: int) -> str:
    setting = _get_setting(session, tenant_id, "whisper")
    config = json.loads(setting.config_json or "{}") if setting else {}
    language = str(config.get("language") or "auto")
    return language if language in ALLOWED_WHISPER_LANGUAGES else "auto"
```

- [ ] **Step 4: Run backend settings tests and verify pass**

Run: `cd /Users/matheuspuppe/Desktop/Projetos/mass-transcriptor/backend && pytest tests/test_provider_settings_api.py -q`
Expected: PASS

### Task 2: Worker and provider behavior

**Files:**
- Modify: `backend/tests/test_provider_registry.py`
- Modify: `backend/tests/test_job_worker.py`
- Modify: `backend/app/services/providers/base.py`
- Modify: `backend/app/services/providers/whisper_provider.py`
- Modify: `backend/app/worker.py`

- [ ] **Step 1: Write the failing Whisper behavior tests**

```python
@patch("app.services.providers.whisper_provider.whisper.load_model")
def test_whisper_provider_passes_configured_language(load_model):
    class DummyModel:
        def transcribe(self, file_path: str, **kwargs) -> dict:
            assert kwargs == {"language": "pt"}
            return {"text": "Transcript", "language": "pt"}

    load_model.return_value = DummyModel()
    provider = WhisperProvider(language="pt")
    result = provider.transcribe("/tmp/file.wav")
    assert result.metadata == {"language": "pt"}
```

```python
def test_process_next_job_passes_whisper_language(monkeypatch, tmp_path):
    ...
    session.add(
        TenantProviderSetting(
            tenant_id=tenant.id,
            provider_key="whisper",
            enabled=1,
            config_json=json.dumps({"language": "pt"}),
        )
    )
    ...
    def fake_get_provider(provider_key: str, api_key: str | None = None, language: str | None = None):
        captured["language"] = language
        return DummyProvider()
    ...
    assert captured["language"] == "pt"
```

- [ ] **Step 2: Run provider and worker tests and verify failure**

Run: `cd /Users/matheuspuppe/Desktop/Projetos/mass-transcriptor/backend && pytest tests/test_provider_registry.py tests/test_job_worker.py -q`
Expected: FAIL because the provider and worker do not accept or forward Whisper language.

- [ ] **Step 3: Write the minimal runtime implementation**

```python
class TranscriptionProvider:
    def transcribe(self, file_path: str) -> ProviderResult:
        raise NotImplementedError
```

```python
class WhisperProvider(TranscriptionProvider):
    def __init__(self, language: str | None = None) -> None:
        self.settings = Settings()
        self.language = language

    def transcribe(self, file_path: str) -> ProviderResult:
        kwargs = {"language": self.language} if self.language else {}
        result = model.transcribe(file_path, **kwargs)
```

```python
if job.provider_key == "whisper":
    whisper_language = resolve_whisper_language(session, job.tenant_id)
    provider_language = None if whisper_language == "auto" else whisper_language
provider = get_provider(job.provider_key, api_key=provider_api_key, language=provider_language)
```

- [ ] **Step 4: Run provider and worker tests and verify pass**

Run: `cd /Users/matheuspuppe/Desktop/Projetos/mass-transcriptor/backend && pytest tests/test_provider_registry.py tests/test_job_worker.py -q`
Expected: PASS

### Task 3: Frontend settings UI

**Files:**
- Modify: `frontend/src/tests/SettingsPage.test.tsx`
- Modify: `frontend/src/lib/types.ts`
- Modify: `frontend/src/lib/api.ts`
- Modify: `frontend/src/pages/SettingsPage.tsx`
- Modify: `frontend/src/i18n.ts`

- [ ] **Step 1: Write the failing frontend test**

```tsx
test("saves whisper language setting", async () => {
  ...
  expect(init.body).toContain('"whisper_language":"pt"');
  ...
  expect(screen.getByDisplayValue("Portuguese")).toBeTruthy();
});
```

- [ ] **Step 2: Run frontend settings test and verify failure**

Run: `cd /Users/matheuspuppe/Desktop/Projetos/mass-transcriptor/frontend && npm test -- --run src/tests/SettingsPage.test.tsx`
Expected: FAIL because the UI and payload do not include `whisper_language`.

- [ ] **Step 3: Write the minimal frontend implementation**

```ts
export interface ProviderSettings {
  workspace_name: string;
  default_provider: string;
  whisper_language: "auto" | "pt" | "en" | "es";
  providers: {
    whisper: ProviderState;
    assemblyai: ProviderState;
  };
}
```

```tsx
const [whisperLanguage, setWhisperLanguage] = useState<ProviderSettings["whisper_language"]>("auto");
...
<select value={whisperLanguage} onChange={(event) => setWhisperLanguage(event.target.value as ProviderSettings["whisper_language"])}>
  <option value="auto">{t("settings.whisperLanguageAuto")}</option>
  <option value="pt">{t("settings.whisperLanguagePt")}</option>
  <option value="en">{t("settings.whisperLanguageEn")}</option>
  <option value="es">{t("settings.whisperLanguageEs")}</option>
</select>
```

- [ ] **Step 4: Run frontend settings test and verify pass**

Run: `cd /Users/matheuspuppe/Desktop/Projetos/mass-transcriptor/frontend && npm test -- --run src/tests/SettingsPage.test.tsx`
Expected: PASS

### Task 4: Final verification

**Files:**
- Modify: none

- [ ] **Step 1: Run targeted backend verification**

Run: `cd /Users/matheuspuppe/Desktop/Projetos/mass-transcriptor/backend && pytest tests/test_provider_settings_api.py tests/test_provider_registry.py tests/test_job_worker.py -q`
Expected: PASS

- [ ] **Step 2: Run targeted frontend verification**

Run: `cd /Users/matheuspuppe/Desktop/Projetos/mass-transcriptor/frontend && npm test -- --run src/tests/SettingsPage.test.tsx`
Expected: PASS
