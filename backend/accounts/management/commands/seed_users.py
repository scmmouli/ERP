from django.core.management.base import BaseCommand

from accounts.models import User

DEMO_PASSWORD = "Demo@1234"  # development only. On a server always pass --password.

USERS = [
    ("owner", "Owner", "OWNER", True),
    ("counter", "Counter", "COUNTER", False),
    ("storekeeper", "Storekeeper", "STOREKEEPER", False),
]


class Command(BaseCommand):
    help = "Create the owner, counter and storekeeper users."

    def add_arguments(self, parser):
        parser.add_argument("--password", default=DEMO_PASSWORD, help="Password for the users that get created.")
        parser.add_argument("--reset", action="store_true", help="Also set this password on users that already exist.")

    def handle(self, *args, **options):
        password = options["password"]
        for username, first, role, is_admin in USERS:
            user, created = User.objects.get_or_create(
                username=username,
                defaults={"first_name": first, "role": role, "is_staff": is_admin, "is_superuser": is_admin},
            )
            if created or options["reset"]:
                user.set_password(password)
                user.save()
            state = "created" if created else ("password reset" if options["reset"] else "exists")
            self.stdout.write(f"{state:14} {username} ({role})")
