"""Transactional + alert email delivery over SMTP.

Runs blocking smtplib work in a thread so it never stalls the event loop.
If SMTP isn't configured (local dev), emails are logged instead of sent.
"""

from __future__ import annotations

import asyncio
import smtplib
from email.message import EmailMessage

from app.core.config import settings
from app.core.logging import get_logger

logger = get_logger("email")


def _send_sync(msg: EmailMessage) -> None:
    with smtplib.SMTP(settings.smtp_host, settings.smtp_port, timeout=20) as server:
        server.starttls()
        if settings.smtp_user:
            server.login(settings.smtp_user, settings.smtp_password)
        server.send_message(msg)


async def send_email(
    to: list[str],
    subject: str,
    html: str,
    text: str | None = None,
) -> tuple[bool, str | None]:
    recipients = [r for r in to if r]
    if not recipients:
        return False, "No recipients"

    if not settings.smtp_user or not settings.smtp_password:
        logger.info(
            "email_skipped_no_smtp", to=recipients, subject=subject
        )
        return False, "SMTP not configured (email logged, not sent)"

    msg = EmailMessage()
    msg["From"] = settings.smtp_from
    msg["To"] = ", ".join(recipients)
    msg["Subject"] = subject
    msg.set_content(text or "This message requires an HTML-capable email client.")
    msg.add_alternative(html, subtype="html")

    try:
        await asyncio.to_thread(_send_sync, msg)
        logger.info("email_sent", to=recipients, subject=subject)
        return True, None
    except Exception as exc:  # noqa: BLE001
        logger.error("email_failed", to=recipients, subject=subject, error=str(exc))
        return False, str(exc)
