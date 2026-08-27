import os

import requests

from .. import config


async def send_otp_sms(phone: str, otp: str) -> bool:
    api_key = config.SMS_API_KEY
    if not api_key:
        print(f"[DEV MODE] OTP for {phone}: {otp}")
        return True
    url = f"https://2factor.in/API/V1/{api_key}/SMS/{phone}/{otp}"
    try:
        resp = requests.get(url, timeout=15)
        data = resp.json()
        if data.get("Status") == "Success":
            print(f"OTP sent to {phone}")
            return True
        print("SMS failed:", data)
        return False
    except Exception:
        print(f"[DEV MODE] OTP for {phone}: {otp}")
        return False
