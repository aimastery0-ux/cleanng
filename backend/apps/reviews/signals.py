from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver
from django.db.models import Avg, Count
from .models import Review


def _recompute_rating(target_user):
    try:
        profile = target_user.cleaner_profile
    except Exception:
        return
    stats = Review.objects.filter(
        target=target_user, is_hidden=False
    ).aggregate(avg=Avg("rating"), count=Count("id"))
    profile.rating_avg = stats["avg"] or 0
    profile.rating_count = stats["count"] or 0
    profile.save(update_fields=["rating_avg", "rating_count"])


@receiver(post_save, sender=Review)
def on_review_saved(sender, instance, **kwargs):
    _recompute_rating(instance.target)


@receiver(post_delete, sender=Review)
def on_review_deleted(sender, instance, **kwargs):
    _recompute_rating(instance.target)
