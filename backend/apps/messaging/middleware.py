from urllib.parse import parse_qs
from channels.middleware import BaseMiddleware
from channels.db import database_sync_to_async
from django.contrib.auth.models import AnonymousUser


class JWTAuthMiddleware(BaseMiddleware):
    """Authenticates WebSocket connections via ?token=<access_token> query param."""

    async def __call__(self, scope, receive, send):
        query_string = scope.get("query_string", b"").decode()
        params = parse_qs(query_string)
        token = params.get("token", [None])[0]
        scope["user"] = await self._get_user(token)
        return await super().__call__(scope, receive, send)

    @database_sync_to_async
    def _get_user(self, token):
        if not token:
            return AnonymousUser()
        try:
            from rest_framework_simplejwt.tokens import AccessToken
            from django.contrib.auth import get_user_model
            payload = AccessToken(token)
            User = get_user_model()
            return User.objects.get(pk=payload["user_id"])
        except Exception:
            return AnonymousUser()
