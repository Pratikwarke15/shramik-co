import axios from "axios";

export async function sendOTPSms(phone: string, otp: string): Promise<boolean> {
  try {
    const apiKey = process.env.SMS_API_KEY;
    if (!apiKey) {
      console.log(`[DEV MODE] OTP for ${phone}: ${otp}`);
      return true;
    }
    const url = `https://2factor.in/API/V1/${apiKey}/SMS/${phone}/${otp}`;
    const { data } = await axios.get(url);
    if (data.Status === "Success") {
      console.log(`OTP sent to ${phone}`);
      return true;
    }
    console.error("SMS failed:", data);
    return false;
  } catch (error) {
    console.error("SMS error, falling back to console:", error);
    console.log(`[DEV MODE] OTP for ${phone}: ${otp}`);
    return false;
  }
}
