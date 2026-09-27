class PasswordResetTokenDoesNotExist(Exception):
    def __init__(self):
        super().__init__("Password reset token does not exist.")

class PasswordResetTokenInvalid(Exception):
    def __init__(self):
        super().__init__("Password reset token has expired or has already been used.")
