import { api } from "./client";
import { Address } from "../types";

export function listAddresses() {
  return api.get<Address[]>("/addresses");
}

export function createAddress(input: {
  label: string;
  street: string;
  city: string;
  lat: number;
  lng: number;
}) {
  return api.post<Address>("/addresses", input);
}
