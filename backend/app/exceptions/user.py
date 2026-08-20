class UserAlreadyExists(Exception):
    def __init__(self, email: str):
        self.email = email
        super().__init__(f"{email} is already taken.")

class UserEmailDoesNotExist(Exception):
    def __init__(self, email: str):
        self.email = email
        super().__init__(f"{email} does not exist.")

class UserGoogleIdDoesNotExist(Exception):
    def __init__(self):
        super().__init__(f"User with this Google ID does not exist.")

class UserIdDoesNotExist(Exception):
    def __init__(self, user_id: int):
        super().__init__(f"User with ID '{str(user_id)}' does not exists.")
