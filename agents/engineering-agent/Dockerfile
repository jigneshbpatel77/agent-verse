FROM python:3.12-slim
WORKDIR /app
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1
COPY agents/engineering-agent/pyproject.toml ./
RUN pip install --no-cache-dir .
COPY agents/engineering-agent/app ./app
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
