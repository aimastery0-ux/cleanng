"""
Seed the database with demo cleaners, customers, services, and availability.
Usage: python manage.py seed_demo
"""
import random
from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import time, timedelta
from apps.accounts.models import User
from apps.profiles.models import CleanerProfile, CustomerProfile, Address, Availability
from apps.services.models import Service


LAGOS_AREAS = [
    {"area": "Lekki Phase 1", "city": "Lagos", "lat": 6.4330, "lng": 3.4850},
    {"area": "Victoria Island", "city": "Lagos", "lat": 6.4281, "lng": 3.4219},
    {"area": "Ikeja", "city": "Lagos", "lat": 6.6018, "lng": 3.3515},
    {"area": "Yaba", "city": "Lagos", "lat": 6.5085, "lng": 3.3740},
    {"area": "Ajah", "city": "Lagos", "lat": 6.4687, "lng": 3.5880},
    {"area": "Ikoyi", "city": "Lagos", "lat": 6.4474, "lng": 3.4399},
]

CLEANER_DATA = [
    {
        "first_name": "Amaka", "last_name": "Okafor",
        "bio": "Professional cleaner with 5 years experience in residential deep cleaning.",
        "years_experience": 5, "base_hourly_rate": 5000,
    },
    {
        "first_name": "Emeka", "last_name": "Nwosu",
        "bio": "Certified cleaning professional specialising in office and commercial spaces.",
        "years_experience": 7, "base_hourly_rate": 6500,
    },
    {
        "first_name": "Chidinma", "last_name": "Eze",
        "bio": "Detail-oriented cleaner. I treat your home like my own.",
        "years_experience": 3, "base_hourly_rate": 4000,
    },
    {
        "first_name": "Tunde", "last_name": "Adeyemi",
        "bio": "Post-construction specialist with a team of trained professionals.",
        "years_experience": 8, "base_hourly_rate": 8000,
    },
    {
        "first_name": "Ngozi", "last_name": "Obiora",
        "bio": "Eco-friendly cleaning with organic products. Great for families with children.",
        "years_experience": 4, "base_hourly_rate": 5500,
    },
]


class Command(BaseCommand):
    help = "Seed the database with demo data"

    def add_arguments(self, parser):
        parser.add_argument("--clear", action="store_true", help="Clear existing demo data first")

    def handle(self, *args, **options):
        if options["clear"]:
            User.objects.filter(email__endswith="@demo.cleanng.com").delete()
            self.stdout.write("Cleared existing demo data.")

        self._create_admin()
        cleaners = self._create_cleaners()
        customers = self._create_customers()
        self.stdout.write(self.style.SUCCESS(
            f"Seeded: 1 admin, {len(cleaners)} cleaners, {len(customers)} customers"
        ))

    def _create_admin(self):
        admin, created = User.objects.get_or_create(
            email="admin@demo.cleanng.com",
            defaults={
                "first_name": "Admin", "last_name": "CleanNG",
                "role": User.Role.ADMIN, "is_staff": True, "is_superuser": True,
                "is_email_verified": True,
            },
        )
        if created:
            admin.set_password("Admin1234!")
            admin.save()
        return admin

    def _create_cleaners(self):
        cleaners = []
        for i, data in enumerate(CLEANER_DATA):
            area = LAGOS_AREAS[i % len(LAGOS_AREAS)]
            email = f"cleaner{i+1}@demo.cleanng.com"
            user, created = User.objects.get_or_create(
                email=email,
                defaults={
                    "first_name": data["first_name"], "last_name": data["last_name"],
                    "role": User.Role.CLEANER, "is_email_verified": True,
                    "phone": f"+234801000{i+10:04d}",
                },
            )
            if created:
                user.set_password("Cleaner1234!")
                user.save()

            profile, _ = CleanerProfile.objects.get_or_create(
                user=user,
                defaults={
                    "bio": data["bio"],
                    "years_experience": data["years_experience"],
                    "base_hourly_rate": data["base_hourly_rate"],
                    "service_areas": [area["area"], LAGOS_AREAS[(i + 1) % len(LAGOS_AREAS)]["area"]],
                    "is_verified": True,
                    "verification_status": CleanerProfile.VerificationStatus.APPROVED,
                    "rating_avg": round(random.uniform(4.0, 5.0), 1),
                    "rating_count": random.randint(5, 50),
                    "is_featured": i < 2,
                },
            )

            self._create_services(profile)
            self._create_availability(profile)
            cleaners.append(profile)

        return cleaners

    def _create_customers(self):
        customers = []
        for i in range(5):
            area = LAGOS_AREAS[i % len(LAGOS_AREAS)]
            email = f"customer{i+1}@demo.cleanng.com"
            user, created = User.objects.get_or_create(
                email=email,
                defaults={
                    "first_name": f"Customer{i+1}",
                    "last_name": "Demo",
                    "role": User.Role.CUSTOMER,
                    "is_email_verified": True,
                    "phone": f"+234802000{i+10:04d}",
                },
            )
            if created:
                user.set_password("Customer1234!")
                user.save()

            CustomerProfile.objects.get_or_create(user=user)
            Address.objects.get_or_create(
                user=user,
                defaults={
                    "label": "Home",
                    "line1": f"{random.randint(1, 100)} Demo Street",
                    "area": area["area"],
                    "city": area["city"],
                    "latitude": area["lat"],
                    "longitude": area["lng"],
                    "is_default": True,
                },
            )
            customers.append(user)

        return customers

    def _create_services(self, profile):
        service_types = [
            (Service.ServiceType.REGULAR, "Regular Home Cleaning", 4500),
            (Service.ServiceType.DEEP, "Deep Cleaning", 8000),
            (Service.ServiceType.OFFICE, "Office Cleaning", 6000),
        ]
        for stype, title, price in service_types[:2]:
            Service.objects.get_or_create(
                cleaner=profile,
                type=stype,
                defaults={
                    "title": title,
                    "description": f"Professional {title.lower()} service.",
                    "price": profile.base_hourly_rate or price,
                    "pricing_unit": Service.PricingUnit.PER_HOUR,
                    "is_active": True,
                },
            )

    def _create_availability(self, profile):
        for day in range(5):  # Mon-Fri
            Availability.objects.get_or_create(
                cleaner=profile,
                day_of_week=day,
                defaults={"start_time": time(8, 0), "end_time": time(18, 0)},
            )
