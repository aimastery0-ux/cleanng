def save_profile(backend, user, response, *args, **kwargs):
    """Set email_verified and create role profile after Google OAuth."""
    if backend.name == "google-oauth2":
        if not user.is_email_verified:
            user.is_email_verified = True
            user.save(update_fields=["is_email_verified"])

        # Avatar from Google
        picture = response.get("picture", "")
        if picture and not user.avatar_url:
            user.avatar_url = picture
            user.save(update_fields=["avatar_url"])
