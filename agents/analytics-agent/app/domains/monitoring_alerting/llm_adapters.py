from typing import Any, Protocol

from app.config.settings import Settings


class LogAnalysisLLM(Protocol):
    def analyze_logs(self, system_prompt: str, user_prompt: str) -> str:
        """Return the raw JSON analysis text from the provider."""


class OpenAICompatibleChatAdapter:
    def __init__(self, api_key: str, model: str, base_url: str | None = None) -> None:
        self._api_key = api_key
        try:
            from openai import OpenAI  # noqa: F401
        except ModuleNotFoundError:
            self._client = None
        else:
            self._client = OpenAI(api_key=api_key, base_url=base_url)
        self._base_url = base_url
        self._model = model

    def analyze_logs(self, system_prompt: str, user_prompt: str) -> str:
        client = self._get_client()
        response = client.chat.completions.create(
            model=self._model,
            temperature=0,
            response_format={"type": "json_object"},
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
        )
        return response.choices[0].message.content or "{}"

    def _get_client(self) -> Any:
        if self._client is None:
            try:
                from openai import OpenAI
            except ModuleNotFoundError as exc:
                raise ValueError(
                    "The 'openai' package is required for LLM log analysis. "
                    "Install analytics-agent dependencies with `python -m pip install -e .` "
                    "from agents/analytics-agent."
                ) from exc

            self._client = OpenAI(api_key=self._api_key, base_url=self._base_url)

        return self._client


def build_log_analysis_adapter(settings: Settings) -> LogAnalysisLLM:
    provider = settings.llm_provider.lower()

    if provider == "openai":
        if not settings.openai_api_key:
            raise ValueError("OPENAI_API_KEY is required when LLM_PROVIDER=openai")
        return OpenAICompatibleChatAdapter(
            api_key=settings.openai_api_key,
            model=settings.openai_model,
            base_url=settings.openai_base_url,
        )

    if provider in {"grok", "xai"}:
        if not settings.xai_api_key:
            raise ValueError("XAI_API_KEY is required when LLM_PROVIDER=grok")
        return OpenAICompatibleChatAdapter(
            api_key=settings.xai_api_key,
            model=settings.xai_model,
            base_url=settings.xai_base_url,
        )

    raise ValueError(f"Unsupported LLM_PROVIDER: {settings.llm_provider}")
