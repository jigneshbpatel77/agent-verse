import asyncio
import logging
from contextlib import suppress
from datetime import date

from app.config.settings import get_settings
from app.domains.business_analytics.ingestion import run_full_ingestion
from app.domains.business_analytics.policybazaar_email_ingestion import backfill_recent_policybazaar_emails, ensure_gmail_watch
from app.domains.scheduler import store as scheduler_store

logger = logging.getLogger(__name__)


class AnalyticsSyncPipeline:
    def __init__(self, interval_seconds: int = 900):
        self.interval_seconds = interval_seconds
        self.is_running = False
        self._last_policybazaar_email_refresh: date | None = None
        self._task: asyncio.Task[None] | None = None

    def start(self) -> None:
        if self.is_running:
            return

        self.is_running = True
        self._task = asyncio.create_task(self._run_loop())
        logger.info("Business analytics sync pipeline started with interval %ss", self.interval_seconds)

    async def stop(self) -> None:
        if not self.is_running:
            return

        self.is_running = False
        if self._task is not None:
            self._task.cancel()
            with suppress(asyncio.CancelledError):
                await self._task
        logger.info("Business analytics sync pipeline stopped")

    async def _run_loop(self) -> None:
        while self.is_running:
            run_id = await self._record(scheduler_store.start_run, "warehouse_sync")
            try:
                logger.info("Warehouse refresh starting")
                loop = asyncio.get_running_loop()
                loaded = await loop.run_in_executor(None, run_full_ingestion)
                logger.info("Warehouse refresh completed. Ingested %s rows.", loaded)
                if run_id:
                    await self._record(scheduler_store.finish_run, run_id, "Success", int(loaded or 0))
                await self._refresh_policybazaar_email_once_per_day(loop)
            except asyncio.CancelledError:
                raise
            except Exception as exc:
                logger.exception("Warehouse refresh failed")
                if run_id:
                    await self._record(scheduler_store.finish_run, run_id, "Failed", None, str(exc))

            await asyncio.sleep(self.interval_seconds)

    @staticmethod
    async def _record(func, *args):
        """Run a scheduler_store call off the event loop; never raise from recording."""
        try:
            loop = asyncio.get_running_loop()
            return await loop.run_in_executor(None, func, *args)
        except Exception:
            logger.exception("Failed to record scheduler run")
            return None

    async def _refresh_policybazaar_email_once_per_day(self, loop: asyncio.AbstractEventLoop) -> None:
        settings = get_settings()
        if not settings.enable_policybazaar_email_ingestion:
            return

        today = date.today()
        if self._last_policybazaar_email_refresh == today:
            return

        logger.info("Renewing Gmail watch and backfilling Policybazaar bike email reports")
        await loop.run_in_executor(None, ensure_gmail_watch)
        result = await loop.run_in_executor(None, backfill_recent_policybazaar_emails)
        self._last_policybazaar_email_refresh = today
        logger.info(
            "Policybazaar email refresh completed. Emails processed=%s, rows upserted=%s",
            result["processed_messages"],
            result["upserted_rows"],
        )
