import { create } from "zustand";
import type { Service, WorkerProfile, Booking } from "@/lib/types";

interface BookingState {
  selectedService: Service | null;
  bookingAddress: string;
  bookingDescription: string;
  bookingLatitude: number | null;
  bookingLongitude: number | null;
  nearbyWorkers: WorkerProfile[];
  currentBooking: Booking | null;
  step: number;
}

interface BookingActions {
  setSelectedService: (service: Service | null) => void;
  setBookingAddress: (address: string) => void;
  setBookingDescription: (desc: string) => void;
  setBookingLocation: (lat: number, lng: number) => void;
  setNearbyWorkers: (workers: WorkerProfile[]) => void;
  setCurrentBooking: (booking: Booking | null) => void;
  setStep: (step: number) => void;
  clearBooking: () => void;
}

const initialState: BookingState = {
  selectedService: null,
  bookingAddress: "",
  bookingDescription: "",
  bookingLatitude: null,
  bookingLongitude: null,
  nearbyWorkers: [],
  currentBooking: null,
  step: 1,
};

export const useBookingStore = create<BookingState & BookingActions>((set) => ({
  ...initialState,

  setSelectedService: (service) => set({ selectedService: service }),
  setBookingAddress: (address) => set({ bookingAddress: address }),
  setBookingDescription: (desc) => set({ bookingDescription: desc }),
  setBookingLocation: (lat, lng) => set({ bookingLatitude: lat, bookingLongitude: lng }),
  setNearbyWorkers: (workers) => set({ nearbyWorkers: workers }),
  setCurrentBooking: (booking) => set({ currentBooking: booking }),
  setStep: (step) => set({ step }),
  clearBooking: () => set(initialState),
}));
