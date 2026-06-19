"""
Targeted force cleanup for a specific wallet user and all their dependent records.

This is designed for local development only.

Run:
  python -m scripts.force_cleanup_user
"""

import asyncio

from sqlalchemy import delete, text

from app.database import async_session_factory


TARGET_USER_ID = "usr_c62c05836928"


async def run() -> None:
    async with async_session_factory() as db:
        await db.execute(text("SET session_replication_role = 'replica'"))

        print("Deleting dependent data for user:", TARGET_USER_ID)

        # Order matters: leaf tables first, up to jobs, then user
        await db.execute(text("DELETE FROM disputes WHERE resolved_by = :uid").bindparams(uid=TARGET_USER_ID))
        await db.execute(text("""
            DELETE FROM contract_milestones
            WHERE contract_id IN (
                SELECT id FROM contracts WHERE client_id = :uid OR freelancer_id = :uid
            )
        """).bindparams(uid=TARGET_USER_ID))
        await db.execute(text("""
            DELETE FROM messages
            WHERE sender_id = :uid OR receiver_id = :uid
        """).bindparams(uid=TARGET_USER_ID))
        await db.execute(text("""
            DELETE FROM threads
            WHERE client_id = :uid OR freelancer_id = :uid
        """).bindparams(uid=TARGET_USER_ID))
        await db.execute(text("""
            DELETE FROM proposals
            WHERE freelancer_id = :uid
        """).bindparams(uid=TARGET_USER_ID))
        await db.execute(text("""
            DELETE FROM contracts
            WHERE client_id = :uid OR freelancer_id = :uid
        """).bindparams(uid=TARGET_USER_ID))
        await db.execute(text("""
            DELETE FROM jobs
            WHERE client_id = :uid
        """).bindparams(uid=TARGET_USER_ID))
        await db.execute(text("""
            DELETE FROM notifications
            WHERE user_id = :uid
        """).bindparams(uid=TARGET_USER_ID))
        await db.execute(text("""
            DELETE FROM admin_accounts
            WHERE user_id = :uid
        """).bindparams(uid=TARGET_USER_ID))
        await db.execute(text("""
            DELETE FROM users
            WHERE id = :uid
        """).bindparams(uid=TARGET_USER_ID))

        await db.commit()
        print("Done.")


def main() -> None:
    try:
        asyncio.run(run())
    except Exception as e:
        print(f"Force cleanup failed: {e}")
        raise SystemExit(1)


if __name__ == "__main__":
    main()
