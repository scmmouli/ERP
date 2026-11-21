from django.contrib.auth.models import AbstractUser
from django.db import models


class User(AbstractUser):
    class Role(models.TextChoices):
        OWNER = "OWNER", "Owner"
        COUNTER = "COUNTER", "Counter staff"
        STOREKEEPER = "STOREKEEPER", "Store keeper"

    role = models.CharField(max_length=20, choices=Role.choices, default=Role.COUNTER)
