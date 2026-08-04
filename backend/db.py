import psycopg2
from psycopg2.extras import RealDictCursor
from config import settings


def get_connection():
    return psycopg2.connect(
        host=settings.db_host,
        port=settings.db_port,
        database=settings.db_name,
        user=settings.db_user,
        password=settings.db_password
    )

def get_cursor(conn):
    return conn.cursor(cursor_factory=RealDictCursor)