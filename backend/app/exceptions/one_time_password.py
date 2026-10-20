class OneTimePasswordDoesNotExist(Exception):
    def __init__(self):
        super().__init__("One time password does not exist.")

class OneTimePasswordInvalid(Exception):
    def __init__(self):
        super().__init__("One time password has expired, been used or had too many attempts.")

class OneTimePasswordIncorrect(Exception):
    def __init__(self):
        super().__init__("One time password is incorrect.")
