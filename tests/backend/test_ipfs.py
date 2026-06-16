import pytest
from app.services import ipfs_service


@pytest.mark.asyncio
async def test_upload_file_empty():
    result = await ipfs_service.upload_file_bytes(b"", "test.txt")
    assert "cid" in result


@pytest.mark.asyncio
async def test_file_exists_invalid_cid():
    result = await ipfs_service.file_exists("QmInvalidCID")
    assert result is False
