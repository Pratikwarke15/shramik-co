"""
DigiLocker verification (dummy implementation mirroring apps/api/src/lib/digilocker.ts).

Returns verified for any valid 12-digit Aadhaar number. In production this
would call the real DigiLocker REST API with OAuth2. The offline Aadhaar QR/XML
crypto verification lives in app/aadhaar.py and is used by the verification
service for the QR/XML Aadhaar endpoints.
"""

import re

from ..errors import AppError


async def verify_aadhaar(aadhaar_number: str) -> dict:
    """Mirror of verifyAadhaar() in digilocker.ts."""
    if not aadhaar_number or not re.fullmatch(r"\d{12}", aadhaar_number):
        return {"verified": False, "name": "", "dob": ""}
    return {"verified": True, "name": "Demo Citizen", "dob": "1990-01-15"}


async def fetch_digilocker_document(document_type: str, reference_id: str) -> dict:
    """Mirror of fetchDigilockerDocument() in digilocker.ts."""
    return {
        "success": True,
        "data": {
            "documentType": "AADHAAR",
            "name": "Demo Citizen",
            "dob": "1990-01-15",
            "gender": "M",
            "aadhaarNumber": "****-****-1234",
            "address": "123 Demo Street, Demo City, Demo State - 110001",
        },
    }
