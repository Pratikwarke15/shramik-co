import asyncio
import os

import asyncpg

from . import config


class Database:
    """
    Single shared asyncpg connection guarded by an asyncio.Lock.

    Mirrors the operational constraint of Supabase's transaction pooler
    (connection_limit=1): every query runs sequentially on one connection,
    so concurrent Prisma-style parallel queries (P2024) are impossible.
    statement_cache_size=0 is required because pgbouncer (transaction mode)
    does not support prepared statements.
    """

    def __init__(self):
        self._conn: asyncpg.Connection | None = None
        self._lock = asyncio.Lock()
        self._url = config.DATABASE_URL.replace("postgres://", "postgresql://", 1)

    async def connect(self):
        if self._conn is None:
            self._conn = await asyncpg.connect(
                self._url, timeout=30, statement_cache_size=0
            )

    async def disconnect(self):
        if self._conn is not None:
            await self._conn.close()
            self._conn = None

    async def _execute_locked(self, fn, *args, **kwargs):
        await self.connect()
        async with self._lock:
            return await fn(*args, **kwargs)

    async def fetch(self, query: str, *args):
        return await self._execute_locked(
            lambda: self._conn.fetch(query, *args)
        )

    async def fetchrow(self, query: str, *args):
        return await self._execute_locked(
            lambda: self._conn.fetchrow(query, *args)
        )

    async def fetchval(self, query: str, *args):
        return await self._execute_locked(
            lambda: self._conn.fetchval(query, *args)
        )

    async def execute(self, query: str, *args):
        return await self._execute_locked(
            lambda: self._conn.execute(query, *args)
        )


db = Database()


def row_to_dict(record) -> dict | None:
    if record is None:
        return None
    return dict(record)


def rows_to_dicts(records) -> list[dict]:
    return [dict(r) for r in records]
