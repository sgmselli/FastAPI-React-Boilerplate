class InvalidImage(Exception):
    def __init__(self, message: str = "The uploaded file is not a valid image."):
        super().__init__(message)
