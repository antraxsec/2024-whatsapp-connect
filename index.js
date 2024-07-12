const express = require("express");
const wppconnect = require("@wppconnect-team/wppconnect");
const bodyParser = require("body-parser");
const cors = require("cors");
const app = express();

app.use(bodyParser.json());
app.use(cors());

let client;

// Funciones auxiliares
let datosAPI = [];

async function consumir_api(codigo) {
  const datos = new FormData();
  datos.append("codigo", codigo);
  const config = {
    method: "GET",
  };
  const respuesta = await fetch(
    `https://multilaptops.net/api/productosdisp?token=j6UWgtktboQBFD4G`,
    config
  );
  const data = await respuesta.json();
  await aplanar(data.datos);
}

async function aplanar(productos) {
  let datosFinal = [];
  for (let key in productos) {
    let producto = productos[key];
    let obj = {
      id_producto: producto.id_producto,
      cantidad: producto.cantidad,
      descripcion_producto: producto.descripcion_producto,
      nombre_linea: producto.nombre_linea,
      nombre_marca: producto.nombre_marca,
      nombre_modelo: producto.nombre_modelo,
      nombre_subcategoria: producto.nombre_subcategoria,
      referencia_producto: producto.referencia_producto,
      titulo_categoria: producto.titulo_categoria,
      titulo_departamento: producto.titulo_departamento,
      valor_precio: producto.costo_avg,
      simbolo_moneda: producto.simbolo_moneda,
      ruta_img: producto.imagenes[0]?.ruta_img || null,
    };

    for (let espKey in producto.especificacion) {
      let especificacion = producto.especificacion[espKey];
      let textoSinEspacios = especificacion.cualidad.split(" ").join("");
      let textoSinParentesis = textoSinEspacios.replace(/[()]/g, "");
      obj[textoSinParentesis] = especificacion.referencia_esp;
    }

    datosFinal.push(obj);
  }

  datosAPI = datosFinal;
  console.log(datosAPI);
  return datosFinal;
}

// Crear una sesión de WPPConnect
wppconnect
  .create({
    session: "sessionName",
    headless: false,
    useChrome: true,
  })
  .then((newClient) => {
    client = newClient;
    start(client);
  })
  .catch((error) => {
    console.log(error);
  });

function start(client) {
  client.onMessage(async (message) => {
    // Aquí va la lógica para manejar los mensajes entrantes
  });
}

app.post("/send-message", async (req, res) => {
  const { number, action, data } = req.body;
  console.log(number, action, data);
  try {
    switch (action) {
      case "promocion":
        await promocionFlow(number);
        break;
      case "producto":
        await reenviaProductoSKU(data, false, number);
        break;
      case "ubicacion":
        await reenviarUbicacion(number);
        break;
      case "procesoCompra":
        await reenviarProcesoCompra(number);
        break;
      case "formasPago":
        await reenviarFormasPago(number);
        break;
      case "chatGPT":
        await asistenteGPT(number);
        break;
      default:
        res.send({ status: "error", error: "Acción no válida" });
        return;
    }
    res.send({ status: "success" });
  } catch (error) {
    res.send({ status: "error", error });
  }
});

app.listen(3000, () => {
  console.log("Server is running on port 3000");
});

// Funciones para manejar los diferentes flujos
async function promocionFlow(contactId) {
  const contact = `591${contactId}@c.us`;

  await client.sendText(
    contact,
    `¡Compra ahora! No dejes que se agoten las existencias.`
  );

  const imagen1 =
    "https://multilaptops.net/recursos/imagenes/productos/banner/301744/2078365941.jpg";
  const productoTexto1 = [
    `👉🏻 Revisa nuestra tienda y descubre imágenes en alta resolución de este increíble equipo.`,
    ``,
    `*Samsung 100205* Intel Core i5-1235U 4,40 Ghz, 10-cores, 12a Gen. RAM 8GB/512GB SSD NVMe, 15,6 IPS FULLHD, Win11 Original, Español, Metálico`,
    ``,
    `💸 Bs. 5200.00 - Solo hasta agotar stock`,
    `🔗 Consíguelo aquí: https://multilaptops.net/producto/100205?t=wab&mkt=siat`,
  ].join("\n");
  await client.sendImage(contact, imagen1, "Samsung 100205", productoTexto1);

  // Repite para las demás imágenes y textos de productos
}

async function reenviaProductoSKU(data, isReflow, contactId) {
  const array = data.split(",");
  const contact = `591${contactId}@c.us`;

  for (const elemento of array) {
    let datosproducto = await producto(elemento);
    if (datosproducto) {
      if (!datosproducto.ruta_img) {
        await client.sendText(
          contact,
          `
-----------------------------------
*Código SKU:* ${datosproducto.id_producto}
*Producto:* ${datosproducto.nombre_marca} ${datosproducto.nombre_linea}
*Procesador:* ${datosproducto.Procesador}
*Memoria RAM:* ${datosproducto.MemoriaRAM}
*Almacenamiento:* ${datosproducto.UnidaddeestadosolidoSSD}
*Pantalla:* ${datosproducto.Pantalla}
*Gráficos:* ${datosproducto.Gráficos}
-----------------------------------
*Precio:* Actualizado solo en la Web ⬇️ 
*Más detalles:* https://multilaptops.net/producto/${datosproducto.id_producto}
-----------------------------------`
        );
      } else {
        const fotoProdeuctoUno = `https://multilaptops.net/${datosproducto.ruta_img}`;
        await client.sendImage(
          contact,
          fotoProdeuctoUno,
          "Producto",
          `
-----------------------------------
*Código SKU:* ${datosproducto.id_producto}
*Producto:* ${datosproducto.nombre_marca} ${datosproducto.nombre_linea}
*Procesador:* ${datosproducto.Procesador}
*Memoria RAM:* ${datosproducto.MemoriaRAM}
*Almacenamiento:* ${datosproducto.UnidaddeestadosolidoSSD}
*Pantalla:* ${datosproducto.Pantalla}
*Gráficos:* ${datosproducto.Gráficos}
-----------------------------------
*Precio:* Actualizado solo en la Web ⬇️ 
*Más detalles:* https://multilaptops.net/producto/${datosproducto.id_producto}
-----------------------------------`
        );
      }
    }
  }
}

async function reenviarUbicacion(contactId) {
  const contact = `591${contactId}@c.us`;
  const imagen =
    "https://multilaptops.net/recursos/imagenes/tiendaonline/mapa-uyustus2.webp";
  const texto = [
    `👉 Visítanos en *Multilaptops* - Ubicados en Calle Uyustus #990 (Esquina Calatayud, primera casa bajando por la acera izquierda), La Paz - Bolivia`,
    ``,
    `▸ Atendemos con cita previa de lunes a sábado.`,
    `▸ Durante feriados y días festivos, solo atendemos compras previamente confirmadas.`,
    ``,
    `Encuentra nuestra ubicación aquí: https://goo.gl/maps/g3gX5UsfrCkL2r7g8`,
    ``,
    `🚩 Recuerda agendar tu visita para una mejor atención. ¡Te esperamos con gusto! 😊`,
  ].join("\n");
  await client.sendImage(contact, imagen, "Ubicación", texto);
}

async function reenviarProcesoCompra(contactId) {
  const contact = `591${contactId}@c.us`;

  await client.sendText(contact, `*¿Como comprar en Multilaptops?* 🛒💻`);
  await client.sendText(
    contact,
    [
      `Comprar en Multilaptops es fácil, cómodo y rápido: olvídate de los bloqueos, marchas y tráfico. `,
      ``,
      `Nuestra tienda en línea multi.bz está abierta 24/7 🕒, permitiéndote explorar, realizar tus pedidos, compras y reservas a cualquier hora y desde cualquier lugar. 📦🛍️`,
    ].join("\n")
  );

  const imagen1 =
    "https://multilaptops.net/recursos/imagenes/tiendaonline/procesocompra-2/1.webp";
  const texto1 = [
    `▸ Elige el producto que deseas comprar`,
    `▸ Envíanos el código SKU del producto elegido`,
  ].join("\n");
  await client.sendImage(contact, imagen1, "Paso 1", texto1);

  // Repite para los demás pasos
}

async function reenviarFormasPago(contactId) {
  const contact = `591${contactId}@c.us`;

  await client.sendText(contact, `*¿Como pagar en Multilaptops?* 🛒💻`);
  await client.sendText(
    contact,
    [
      `Puedes realizar el pago de tus compras con 💳 diferentes medios y combinarlos en caso de que lo requieras 🛍️ `,
    ].join("\n")
  );

  const imagen1 =
    "https://multilaptops.net/recursos/imagenes/tiendaonline/formaspago/1.webp";
  const texto1 = [
    ``,
    `*Transferencia bancaria:*`,
    `▸ Seleccionando este medio de pago se desplegará toda la información con las cuentas habilitadas.`,
    `▸ Una vez realizado la transferencia, debe subir el comprobante de pago.`,
  ].join("\n");
  await client.sendImage(contact, imagen1, "Transferencia", texto1);

  // Repite para las demás formas de pago
}

async function asistenteGPT(contactId) {
  const contact = `591${contactId}@c.us`;
  await client.sendText(contact, `Hola soy tu asistente virtual`);
}

function producto(codigo) {
  return datosAPI.find((elemento) => elemento.id_producto === codigo);
}

consumir_api(777);