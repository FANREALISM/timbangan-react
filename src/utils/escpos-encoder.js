/**
 * Simple ESC/POS Encoder for Thermal Printers
 * Supports basic formatting: font size, alignment, and text
 */
export class EscPosEncoder {
  constructor() {
    this.buffer = [];
  }

  // Initialize printer
  initialize() {
    this.buffer.push(0x1b, 0x40);
    return this;
  }

  // Align: 0=left, 1=center, 2=right
  align(value) {
    this.buffer.push(0x1b, 0x61, value);
    return this;
  }

  // Bold: 0=off, 1=on
  bold(value) {
    this.buffer.push(0x1b, 0x45, value);
    return this;
  }

  // Font size: 0=normal, 1=double height, 16=double width, 17=double height + width
  size(value) {
    this.buffer.push(0x1d, 0x21, value);
    return this;
  }

  // Add text
  text(str) {
    const encoder = new TextEncoder();
    const bytes = encoder.encode(str);
    this.buffer.push(...bytes);
    return this;
  }

  // New line
  line(count = 1) {
    for (let i = 0; i < count; i++) {
      this.buffer.push(0x0a);
    }
    return this;
  }

  // Cut paper
  cut() {
    this.buffer.push(0x1d, 0x56, 0x00);
    return this;
  }

  // Get raw bytes as Uint8Array
  encode() {
    return new Uint8Array(this.buffer);
  }
}
