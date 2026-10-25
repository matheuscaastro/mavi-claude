import { describe, expect, it } from "vitest";
import { CPF_PATTERN, maskCpf, maskPhone, PHONE_PATTERN } from "./masks";

describe("maskPhone", () => {
  it("formata celular progressivamente", () => {
    expect(maskPhone("6")).toBe("(6");
    expect(maskPhone("61")).toBe("(61");
    expect(maskPhone("619")).toBe("(61) 9");
    expect(maskPhone("61988")).toBe("(61) 9 88");
    expect(maskPhone("61988887")).toBe("(61) 9 8888-7");
    expect(maskPhone("61988887777")).toBe("(61) 9 8888-7777");
  });
  it("formata fixo com 10 dígitos", () => {
    expect(maskPhone("6133334444")).toBe("(61) 3333-4444");
    expect(maskPhone("61333")).toBe("(61) 333");
  });
  it("limita o tamanho e descarta letras", () => {
    expect(maskPhone("619888877779999")).toBe("(61) 9 8888-7777");
    expect(maskPhone("61a98b88c8777d7")).toBe("(61) 9 8888-7777");
    expect(maskPhone("abc")).toBe("");
    expect(maskPhone("61333344449999")).toBe("(61) 3333-4444");
  });
  it("aceita número colado com +55 e máscara", () => {
    expect(maskPhone("+55 (61) 98888-7777")).toBe("(61) 9 8888-7777");
    expect(maskPhone("5561988887777")).toBe("(61) 9 8888-7777");
  });
  it("apagar o último dígito não trava na máscara", () => {
    expect(maskPhone("(61) ")).toBe("(61");
    expect(maskPhone("(61) 9 ")).toBe("(61) 9");
  });
  it("é idempotente e casa com o pattern quando completo", () => {
    const full = "(61) 9 8888-7777";
    expect(maskPhone(full)).toBe(full);
    expect(new RegExp(`^${PHONE_PATTERN}$`).test(full)).toBe(true);
    expect(new RegExp(`^${PHONE_PATTERN}$`).test("(61) 3333-4444")).toBe(true);
    expect(new RegExp(`^${PHONE_PATTERN}$`).test("(61) 9 8888-77")).toBe(false);
  });
});

describe("maskCpf", () => {
  it("formata progressivamente e limita a 11 dígitos", () => {
    expect(maskCpf("123")).toBe("123");
    expect(maskCpf("1234")).toBe("123.4");
    expect(maskCpf("1234567")).toBe("123.456.7");
    expect(maskCpf("1234567890")).toBe("123.456.789-0");
    expect(maskCpf("12345678901")).toBe("123.456.789-01");
    expect(maskCpf("123456789012345")).toBe("123.456.789-01");
  });
  it("descarta letras e símbolos", () => {
    expect(maskCpf("12a3.4b5")).toBe("123.45");
    expect(maskCpf("abc")).toBe("");
  });
  it("pattern só aceita CPF completo", () => {
    expect(new RegExp(`^${CPF_PATTERN}$`).test("123.456.789-01")).toBe(true);
    expect(new RegExp(`^${CPF_PATTERN}$`).test("123.456.789-0")).toBe(false);
  });
});
