"""Verificação do ID token do Firebase.

O front já autentica com Firebase (`src/context/AuthContext.tsx`); aqui só validamos
o token que ele manda no `Authorization: Bearer <idToken>` e devolvemos o uid, que é
o que `/me/tracked-candidates` precisa para saber de quem é a lista.
"""

import logging

import firebase_admin
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from firebase_admin import auth as firebase_auth
from firebase_admin import credentials

from .config import Settings, get_settings

logger = logging.getLogger(__name__)

_bearer = HTTPBearer(auto_error=False)


def init_firebase(settings: Settings) -> None:
    """Inicializa o Admin SDK uma vez, no startup. Sem credencial explícita cai nas
    Application Default Credentials."""
    if firebase_admin._apps:
        return
    cred = (
        credentials.Certificate(settings.firebase_credentials_file)
        if settings.firebase_credentials_file
        else credentials.ApplicationDefault()
    )
    firebase_admin.initialize_app(cred)


class AuthenticatedUser:
    """Usuário do Firebase por trás da requisição."""

    def __init__(self, uid: str, email: str | None, email_verified: bool) -> None:
        self.uid = uid
        self.email = email
        self.email_verified = email_verified


def _unauthorized(detail: str) -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail=detail,
        headers={"WWW-Authenticate": "Bearer"},
    )


async def current_user(
    credential: HTTPAuthorizationCredentials | None = Depends(_bearer),
    settings: Settings = Depends(get_settings),
) -> AuthenticatedUser:
    """Exige um ID token válido. Use como dependência nas rotas protegidas."""
    if settings.auth_disabled:
        return AuthenticatedUser(uid="dev", email="dev@local", email_verified=True)

    if credential is None:
        raise _unauthorized("Credencial ausente.")

    try:
        decoded = firebase_auth.verify_id_token(credential.credentials)
    except firebase_auth.ExpiredIdTokenError as err:
        raise _unauthorized("Sessão expirada.") from err
    except firebase_auth.RevokedIdTokenError as err:
        raise _unauthorized("Sessão revogada.") from err
    except Exception as err:
        logger.warning("Falha ao verificar ID token: %s", err)
        raise _unauthorized("Credencial inválida.") from err

    return AuthenticatedUser(
        uid=decoded["uid"],
        email=decoded.get("email"),
        email_verified=bool(decoded.get("email_verified")),
    )
