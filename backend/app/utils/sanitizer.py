import re
from typing import Annotated

from pydantic.functional_validators import BeforeValidator

TAGS_RE = re.compile(r"<[^>]*>")
JAVASCRIPT_RE = re.compile(r"(javascript|data|vbscript):", re.IGNORECASE)
EVENT_HANDLER_RE = re.compile(r"\bon\w+\s*=", re.IGNORECASE)


def sanitize_text(value: str | None) -> str | None:
    if value is None:
        return None
    value = TAGS_RE.sub("", value)
    value = JAVASCRIPT_RE.sub("blocked:", value)
    value = EVENT_HANDLER_RE.sub("x-blocked=", value)
    value = value.strip()
    return value


def sanitize_required_text(value: str) -> str:
    result = sanitize_text(value)
    return result if result is not None else ""


SanitizedStr = Annotated[str, BeforeValidator(sanitize_required_text)]
SanitizedOptionalStr = Annotated[str | None, BeforeValidator(sanitize_text)]
