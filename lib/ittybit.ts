import { IttybitClient } from "@ittybit/sdk";

export const ittybit = new IttybitClient({
  apiKey: process.env.ITTYBIT_API_KEY!,
});
