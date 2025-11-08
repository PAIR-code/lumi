"""Test database query directly"""

import asyncio
import json

from surrealdb import Surreal


async def main():
    db = Surreal("ws://localhost:8000/rpc")
    await db.connect()
    await db.signin({"user": "root", "pass": "root"})
    await db.use("lumi", "lumi")

    # Test UPDATE query
    record_id = "document_versions:2401_00002_v1"
    test_data = json.dumps([{"title": "Test Section", "text": "Test content"}])

    print(f"Attempting UPDATE on {record_id}")
    print(f"Test data: {test_data[:100]}")

    # Try the same format as import_service.py
    result = await db.query(
        f"""
        UPDATE {record_id} SET
            sections = $sections,
            test_field = 'test_value'
    """,
        {"sections": test_data},
    )

    print(f"\n✅ UPDATE result: {result}")
    print(f"Result type: {type(result)}")

    # Now query back to see if it was saved
    check = await db.select(record_id)
    print(f"\n📋 After UPDATE, fields present: {list(check.keys())}")
    print(f"Has sections: {bool(check.get('sections'))}")
    print(f"Has test_field: {bool(check.get('test_field'))}")

    await db.close()


if __name__ == "__main__":
    asyncio.run(main())
