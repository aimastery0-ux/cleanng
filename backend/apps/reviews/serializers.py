from rest_framework import serializers
from .models import Review
from apps.bookings.models import Booking


class ReviewSerializer(serializers.ModelSerializer):
    author_name = serializers.CharField(source="author.full_name", read_only=True)
    author_avatar = serializers.URLField(source="author.avatar_url", read_only=True)

    class Meta:
        model = Review
        fields = (
            "id", "booking", "author", "author_name", "author_avatar",
            "target", "rating", "comment", "created_at",
        )
        read_only_fields = ("id", "author", "author_name", "author_avatar", "created_at")


class CreateReviewSerializer(serializers.Serializer):
    booking_id = serializers.IntegerField()
    rating = serializers.IntegerField(min_value=1, max_value=5)
    comment = serializers.CharField(required=False, allow_blank=True, max_length=1000)

    def validate(self, data):
        request = self.context["request"]
        user = request.user

        try:
            booking = Booking.objects.select_related(
                "customer", "cleaner__user"
            ).get(pk=data["booking_id"])
        except Booking.DoesNotExist:
            raise serializers.ValidationError({"booking_id": "Booking not found."})

        if booking.customer != user:
            raise serializers.ValidationError({"booking_id": "You can only review bookings you made."})

        if booking.status != Booking.Status.COMPLETED:
            raise serializers.ValidationError({"booking_id": "You can only review completed bookings."})

        if Review.objects.filter(booking=booking, author=user).exists():
            raise serializers.ValidationError({"booking_id": "You have already reviewed this booking."})

        data["_booking"] = booking
        data["_target"] = booking.cleaner.user
        return data
