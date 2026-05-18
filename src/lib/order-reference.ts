import { randomInt } from "node:crypto";

const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const referenceLength = 8;

export function createOrderReference() {
  let suffix = "";

  for (let index = 0; index < referenceLength; index += 1) {
    suffix += alphabet[randomInt(alphabet.length)];
  }

  return `CT-${suffix}`;
}
