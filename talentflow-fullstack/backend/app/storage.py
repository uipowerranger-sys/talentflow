from pathlib import Path
from uuid import uuid4

from azure.storage.blob import BlobServiceClient, ContentSettings

from app.core.config import settings


class ResumeStorage:
    def __init__(self) -> None:
        self.local_root = Path(settings.resume_storage_dir).resolve()
        self.azure = (
            BlobServiceClient.from_connection_string(settings.azure_storage_connection_string)
            if settings.azure_storage_connection_string else None
        )

    def save(self, filename: str, content: bytes, content_type: str) -> str:
        suffix = Path(filename).suffix.lower()
        key = f"{uuid4().hex}{suffix}"
        if self.azure:
            container = self.azure.get_container_client(settings.azure_resume_container)
            if not container.exists():
                container.create_container()
            container.upload_blob(name=key, data=content, overwrite=False, content_settings=ContentSettings(content_type=content_type))
        else:
            self.local_root.mkdir(parents=True, exist_ok=True)
            target = (self.local_root / key).resolve()
            if self.local_root not in target.parents:
                raise ValueError("Invalid storage key")
            target.write_bytes(content)
        return key

    def read(self, key: str) -> bytes:
        if self.azure:
            return self.azure.get_blob_client(settings.azure_resume_container, key).download_blob().readall()
        target = (self.local_root / key).resolve()
        if self.local_root not in target.parents:
            raise ValueError("Invalid storage key")
        return target.read_bytes()

    def delete(self, key: str) -> None:
        if self.azure:
            self.azure.get_blob_client(settings.azure_resume_container, key).delete_blob(delete_snapshots="include")
            return
        target = (self.local_root / key).resolve()
        if self.local_root not in target.parents:
            raise ValueError("Invalid storage key")
        target.unlink(missing_ok=True)


resume_storage = ResumeStorage()
