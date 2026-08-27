class AppError(Exception):
    """Business-logic error mapped to an HTTP response (success:false, error)."""

    def __init__(self, message: str, status_code: int = 400):
        self.message = message
        self.status_code = status_code
        super().__init__(message)
