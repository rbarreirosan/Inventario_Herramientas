# Inventario_Herramientas

App de control de herramientas del taller (Fosa/Arriba).

Frontend en HTML/CSS/JS vanilla (mobile-first, sin frameworks) + backend en
Google Apps Script sobre un Google Sheets. Pensada para desplegarse en
Cloudflare Pages.

## Estado actual

La app arranca en **MODO DEMO**: mientras `js/config.js` no tenga la URL/token
reales, corre con datos de ejemplo (no guarda nada). Sirve para ver la interfaz
funcionando. En cuanto pegues la URL del Web App y el token, empieza a leer y
escribir en el Google Sheets real.

## Estructura

```
index.html            Punto de entrada (carga los scripts en orden)
css/styles.css        Estilos base (el grueso del estilo va inline por componente)
js/config.js          ⚙️ URL del Web App + TOKEN + constantes de dominio
js/demo-data.js       Datos de ejemplo (solo modo demo)
js/api.js             Capa de red hacia Apps Script (GET/POST)
js/store.js           Estado + filtros + agrupación de duplicados
js/render.js          Construcción del DOM de cada pantalla
js/app.js             Orquestador: init, acciones, delegación de eventos
apps-script/Codigo.gs 🔌 Backend: pégalo en el editor de Apps Script del Sheet
_headers              Cabeceras de Cloudflare Pages (cache/seguridad)
```

## Modelo de datos (hojas del Google Sheets)

**Herramientas** (fila 1 = encabezados):

```
ID | Nombre | Marca/Modelo | Categoría | Ubicación | Número de control |
Estado | Prestado a | Fecha préstamo | Última calibración | Próxima calibración
```

- **Ubicación:** `Fosa` o `Arriba`
- **Categoría:** `Herramienta de mano`, `Herramienta especial/eléctrica`,
  `Equipo de medición`, `Equipo fijo`
- **Estado:** `Disponible`, `Prestada`, `En reparación`
- **Número de control:** las piezas duplicadas comparten nombre y llevan sufijo
  `-A`, `-B`, `-C` (p. ej. `AR-HM-015-A`). La app las agrupa visualmente.
- La calibración solo aplica a `Equipo de medición`.

**Historial_Prestamos** (append-only, nunca se borra):

```
ID_Registro | ID_Herramienta | Número de control | Nombre |
Prestado a | Fecha_Prestamo | Fecha_Devolucion | Estatus
```

**Conteos** (un resumen por sesión de conteo):

```
ID_Conteo | Fecha | Total revisadas | En su lugar | Mal ubicadas | Faltantes | Detalle
```

`Detalle` guarda un JSON con las listas de faltantes y mal ubicadas.

## Puesta en marcha del backend (Apps Script)

1. En el Google Sheets crea las tres hojas con los encabezados de arriba
   (`Herramientas` ya la tienes; agrega `Historial_Prestamos` y `Conteos`).
2. **Extensiones → Apps Script**. Borra el contenido y pega
   `apps-script/Codigo.gs`.
3. **Proyecto → Configuración (⚙️) → Propiedades del script** → agrega:
   - `TOKEN` = un texto secreto que tú elijas (p. ej. `taller-2026-x9k2`).
4. **Implementar → Nueva implementación → Aplicación web**:
   - *Ejecutar como:* **Yo** (el dueño de la hoja).
   - *Quién tiene acceso:* **Cualquiera**.
   - Autoriza los permisos cuando lo pida.
5. Copia la **URL** que termina en `/exec`.

> Cada vez que cambies el código del `.gs` debes crear una **nueva versión** de
> la implementación (o "Administrar implementaciones → editar → Versión: nueva")
> para que los cambios surtan efecto.

## Conexión del frontend

Edita `js/config.js`:

```js
const CONFIG = {
  WEB_APP_URL: "https://script.google.com/macros/s/XXXX/exec",
  TOKEN: "taller-2026-x9k2", // el MISMO que pusiste en Script Properties
};
```

Al recargar, el banner amarillo de "modo demo" desaparece y la app trabaja
contra tu Sheets.

## Cómo se comunica (por qué así)

- **Lecturas:** `GET` con query params.
- **Escrituras:** `POST` con `Content-Type: text/plain`. Es intencional: evita
  el *preflight* CORS de `OPTIONS`, que Apps Script no responde. El cuerpo es un
  string JSON `{ action, token, ...payload }`.
- Cada petición incluye el `token`, validado por Apps Script.
- Las escrituras se serializan con `LockService` para evitar choques cuando dos
  personas guardan a la vez.

## Despliegue en Cloudflare Pages

- Conecta el repo en Cloudflare Pages.
- **Build command:** (vacío) · **Build output directory:** `/` (raíz).
- No hay paso de build; se sirven los archivos estáticos tal cual.

## Desarrollo local

Sirve la carpeta con cualquier servidor estático, por ejemplo:

```
python3 -m http.server 8000
```

y abre `http://localhost:8000`. (Abrir `index.html` con `file://` también
funciona en modo demo.)
