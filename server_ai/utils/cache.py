import os
import redis.asyncio as redis
from dotenv import load_dotenv

load_dotenv()

# Global redis client instance
_redis_client = None

async def connect_to_redis():
    """Initializes the Redis connection."""
    global _redis_client
    if _redis_client is not None:
        return _redis_client
    redis_url = os.getenv("REDIS_URL")
    
    if not redis_url:
        print("⚠️ REDIS_URL is missing from environment variables. Caching disabled.")
        return None

    try:
        # decode_responses=True is a massive time-saver. 
        # It automatically converts Redis bytes into clean Python strings!
        _redis_client = redis.from_url(
            redis_url,
            decode_responses=True,
            socket_connect_timeout=15, # Increased from 5s: Upstash free tier databases pause when inactive and take time to wake up!
            socket_timeout=15,         # Increased to give enough time for cold starts
            socket_keepalive=True,     # Keeps the connection from dropping randomly
        )
        
        # Ping the server to verify the connection works
        await _redis_client.ping()
        print("✅ Successfully connected to Redis Cache!")
    except Exception as e:
        print(f"❌ Failed to connect to Redis: {e}")
        _redis_client = None

def get_redis():
    """Returns the active Redis client instance."""
    return _redis_client

async def close_redis_connection():
    """Closes the Redis connection gracefully on server shutdown."""
    global _redis_client
    if _redis_client:
        await _redis_client.close()
        print("🔌 Redis connection closed.")