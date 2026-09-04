from sqlalchemy.orm import Session

from app.models import AuditLog, new_id, utcnow


def write_audit(db: Session, *, actor: str, action: str, purpose: str, resource_type: str = "", resource_id: str = "") -> None:
    db.add(
        AuditLog(
            id=new_id(),
            actor=actor,
            action=action,
            purpose=purpose,
            resource_type=resource_type,
            resource_id=resource_id,
            timestamp=utcnow(),
            immutable=True,
        )
    )
    db.commit()
