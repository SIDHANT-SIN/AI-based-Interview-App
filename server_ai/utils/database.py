import os
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

load_dotenv()

# We use a class to hold the connection state globally
class Database:
    client: AsyncIOMotorClient = None
    db = None

db_instance = Database()

async def connect_to_mongo():
    """Creates the MongoDB connection pool when FastAPI starts."""
    if db_instance.client is not None:
        return
    mongo_uri = os.getenv("MONGO_URI")
    
    if not mongo_uri:
        raise ValueError("🚨 MONGO_URI is missing from your .env file!")

    print("🔄 Connecting to MongoDB...")
    # Motor automatically handles connection pooling behind the scenes!
    db_instance.client = AsyncIOMotorClient(mongo_uri)
    
    # Select the specific database name you want to use (it creates it if it doesn't exist)
    db_instance.db = db_instance.client["hiregraph_db"]
    
    # Ping the database to ensure the connection works
    try:
        await db_instance.client.admin.command('ping')
        print("✅ Successfully connected to MongoDB Atlas!")
    except Exception as e:
        print(f"❌ Failed to connect to MongoDB: {e}")

async def close_mongo_connection():
    """Closes the MongoDB connection gracefully when FastAPI shuts down."""
    if db_instance.client:
        print("🛑 Closing MongoDB connection...")
        db_instance.client.close()
        print("✅ MongoDB connection closed.")

def get_db():
    """Helper function to inject the database into FastAPI routes."""
    return db_instance.db