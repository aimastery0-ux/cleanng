from rest_framework import serializers
from .models import Review


class ReviewSerializer(serializers.ModelSerializer):
    author_name = serializers.CharField(source="author.full_name", read_only=True)

    class Meta:
        model = Review
        fields = ("id", "booking", "author", "author_name", "target", "rating", "comment", "created_at")
        read_only_fields = ("id", "author", "created_at")
