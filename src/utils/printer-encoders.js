/**
 * TSPL (TSC Label Printer) Encoder
 */
export class TsplEncoder {
  constructor() {
    this.buffer = "";
  }

  initialize(width = 40, height = 30) {
    this.buffer = `SIZE ${width} mm,${height} mm\nGAP 2 mm,0 mm\nDIRECTION 1\nCLS\n`;
    return this;
  }

  text(x, y, text, font = "ROMAN.TTF", x_multi = 1, y_multi = 1) {
    this.buffer += `TEXT ${x},${y},"${font}",0,${x_multi},${y_multi},"${text}"\n`;
    return this;
  }

  barcode(x, y, code, type = "128", height = 50) {
    this.buffer += `BARCODE ${x},${y},"${type}",${height},1,0,2,2,"${code}"\n`;
    return this;
  }

  print() {
    this.buffer += "PRINT 1,1\n";
    return this.encode();
  }

  encode() {
    return new TextEncoder().encode(this.buffer);
  }
}

/**
 * ZPL (Zebra Label Printer) Encoder
 */
export class ZplEncoder {
  constructor() {
    this.buffer = "^XA";
  }

  text(x, y, text, font = "0", height = 30) {
    this.buffer += `^FO${x},${y}^A${font},${height}^FD${text}^FS`;
    return this;
  }

  barcode(x, y, code, height = 50) {
    this.buffer += `^FO${x},${y}^BY2^BCN,${height},Y,N,N^FD${code}^FS`;
    return this;
  }

  print() {
    this.buffer += "^XZ";
    return this.encode();
  }

  encode() {
    return new TextEncoder().encode(this.buffer);
  }
}
