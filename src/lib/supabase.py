"""
Supabase client initialization for backend API.
"""
import os
from typing import Optional

try:
    from supabase import create_client, Client
except ImportError:
    Client = None
    create_client = None

_supabase_client: Optional[Client] = None


def get_supabase_client() -> Client:
    """
    Get or create Supabase client instance.
    Uses environment variables for configuration.
    """
    global _supabase_client

    if _supabase_client is None:
        supabase_url = os.environ.get("VITE_SUPABASE_URL", "").strip()
        supabase_key = os.environ.get("VITE_SUPABASE_ANON_KEY", "").strip()

        if not supabase_url or not supabase_key:
            raise RuntimeError("Missing Supabase environment variables: VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY required")

        if create_client is None:
            raise RuntimeError("supabase-py library not installed. Install with: pip install supabase")

        _supabase_client = create_client(supabase_url, supabase_key)

    return _supabase_client
