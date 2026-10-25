from database import Base, engine
import models


def init_database():
    print("Checking database tables...")

    # Create tables that do not exist yet.
    # Existing tables and their data will not be deleted.
    Base.metadata.create_all(bind=engine)

    print("Database initialization completed.")

    for table_name in Base.metadata.tables:
        print(f"- {table_name}")


if __name__ == "__main__":
    init_database()