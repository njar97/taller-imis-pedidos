import { describe, it, expect } from "vitest";
import { htmlComparativoCotizaciones } from "./comparativo.js";

const foto = url => [{ tipo: "image/jpeg", nombre: "f.jpg", supabaseUrl: url }];
const cot = (tela, precio, unit, imagenes) => ({
  cliente: "SEDAS",
  tipoPrenda: "Camisa de mantenimiento — " + tela,
  tela,
  color: "Azul navy",
  precio,
  tallasItems: [{ talla: "Única", qty: 6, precio: unit }],
  imagenes,
});

describe("htmlComparativoCotizaciones", () => {
  // SEDAS #80 y #81 son la misma camisa en dos telas y apuntan al MISMO
  // archivo de foto: repetirla en cada tarjeta no compara nada.
  it("sube la foto al encabezado cuando todas las opciones comparten la misma", () => {
    const url = "https://x.supabase.co/foto.jpg";
    const html = htmlComparativoCotizaciones([
      cot("Dril Bonel Startex", "168", 28, foto(url)),
      cot("Dacrón", "150", 25, foto(url)),
    ]);
    expect(html.match(/class="hero"/g)).toHaveLength(1);
    expect(html).not.toContain('class="foto"');
    expect(html.match(new RegExp(url, "g"))).toHaveLength(1);
  });

  it("deja la foto en cada tarjeta cuando son distintas", () => {
    const html = htmlComparativoCotizaciones([
      cot("Dril Bonel Startex", "168", 28, foto("https://x.supabase.co/a.jpg")),
      cot("Dacrón", "150", 25, foto("https://x.supabase.co/b.jpg")),
    ]);
    expect(html).not.toContain('class="hero"');
    expect(html.match(/class="foto"/g)).toHaveLength(2);
  });

  it("cada opción sale con su tela y su precio por unidad", () => {
    const html = htmlComparativoCotizaciones([
      cot("Dril Bonel Startex", "168", 28, foto("https://x.supabase.co/a.jpg")),
      cot("Dacrón", "150", 25, foto("https://x.supabase.co/a.jpg")),
    ]);
    expect(html).toContain("Dril Bonel Startex");
    expect(html).toContain("Dacrón");
    expect(html).toContain("$28");
    expect(html).toContain("$25");
    expect(html).toContain("$168");
    expect(html).toContain("$150");
  });
});
