from django.core.management.base import BaseCommand

from accounts.models import User

DEMO_PASSWORD = "Demo@1234"  # development only; change before any real use

USERS = [
    ("owner", "Owner", "OWNER", True),
    ("counter", "Counter", "COUNTER", False),
    ("storekeeper", "Storekeeper", "STOREKEEPER", False),
]


class Command(BaseCommand):
    help = "Create demo users for development (owner, counter, storekeeper)."

    def handle(self, *args, **options):
        for username, first, role, is_admin in USERS:
            user, created = User.objects.get_or_create(
                username=username,
                defaults={"first_name": first, "role": role, "is_staff": is_admin, "is_superuser": is_admin},
            )
            if created:
                user.set_password(DEMO_PASSWORD)
                user.save()
            self.stdout.write(f"{'created' if created else 'exists '} {username} ({role})")
