from datetime import date, datetime, timedelta
from rest_framework import serializers
from django.utils import timezone
from .models import Booking, BookingStatusLog, Dispute
from apps.profiles.models import CleanerProfile, Address
from apps.services.models import Service


class BookingStatusLogSerializer(serializers.ModelSerializer):
    actor_name = serializers.CharField(source="actor.full_name", default="System", read_only=True)

    class Meta:
        model = BookingStatusLog
        fields = ("id", "from_status", "to_status", "actor_name", "note", "created_at")


class BookingSerializer(serializers.ModelSerializer):
    customer_name = serializers.CharField(source="customer.full_name", read_only=True)
    customer_avatar = serializers.URLField(source="customer.avatar_url", read_only=True)
    cleaner_name = serializers.CharField(source="cleaner.user.full_name", read_only=True)
    cleaner_avatar = serializers.URLField(source="cleaner.user.avatar_url", read_only=True)
    cleaner_profile_id = serializers.IntegerField(source="cleaner.id", read_only=True)
    service_title = serializers.CharField(source="service.title", read_only=True)
    service_type = serializers.CharField(source="service.type", read_only=True)
    service_pricing_unit = serializers.CharField(source="service.pricing_unit", read_only=True)
    address_label = serializers.CharField(source="address.label", read_only=True)
    address_line1 = serializers.CharField(source="address.line1", read_only=True)
    address_area = serializers.CharField(source="address.area", read_only=True)
    status_logs = BookingStatusLogSerializer(many=True, read_only=True)
    can_cancel = serializers.SerializerMethodField()
    can_dispute = serializers.SerializerMethodField()
    can_review = serializers.SerializerMethodField()

    class Meta:
        model = Booking
        fields = (
            "id",
            "customer", "customer_name", "customer_avatar",
            "cleaner", "cleaner_name", "cleaner_avatar", "cleaner_profile_id",
            "service", "service_title", "service_type", "service_pricing_unit",
            "address", "address_label", "address_line1", "address_area",
            "scheduled_date", "scheduled_time",
            "status",
            "total_amount", "commission_amount", "payout_amount",
            "notes", "cancellation_reason",
            "can_cancel", "can_dispute", "can_review",
            "status_logs",
            "created_at", "updated_at",
        )
        read_only_fields = (
            "id", "status", "commission_amount", "payout_amount",
            "can_cancel", "can_dispute", "can_review", "status_logs",
            "created_at", "updated_at",
        )

    def get_can_cancel(self, obj) -> bool:
        if obj.status not in (Booking.Status.PENDING, Booking.Status.ACCEPTED):
            return False
        scheduled_dt = datetime.combine(obj.scheduled_date, obj.scheduled_time)
        scheduled_dt = timezone.make_aware(scheduled_dt)
        return scheduled_dt - timezone.now() > timedelta(hours=24)

    def get_can_dispute(self, obj) -> bool:
        return obj.status in (
            Booking.Status.ACCEPTED,
            Booking.Status.IN_PROGRESS,
            Booking.Status.COMPLETED,
        )

    def get_can_review(self, obj) -> bool:
        request = self.context.get("request")
        if not request or not request.user.is_authenticated:
            return False
        if obj.status != Booking.Status.COMPLETED:
            return False
        if obj.customer != request.user:
            return False
        from apps.reviews.models import Review
        return not Review.objects.filter(booking=obj, author=request.user).exists()


class CreateBookingSerializer(serializers.Serializer):
    cleaner_id = serializers.IntegerField()
    service_id = serializers.IntegerField()
    address_id = serializers.IntegerField()
    scheduled_date = serializers.DateField()
    scheduled_time = serializers.TimeField()
    notes = serializers.CharField(required=False, allow_blank=True, max_length=1000)

    def validate_scheduled_date(self, value):
        if value < date.today():
            raise serializers.ValidationError("Scheduled date must be in the future.")
        return value

    def validate(self, data):
        # Validate cleaner exists and is approved
        try:
            cleaner = CleanerProfile.objects.select_related("user").get(
                pk=data["cleaner_id"], is_verified=True, verification_status="APPROVED"
            )
        except CleanerProfile.DoesNotExist:
            raise serializers.ValidationError({"cleaner_id": "Cleaner not found or not verified."})

        # Validate service belongs to cleaner and is active
        try:
            service = Service.objects.get(
                pk=data["service_id"], cleaner=cleaner, is_active=True
            )
        except Service.DoesNotExist:
            raise serializers.ValidationError({"service_id": "Service not found or inactive."})

        # Validate address belongs to requesting user
        request = self.context.get("request")
        try:
            address = Address.objects.get(pk=data["address_id"], user=request.user)
        except Address.DoesNotExist:
            raise serializers.ValidationError({"address_id": "Address not found."})

        # Check cleaner availability on the scheduled day (0=Mon, 6=Sun)
        scheduled_day = data["scheduled_date"].weekday()
        if not cleaner.availabilities.filter(day_of_week=scheduled_day).exists():
            raise serializers.ValidationError(
                {"scheduled_date": "The cleaner is not available on that day."}
            )

        # Check for availability exception (cleaner marked day off)
        from apps.profiles.models import AvailabilityException
        exception = AvailabilityException.objects.filter(
            cleaner=cleaner, date=data["scheduled_date"]
        ).first()
        if exception and not exception.is_available:
            raise serializers.ValidationError(
                {"scheduled_date": "The cleaner is not available on that date."}
            )

        # Compute total from service price
        data["_cleaner"] = cleaner
        data["_service"] = service
        data["_address"] = address
        data["_total_amount"] = service.price
        return data

    def create_booking(self, customer) -> Booking:
        from django.conf import settings
        rate = getattr(settings, "PLATFORM_COMMISSION_RATE", 0.175)
        data = self.validated_data
        booking = Booking.objects.create(
            customer=customer,
            cleaner=data["_cleaner"],
            service=data["_service"],
            address=data["_address"],
            scheduled_date=data["scheduled_date"],
            scheduled_time=data["scheduled_time"],
            notes=data.get("notes", ""),
            total_amount=data["_total_amount"],
            commission_amount=0,
            payout_amount=0,
            status=Booking.Status.PENDING,
        )
        BookingStatusLog.objects.create(
            booking=booking,
            from_status="",
            to_status=Booking.Status.PENDING,
            actor=customer,
            note="Booking created",
        )
        # Schedule auto-decline after 24h
        from .tasks import auto_decline_booking
        auto_decline_booking.apply_async(
            args=[booking.id],
            countdown=86400,  # 24 hours
        )
        return booking


class CancelBookingSerializer(serializers.Serializer):
    reason = serializers.CharField(max_length=500, required=False, allow_blank=True)


class DisputeSerializer(serializers.ModelSerializer):
    raised_by_name = serializers.CharField(source="raised_by.full_name", read_only=True)

    class Meta:
        model = Dispute
        fields = (
            "id", "booking", "raised_by", "raised_by_name",
            "reason", "description", "status", "resolution", "created_at",
        )
        read_only_fields = ("id", "raised_by", "raised_by_name", "status", "resolution", "created_at")
