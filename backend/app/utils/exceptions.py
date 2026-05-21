from fastapi import HTTPException, status


class AuthenticationError(HTTPException):
    def __init__(self, detail="Authentication failed"):
        super().__init__(status_code=status.HTTP_401_UNAUTHORIZED, detail=detail)


class AuthorizationError(HTTPException):
    def __init__(self, detail="Not authorized"):
        super().__init__(status_code=status.HTTP_403_FORBIDDEN, detail=detail)


class NotFoundError(HTTPException):
    def __init__(self, detail="Resource not found"):
        super().__init__(status_code=status.HTTP_404_NOT_FOUND, detail=detail)


class ValidationError(HTTPException):
    def __init__(self, detail="Validation failed"):
        super().__init__(status_code=status.HTTP_400_BAD_REQUEST, detail=detail)


class BlockchainError(HTTPException):
    def __init__(self, detail="Blockchain operation failed"):
        super().__init__(status_code=status.HTTP_502_BAD_GATEWAY, detail=detail)


class IPFSError(HTTPException):
    def __init__(self, detail="IPFS operation failed"):
        super().__init__(status_code=status.HTTP_502_BAD_GATEWAY, detail=detail)
