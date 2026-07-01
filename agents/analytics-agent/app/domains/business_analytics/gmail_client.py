import base64
import json
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from app.config.settings import Settings

GMAIL_READONLY_SCOPE = "https://www.googleapis.com/auth/gmail.readonly"


@dataclass(frozen=True)
class GmailMessage:
    message_id: str
    thread_id: str | None
    history_id: str | None
    sender: str
    subject: str
    message_date: datetime | None
    body_html: str
    body_text: str


class GmailClient:
    def __init__(self, settings: Settings):
        self.settings = settings
        self.user_id = settings.gmail_delegated_user or "me"
        self.service = self._build_service()

    def watch_mailbox(self) -> dict[str, Any]:
        if not self.settings.gmail_pubsub_topic:
            raise ValueError("GMAIL_PUBSUB_TOPIC is required to start Gmail watch")

        body: dict[str, Any] = {
            "topicName": self.settings.gmail_pubsub_topic,
        }
        if self.settings.gmail_watch_label_ids:
            body["labelIds"] = self.settings.gmail_watch_label_ids
            body["labelFilterBehavior"] = "INCLUDE"

        return self.service.users().watch(userId=self.user_id, body=body).execute()

    def list_message_ids_from_history(self, start_history_id: str) -> list[str]:
        message_ids: list[str] = []
        request = self.service.users().history().list(
            userId=self.user_id,
            startHistoryId=start_history_id,
            historyTypes=["messageAdded"],
        )

        while request is not None:
            response = request.execute()
            for history in response.get("history", []):
                for added in history.get("messagesAdded", []):
                    message = added.get("message") or {}
                    message_id = message.get("id")
                    if message_id:
                        message_ids.append(message_id)
            request = self.service.users().history().list_next(request, response)

        return list(dict.fromkeys(message_ids))

    def search_message_ids(self, query: str) -> list[str]:
        message_ids: list[str] = []
        request = self.service.users().messages().list(userId=self.user_id, q=query)

        while request is not None:
            response = request.execute()
            for message in response.get("messages", []):
                message_id = message.get("id")
                if message_id:
                    message_ids.append(message_id)
            request = self.service.users().messages().list_next(request, response)

        return message_ids

    def get_message(self, message_id: str) -> GmailMessage:
        message = self.service.users().messages().get(userId=self.user_id, id=message_id, format="full").execute()
        headers = {
            header.get("name", "").lower(): header.get("value", "")
            for header in message.get("payload", {}).get("headers", [])
        }
        body_html, body_text = _extract_message_bodies(message.get("payload", {}))

        return GmailMessage(
            message_id=message["id"],
            thread_id=message.get("threadId"),
            history_id=message.get("historyId"),
            sender=headers.get("from", ""),
            subject=headers.get("subject", ""),
            message_date=_parse_internal_date(message.get("internalDate")),
            body_html=body_html,
            body_text=body_text,
        )

    def _build_service(self) -> Any:
        from googleapiclient.discovery import build

        service_account_info = self._service_account_info()
        if service_account_info:
            from google.oauth2 import service_account

            credentials = service_account.Credentials.from_service_account_info(
                service_account_info,
                scopes=[GMAIL_READONLY_SCOPE],
            )
            if self.settings.gmail_delegated_user:
                credentials = credentials.with_subject(self.settings.gmail_delegated_user)
        else:
            import google.auth

            credentials, _ = google.auth.default(scopes=[GMAIL_READONLY_SCOPE])

        return build("gmail", "v1", credentials=credentials, cache_discovery=False)

    def _service_account_info(self) -> dict[str, Any] | None:
        if self.settings.gmail_service_account_json:
            return json.loads(self.settings.gmail_service_account_json)

        if self.settings.gmail_service_account_file:
            service_account_path = Path(self.settings.gmail_service_account_file).expanduser()
            return json.loads(service_account_path.read_text())

        return None


def _extract_message_bodies(payload: dict[str, Any]) -> tuple[str, str]:
    html_parts: list[str] = []
    text_parts: list[str] = []

    def walk(part: dict[str, Any]) -> None:
        mime_type = part.get("mimeType", "")
        body_data = part.get("body", {}).get("data")
        if body_data:
            decoded = _decode_base64url(body_data)
            if mime_type == "text/html":
                html_parts.append(decoded)
            elif mime_type == "text/plain":
                text_parts.append(decoded)

        for child in part.get("parts", []) or []:
            walk(child)

    walk(payload)
    return "\n".join(html_parts), "\n".join(text_parts)


def _decode_base64url(value: str) -> str:
    padding = "=" * (-len(value) % 4)
    return base64.urlsafe_b64decode(f"{value}{padding}").decode("utf-8", errors="replace")


def _parse_internal_date(value: str | None) -> datetime | None:
    if not value:
        return None
    return datetime.fromtimestamp(int(value) / 1000, tz=timezone.utc)
