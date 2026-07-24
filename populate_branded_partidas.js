import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env' });

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

const partidas = [
  { codigo: "BR-201", tipo_trabajo: "Sofá 440x280x75", descripcion: "Estructura fabricada en madera de tornillo, tejido con cuerda sintética, tapizado.", cantidad_total: 12, cantidad_realizada: 0, unidad: "pz", precio_unitario: 102850, precio_total: 1234200 },
  { codigo: "BR-211", tipo_trabajo: "Sofa chaise 190x85x57", descripcion: "Estructura fabricada en madera de tornillo, tejido con cuerda sintética, tapizado.", cantidad_total: 15, cantidad_realizada: 0, unidad: "pz", precio_unitario: 59400, precio_total: 891000 },
  { codigo: "BR-216", tipo_trabajo: "Sofa bed 188x105x63 Right", descripcion: "Estructura fabricada en madera de tornillo, tejido con cuerda sintética, tapizado.", cantidad_total: 12, cantidad_realizada: 0, unidad: "pz", precio_unitario: 36900, precio_total: 442800 },
  { codigo: "BR-216-SUB", tipo_trabajo: "Mecanismo de sofa cama", descripcion: "Mecanismo de sofa cama para BR-216", cantidad_total: 12, cantidad_realizada: 0, unidad: "pz", precio_unitario: 7100, precio_total: 85200 },
  { codigo: "BR-225", tipo_trabajo: "Family L sofá 287x315x75", descripcion: "Tapizado. No incluye tela.", cantidad_total: 3, cantidad_realizada: 0, unidad: "pz", precio_unitario: 47700, precio_total: 143100 },
  { codigo: "BR-229", tipo_trabajo: "Sofa chaise 173x105x63", descripcion: "Estructura fabricada en madera de tornillo, tejido con cuerda sintética, tapizado.", cantidad_total: 3, cantidad_realizada: 0, unidad: "pz", precio_unitario: 32400, precio_total: 97200 },
  { codigo: "BR-229-SUB", tipo_trabajo: "Mecanismo de sofa cama", descripcion: "Mecanismo de sofa cama para BR-229", cantidad_total: 3, cantidad_realizada: 0, unidad: "pz", precio_unitario: 7100, precio_total: 21300 },
  { codigo: "BR-231", tipo_trabajo: "Shaped sofá 350x350x75", descripcion: "Estructura fabricada en madera de tornillo, tejido con cuerda sintética, tapizado.", cantidad_total: 3, cantidad_realizada: 0, unidad: "pz", precio_unitario: 102300, precio_total: 306900 },
  { codigo: "BR-301", tipo_trabajo: "Ks headboard 366x10x925", descripcion: "Estructura en triplay para recibir tableros en MDF tapizados en piel", cantidad_total: 16, cantidad_realizada: 0, unidad: "pz", precio_unitario: 25200, precio_total: 403200 },
  { codigo: "BR-301.2", tipo_trabajo: "Ks headboard 337x10x925", descripcion: "Estructura en triplay para recibir tableros en MDF tapizados en piel", cantidad_total: 16, cantidad_realizada: 0, unidad: "pz", precio_unitario: 25200, precio_total: 403200 },
  { codigo: "BR-302", tipo_trabajo: "Base cama king 199x207x23", descripcion: "Tableros en triplay, boquilla, zoclo y patas en madera de tornillo.", cantidad_total: 32, cantidad_realizada: 0, unidad: "pz", precio_unitario: 16800, precio_total: 537600 },
  { codigo: "BR-303", tipo_trabajo: "Cabecera QS 592X10X112 - left", descripcion: "Estructura en triplay para recibir tableros en MDF tapizados en piel", cantidad_total: 16, cantidad_realizada: 0, unidad: "pz", precio_unitario: 31800, precio_total: 508800 },
  { codigo: "BR-303.1", tipo_trabajo: "Cabecera QS 598X10X112 - right", descripcion: "Estructura en triplay para recibir tableros en MDF tapizados en piel", cantidad_total: 16, cantidad_realizada: 0, unidad: "pz", precio_unitario: 31800, precio_total: 508800 },
  { codigo: "BR-304", tipo_trabajo: "Desk 100x47.5x76", descripcion: "Base fabricada en madera de tornillo", cantidad_total: 30, cantidad_realizada: 0, unidad: "pz", precio_unitario: 7900, precio_total: 237000 },
  { codigo: "BR-304-SUB", tipo_trabajo: "Cubierta fusion multicolor 2 cm", descripcion: "Cubierta fusion multicolor 2 cm de espesor", cantidad_total: 30, cantidad_realizada: 0, unidad: "pz", precio_unitario: 11700, precio_total: 351000 },
  { codigo: "BR-305", tipo_trabajo: "TV console bedroom type 1 620x50x290", descripcion: "Fabricada en madera de tornillo, cajones con corredera cierre suave.", cantidad_total: 12, cantidad_realizada: 0, unidad: "pz", precio_unitario: 70000, precio_total: 840000 },
  { codigo: "BR-305-SUB", tipo_trabajo: "Cubierta en marmol Amber brown 2cm", descripcion: "Cubierta en marmol Amber brown 2cm, cantos pulidos", cantidad_total: 12, cantidad_realizada: 0, unidad: "pz", precio_unitario: 16100, precio_total: 193200 },
  { codigo: "BR-306", tipo_trabajo: "Large nightstand 90x50x55", descripcion: "Fabricado en madera de tornillo con 2 cajones", cantidad_total: 15, cantidad_realizada: 0, unidad: "pz", precio_unitario: 15300, precio_total: 229500 },
  { codigo: "BR-306-SUB", tipo_trabajo: "Cubierta fusion multicolor 2 cm", descripcion: "Cubierta fusion multicolor 2 cm de espesor", cantidad_total: 15, cantidad_realizada: 0, unidad: "pz", precio_unitario: 11700, precio_total: 175500 },
  { codigo: "BR-307", tipo_trabajo: "Small nightstand 60x50x56", descripcion: "Fabricado en madera de tornillo con 2 cajones", cantidad_total: 108, cantidad_realizada: 0, unidad: "pz", precio_unitario: 11500, precio_total: 1242000 },
  { codigo: "BR-307-SUB", tipo_trabajo: "Cubierta fusion multicolor 2 cm", descripcion: "Cubierta fusion multicolor 2 cm de espesor", cantidad_total: 108, cantidad_realizada: 0, unidad: "pz", precio_unitario: 8300, precio_total: 896400 },
  { codigo: "BR-308", tipo_trabajo: "Base QS 158x207x23", descripcion: "Tableros en triplay, boquilla, zoclo y patas en madera de tornillo.", cantidad_total: 72, cantidad_realizada: 0, unidad: "pz", precio_unitario: 14200, precio_total: 1022400 },
  { codigo: "BR-309", tipo_trabajo: "Storage unit 270x50x55", descripcion: "Fabricada en triplay chapa de tornillo, con repisas internas", cantidad_total: 30, cantidad_realizada: 0, unidad: "pz", precio_unitario: 47950, precio_total: 1438500 },
  { codigo: "BR-309-SUB", tipo_trabajo: "Cubierta de granito Caledonia", descripcion: "Cubierta de granito Caledonia Flameado cepillado 4 cm", cantidad_total: 30, cantidad_realizada: 0, unidad: "pz", precio_unitario: 9950, precio_total: 298500 },
  { codigo: "BR-310", tipo_trabajo: "TV console bedroom type 1 240x62x290", descripcion: "Fabricada en madera de tornillo, cajones con corredera", cantidad_total: 15, cantidad_realizada: 0, unidad: "pz", precio_unitario: 39900, precio_total: 598500 },
  { codigo: "BR-310-SUB", tipo_trabajo: "Cubierta en marmol Amber brown 2cm", descripcion: "Cubierta en marmol Amber brown 2cm", cantidad_total: 15, cantidad_realizada: 0, unidad: "pz", precio_unitario: 6700, precio_total: 100500 },
  { codigo: "BR-311", tipo_trabajo: "Armoire 140x64x84", descripcion: "Estructura en MDF con aplicación de laca craqueleada verde", cantidad_total: 15, cantidad_realizada: 0, unidad: "pz", precio_unitario: 19800, precio_total: 297000 },
  { codigo: "BR-311-SUB", tipo_trabajo: "Cubierta antique brown 2cm", descripcion: "Cubierta antique brown 2cm de espesor", cantidad_total: 15, cantidad_realizada: 0, unidad: "pz", precio_unitario: 10300, precio_total: 154500 },
  { codigo: "BR-312", tipo_trabajo: "Shelf 348x40x35", descripcion: "Fabricada en triplay chapa de encino entintado negro", cantidad_total: 3, cantidad_realizada: 0, unidad: "pz", precio_unitario: 31700, precio_total: 95100 },
  { codigo: "BR-314", tipo_trabajo: "TV console 467x62x290", descripcion: "Fabricada en madera de tornillo, cajones con corredera", cantidad_total: 3, cantidad_realizada: 0, unidad: "pz", precio_unitario: 59100, precio_total: 177300 },
  { codigo: "BR-314-SUB", tipo_trabajo: "Cubierta en marmol Amber brown 2cm", descripcion: "Cubierta en marmol Amber brown 2cm", cantidad_total: 3, cantidad_realizada: 0, unidad: "pz", precio_unitario: 9800, precio_total: 29400 },
  { codigo: "BR-315", tipo_trabajo: "Cabecera QS 513X10X112", descripcion: "Estructura en triplay para recibir tableros en MDF tapizados", cantidad_total: 3, cantidad_realizada: 0, unidad: "pz", precio_unitario: 36400, precio_total: 109200 },
  { codigo: "BR-401", tipo_trabajo: "Main Hall 200x47x91", descripcion: "Fabricada en madera de tornillo con preparación para mármol", cantidad_total: 15, cantidad_realizada: 0, unidad: "pz", precio_unitario: 18600, precio_total: 279000 },
  { codigo: "BR-401-SUB", tipo_trabajo: "Cubierta de mármol Fusión multicolor", descripcion: "Cubierta de mármol Fusión multicolor con nariz perimetral de 8 cm", cantidad_total: 15, cantidad_realizada: 0, unidad: "pz", precio_unitario: 17500, precio_total: 262500 },
  { codigo: "BR-403", tipo_trabajo: "Desk 224x50x75", descripcion: "Estructura en PRT forrado en triplay chapa de tornillo", cantidad_total: 3, cantidad_realizada: 0, unidad: "pz", precio_unitario: 18600, precio_total: 55800 },
  { codigo: "BR-403-SUB", tipo_trabajo: "Cubierta en marmol Amber brown 2cm", descripcion: "Cubierta en marmol Amber brown 2cm con nariz perimetral", cantidad_total: 3, cantidad_realizada: 0, unidad: "pz", precio_unitario: 12200, precio_total: 36600 },
  { codigo: "BR-406", tipo_trabajo: "Terrace console 180x45x69", descripcion: "Fabricado en madera de tornillo, detalle con tejido de cuerda", cantidad_total: 4, cantidad_realizada: 0, unidad: "pz", precio_unitario: 16500, precio_total: 66000 },
  { codigo: "BR-406-SUB", tipo_trabajo: "Cubierta en marmol Amber brown 2cm", descripcion: "Cubierta en marmol Amber brown 2cm", cantidad_total: 4, cantidad_realizada: 0, unidad: "pz", precio_unitario: 12500, precio_total: 50000 },
  { codigo: "BR-413", tipo_trabajo: "MESA DE CENTRO 0.70ØX0.50-0.67", descripcion: "Base en madera de rosa morada gurbiada entintada color negro", cantidad_total: 12, cantidad_realizada: 0, unidad: "pz", precio_unitario: 24000, precio_total: 288000 },
  { codigo: "BR-413-SUB", tipo_trabajo: "Cubierta en marmol Antique brown 2cm", descripcion: "Cubierta en marmol Antique brown 2cm cantos pulidos", cantidad_total: 12, cantidad_realizada: 0, unidad: "pz", precio_unitario: 7500, precio_total: 90000 },
  { codigo: "BR-422", tipo_trabajo: "Exterior console 133x45x69", descripcion: "Fabricado en madera de tornillo, detalle con tejido de cuerda", cantidad_total: 6, cantidad_realizada: 0, unidad: "pz", precio_unitario: 12200, precio_total: 73200 },
  { codigo: "BR-422-SUB", tipo_trabajo: "Cubierta en marmol Amber brown 2cm", descripcion: "Cubierta en marmol Amber brown 2cm", cantidad_total: 6, cantidad_realizada: 0, unidad: "pz", precio_unitario: 9700, precio_total: 58200 },
  { codigo: "BR-605", tipo_trabajo: "Bathtub try 93x30x6", descripcion: "Fabricado en madera de parota", cantidad_total: 15, cantidad_realizada: 0, unidad: "pz", precio_unitario: 5300, precio_total: 79500 },
  { codigo: "BR-603.1", tipo_trabajo: "Tray bath tub 25x45x4", descripcion: "Fabricado en madera de parota con insertos en madera de tornillo", cantidad_total: 59, cantidad_realizada: 0, unidad: "pz", precio_unitario: 1650, precio_total: 97350 },
  { codigo: "BR-603.3", tipo_trabajo: "Armoire try 29x39x4", descripcion: "Fabricado en madera de parota con insertos en madera de tornillo", cantidad_total: 30, cantidad_realizada: 0, unidad: "pz", precio_unitario: 1800, precio_total: 54000 },
  { codigo: "BR-603.4", tipo_trabajo: "Armoire try 50x60x15", descripcion: "Fabricado en madera de parota con insertos en madera de tornillo", cantidad_total: 14, cantidad_realizada: 0, unidad: "pz", precio_unitario: 2250, precio_total: 31500 }
];

async function updateBranded() {
  const { data, error } = await supabase
    .from('proyecto')
    .update({ partidas_cotizacion: partidas })
    .ilike('descripcion', '%Ritz-Carlton%')
    .select();

  if (error) console.error("Error:", error);
  else console.log("✔ Partidas cargadas exitosamente a Ritz-Carlton Branded. Total productos:", partidas.length);
}

updateBranded();
