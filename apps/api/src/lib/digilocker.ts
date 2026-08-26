interface DigiLockerResponse {
  verified: boolean;
  name: string;
  dob: string;
  aadhaarNumber: string;
  gender?: string;
  address?: string;
}

export async function verifyAadhaar(
  aadhaarNumber: string
): Promise<{ verified: boolean; name: string; dob: string }> {
  if (!/^\d{12}$/.test(aadhaarNumber)) {
    return { verified: false, name: "", dob: "" };
  }

  return {
    verified: true,
    name: "Demo Citizen",
    dob: "1990-01-15",
  };
}

export async function fetchDigilockerDocument(
  _documentType: string,
  _referenceId: string
): Promise<{ success: boolean; data?: Record<string, unknown>; error?: string }> {
  return {
    success: true,
    data: {
      documentType: "AADHAAR",
      name: "Demo Citizen",
      dob: "1990-01-15",
      gender: "M",
      aadhaarNumber: "****-****-1234",
      address: "123 Demo Street, Demo City, Demo State - 110001",
    },
  };
}

export default { verifyAadhaar, fetchDigilockerDocument };
