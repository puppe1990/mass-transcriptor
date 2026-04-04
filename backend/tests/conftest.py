from __future__ import annotations

import os
from pathlib import Path

TEST_RUNTIME_DIR = Path(__file__).resolve().parent / ".runtime"
TEST_RUNTIME_DIR.mkdir(exist_ok=True)

os.environ["DATABASE_URL"] = f"sqlite:///{(TEST_RUNTIME_DIR / 'test.db').resolve()}"
os.environ["STORAGE_ROOT"] = str((TEST_RUNTIME_DIR / "storage").resolve())
