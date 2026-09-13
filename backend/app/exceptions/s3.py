class S3ClientException(Exception):
    def __init__(self, message: str = "An error occurred with object storage."):
        super().__init__(message)
