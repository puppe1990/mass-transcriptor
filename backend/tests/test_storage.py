from app.models import Tenant, Upload, TranscriptionJob, TranscriptionResult
from app.services.storage import build_upload_dir


def test_models_expose_core_entities():
    assert Tenant.__tablename__ == "tenants"
    assert Upload.__tablename__ == "uploads"
    assert TranscriptionJob.__tablename__ == "transcription_jobs"
    assert TranscriptionResult.__tablename__ == "transcription_results"


def test_build_upload_dir_scopes_paths_per_tenant():
    path = build_upload_dir("acme", 42)
    assert str(path).endswith("acme/uploads/42")
