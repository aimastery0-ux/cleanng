from django.db.models.signals import post_save
from django.dispatch import receiver
from .models import User


@receiver(post_save, sender=User)
def create_user_profile(sender, instance, created, **kwargs):
    if not created:
        return

    if instance.role == User.Role.CLEANER:
        from apps.profiles.models import CleanerProfile
        CleanerProfile.objects.get_or_create(user=instance)
    elif instance.role == User.Role.CUSTOMER:
        from apps.profiles.models import CustomerProfile
        CustomerProfile.objects.get_or_create(user=instance)

    # Send email verification (non-blocking)
    from .services import send_verification_email
    send_verification_email(instance)
