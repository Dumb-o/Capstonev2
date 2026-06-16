from fastapi import HTTPException, status

from app.utils.error_codes import ErrorCodes


class AuthenticationError(HTTPException):
    def __init__(self, detail="Authentication failed", code=ErrorCodes.AUTH_INVALID_TOKEN):
        self.code = code
        super().__init__(status_code=status.HTTP_401_UNAUTHORIZED, detail=detail)


class AuthorizationError(HTTPException):
    def __init__(self, detail="Not authorized", code=ErrorCodes.AUTHZ_FORBIDDEN):
        self.code = code
        super().__init__(status_code=status.HTTP_403_FORBIDDEN, detail=detail)


class NotFoundError(HTTPException):
    def __init__(self, detail="Resource not found", code=ErrorCodes.NOT_FOUND_USER):
        self.code = code
        super().__init__(status_code=status.HTTP_404_NOT_FOUND, detail=detail)


class ValidationError(HTTPException):
    def __init__(self, detail="Validation failed", code=ErrorCodes.VALIDATION_ERROR):
        self.code = code
        super().__init__(status_code=status.HTTP_400_BAD_REQUEST, detail=detail)


class BlockchainError(HTTPException):
    def __init__(self, detail="Blockchain operation failed", code=ErrorCodes.BLOCKCHAIN_ERROR):
        self.code = code
        super().__init__(status_code=status.HTTP_502_BAD_GATEWAY, detail=detail)


class IPFSError(HTTPException):
    def __init__(self, detail="IPFS operation failed", code=ErrorCodes.IPFS_UPLOAD_FAILED):
        self.code = code
        super().__init__(status_code=status.HTTP_502_BAD_GATEWAY, detail=detail)


class ConflictError(HTTPException):
    def __init__(self, detail="Conflict", code=ErrorCodes.VALIDATION_EMAIL_EXISTS):
        self.code = code
        super().__init__(status_code=status.HTTP_409_CONFLICT, detail=detail)
