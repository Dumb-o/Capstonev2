import pytest
from jose import jwt

from app.config import settings
from app.services.auth_service import create_access_token, decode_token


def test_decode_with_current_secret():
    token = create_access_token("usr_test_1")
    payload = decode_token(token)
    assert payload is not None
    assert payload["sub"] == "usr_test_1"
    assert payload["type"] == "access"


def test_decode_with_old_secret():
    old_secret = "old-test-secret-that-was-rotated"
    token = jwt.encode(
        {"sub": "usr_old", "type": "access"},
        old_secret,
        algorithm=settings.jwt_algorithm,
    )
    settings.jwt_secrets = [old_secret]
    try:
        payload = decode_token(token)
        assert payload is not None
        assert payload["sub"] == "usr_old"
    finally:
        settings.jwt_secrets = []


def test_reject_invalid_secret():
    token = jwt.encode(
        {"sub": "usr_unknown", "type": "access"},
        "some-unknown-secret",
        algorithm=settings.jwt_algorithm,
    )
    settings.jwt_secrets = []
    payload = decode_token(token)
    assert payload is None


def test_rotation_scenario():
    old_secret = "first-secret-00000000000000000000000000"
    token_old = jwt.encode(
        {"sub": "usr_rotate_1", "type": "access"},
        old_secret,
        algorithm=settings.jwt_algorithm,
    )

    new_secret = "second-secret-1111111111111111111111111"
    settings.jwt_secret = new_secret
    settings.jwt_secrets = [old_secret]

    try:
        payload_old = decode_token(token_old)
        assert payload_old is not None
        assert payload_old["sub"] == "usr_rotate_1"

        token_new = create_access_token("usr_rotate_2")
        payload_new = decode_token(token_new)
        assert payload_new is not None
        assert payload_new["sub"] == "usr_rotate_2"

        settings.jwt_secrets = []
        payload_after_cleanup = decode_token(token_old)
        assert payload_after_cleanup is None

        payload_new_still_valid = decode_token(token_new)
        assert payload_new_still_valid is not None
        assert payload_new_still_valid["sub"] == "usr_rotate_2"
    finally:
        settings.jwt_secret = "change-this-to-a-random-secret-in-production"
        settings.jwt_secrets = []
