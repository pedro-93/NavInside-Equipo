# NavInside · versión de Cristian con recorridos accesibles integrados

Base recibida el 25 de noviembre de 2026: navegación Wi-Fi en movimiento, vista de mapa tipo Waze y vista clásica con fotografías. Esta integración conserva el motor nuevo y restaura los desvíos accesibles hacia tenis, piscina principal y piscina temperada.

- Ejecutar: `npm ci`, después `npm start` (puerto 4301).
- Verificaciones: `npm run lint`, `npm test -- --watch=false`, `npm run test:maps`, `npm run build`.
- Las longitudes nuevas calculadas desde el plano se indican como aproximadas; no sustituyen mediciones en terreno.
- El archivo `src/assets/mapa-radio/mapa-radio.json` recibido contiene cero muestras de recorridos. Las capturas de puntos existentes siguen disponibles. Las muestras guardadas en otro teléfono requieren exportación/importación desde el panel de navegación Wi-Fi.
- El ZIP recibido sí trae `NavInside-Hippocampus-debug.apk`. Esa APK corresponde a la base de Cristian y no incorpora los cambios posteriores de esta integración. Los binarios no se incluyen en el repositorio: generar una APK nueva con `CREAR-APK-ANDROID.bat` para probar estos cambios en Android.
- Se excluyó Galaxy A31 conforme a la solicitud de Pedro; se conserva el inventario adicional del nivel 3.

Detalles y límites de verificación: [docs/Validacion-integracion-Cristian.md](docs/Validacion-integracion-Cristian.md).

---

# NavInside · Navegación Wi-Fi en movimiento · 25 de noviembre de 2026

> **Esta carpeta es una copia mejorada.** El proyecto original `NavInside-Wifi-Analyzer` no se modificó.
>
> Novedad: **cursor Wi-Fi que sigue a la persona mientras camina, sin conectarse a ninguna red y sin Internet**. Usa escaneos pasivos y activos de las redes cercanas, Wi-Fi RTT si está disponible, pasos del acelerómetro y un filtro de partículas sobre los pasillos. También incluye un levantamiento del mapa de radio por pasillo. Guía completa: [docs/Navegacion-WiFi-Movimiento.md](docs/Navegacion-WiFi-Movimiento.md).
>
> Primero instala las dependencias de esta carpeta con `npm ci` (o ejecuta `CREAR-APK-ANDROID.bat`).
>
> También: **pantalla principal tipo Waze** (plano a pantalla completa, buscador «¿Adónde vas?» con voz y todos los puntos de interés, Explora y Tour 360), **metraje de todos los niveles** (medido o ≈ aproximado; la voz de la guía no cambia), **íconos para los puntos sin foto** y **Wi-Fi visible solo en modo administrador** (PIN inicial 2468; cámbialo). Detalle: [docs/Vista-tipo-Waze-y-metraje.md](docs/Vista-tipo-Waze-y-metraje.md).

# NavInside · WiFi Analyzer y Aquí estoy · 17 de noviembre de 2026

**Esta versión muestra «Aquí estoy» en la barra superior, junto a «Atrás» y, en Android, «Salir».** Al pulsarlo se abre y enfoca la confirmación de ubicación, incluso sin Wi-Fi. Durante una búsqueda de redes, el botón conserva su nombre y permite confirmar manualmente.

## Ejecutar en VS Code (Windows)

1. Detén la instancia anterior con `Ctrl+C` y descomprime este ZIP en una carpeta nueva.
2. Abre la carpeta nueva `NavInside-Wifi-Analyzer` en VS Code.
3. Ejecuta en la terminal:

```powershell
npm ci
npm start
```

Abre http://localhost:4301 y recarga con `Ctrl+F5`. El proyecto no incluye `node_modules`.

Si sigues ejecutando la carpeta anterior, verás la versión anterior. Descargar este ZIP tampoco actualiza una APK ya instalada: para Android, ejecuta `CREAR-APK-ANDROID.bat` con Node.js, Java y Android SDK configurados e instala la APK recién generada en el celular. El código del repositorio debe recompilarse para actualizar una APK instalada.

## Qué se conserva de cada proyecto

- **Variante visual del RAR:** planos de los niveles 1, 3, 4, 5 y 6, cartografía, controles de zoom y brújula, fotografías y galerías complementarias, y editores locales.
- **Versión del recorrido guiado:** catálogo del tour, fotografías oficiales incluidas, nombres únicos, Lobby, Pasillo de habitaciones, Acceso a Costamar y puntos complementarios, recorrido visual, voz y cursor orientado.
- **Integración:** los cinco planos reciben la misma ruta y el avance físico del tramo; texto y voz comparten las maniobras. `Seguir cursor` permite centrar y orientar el plano; la brújula vuelve a norte arriba. El dibujo abre con su orientación original.
- **Accesibilidad:** el plano utiliza únicamente conexiones compatibles con el modo seleccionado. Si falta una conexión, se informa; no se cambia automáticamente a una ruta con escaleras.
- Las galerías distinguen las fotografías del tour y las fotografías aportadas del recinto. Todas las imágenes necesarias están guardadas en el proyecto. El enlace al panorama 360 original necesita Internet.

## Distancias y referencias que requieren comprobación

Las distancias del levantamiento se mantienen. Las cifras calculadas sobre el dibujo de la variante visual no sustituyen las mediciones: por ejemplo, Ascensor central nivel 1 → Kids Club conserva **4,411 m** y Ascensor central → Hall Central conserva **10,336 m**.

Los metros de la guía corresponden al tramo completo registrado. Las distancias entre giros de un plano sin calibrar se indican como pendientes. El seguimiento físico solo se habilita cuando la ruta completa tiene distancias medidas y se confirma el origen.

Las conexiones de ascensor hacia nivel 5 del proyecto visual se conservan; el pasillo hacia Salón Costamar queda **por medir** y su accesibilidad requiere confirmación. No se adopta como medida de terreno el valor de 25,1 m del dibujo.

En nivel 4, el acceso exacto a Costamar sigue pendiente de ubicar; su foto y la conexión con el tour permanecen disponibles. El nuevo plano sitúa el inicio del Pasillo de habitaciones. En piso 6, Tinajas, Masajes y Sauna conservan referencias de sector mientras se confirman sus entradas exactas. Los puntos informativos sin vínculo con el grafo no se convierten en destinos ficticios.

Los giros al salir de los ascensores se explican mirando hacia una referencia del plano. Esta referencia no equivale a conocer la orientación física del teléfono. El Wi-Fi se mantiene como apoyo y BLE como alternativa futura.

## Comprobaciones

```powershell
npm test -- --watch=false
npm run test:maps
npm run lint
npm run build
```

Las pruebas de mapas revisan los cinco niveles, selección de destinos, mensajes, giros, orientación del cursor, avance físico, accesibilidad, fotos locales y tramos pendientes. La comprobación caminando con un Android sigue siendo necesaria.

## Android

El proyecto incluye el código nativo. Hay que recompilar y sincronizar los recursos web antes de generar una APK. Para generar una APK de depuración en Windows, con Java y Android SDK instalados:

```powershell
.\CREAR-APK-ANDROID.bat
```

Este script instala las dependencias, compila, ejecuta `cap sync android` y construye `android/app/build/outputs/apk/debug/app-debug.apk`. Para un proceso manual, conserva ese mismo orden; abrir Android Studio sin reconstruir y sincronizar puede reutilizar una copia anterior.

## Editores locales

Se conservan `nav-editor.js`, `nav-enderezar.js` y `editor-nivel-5.html`. Para abrir un plano en edición local, inicia el servidor y visita, por ejemplo:

http://localhost:4301/assets/mapas/nivel-1-navegacion.html?editor=1

La edición local permite ajustar la cartografía y exportar el diseño. Es una herramienta de desarrollo: los cambios no validan las medidas de terreno ni publican modificaciones del grafo. La navegación de invitados utiliza los archivos incluidos en el proyecto, sin aplicar automáticamente borradores locales.

No se ha añadido el acceso temporal de administrador de la variante visual a la aplicación fusionada. La administración y publicación requieren un flujo independiente con autenticación real.

## Documentación del tour

[Inventario del tour y sus conexiones](docs/Recorrido-virtual-Hippocampus.md).

## Actualización: Aquí estoy, medidas y Wi-Fi

- **Aquí estoy** sustituye a Comparar señales. Permite consultar sugerencias Wi-Fi cuando Android lo admite y confirmar explícitamente el punto actual. También permite confirmación manual en el navegador; el QR sigue disponible. La app no asigna una posición exacta únicamente por la señal más intensa.
- **Guardar señales de este punto** conserva una captura reciente completa en el teléfono después de confirmar el lugar. Conserva redes débiles y de otras bandas como inventario; solo crea una huella de posicionamiento separada si reúne los requisitos existentes de al menos tres señales de 2,4 GHz suficientemente fuertes. Las capturas nuevas aparecen en el inventario.
- **Atrás** está visible: cierra el menú o la foto de llegada, retrocede una indicación cuando corresponde y permite volver al planificador. **Salir de la aplicación** está visible en Android y detiene el recorrido y los sensores antes de cerrar.
- El recorrido visual usa **Iniciar/Pausar**. El seguimiento al caminar conserva su control propio, la confirmación del origen y la calibración de sensores; cambiar el rótulo no convierte una reproducción visual en ubicación real.

### Datos recuperados

El levantamiento fue realizado con **WiFi Analyzer**. Se recuperaron BSSID completos y lecturas omitidas de las capturas originales. El inventario conserva **60 lecturas de diez capturas**: 54 en nueve capturas asociadas a puntos o sectores y seis en una captura de las 11:57 cuyo lugar falta confirmar. Esta última se muestra, pero no se usa para sugerir una posición.

Las 60 incluyen una aproximación del gráfico de 614AB, señalada y excluida de la comparación. Otras siete filas recortadas se guardan sin completar el RSSI. Los reenvíos de las mismas pantallas no se cuentan como mediciones nuevas.

**Minimarket Proa, Zona Play, Juegos Adultos y Mini Club Kids** recuperan la referencia Movistar compartida que indicó el usuario. No se duplican los −36 dBm medidos en el Hall como si fueran lecturas individuales de esos cuatro puntos. La referencia conjunta de nivel 4 incluye Entrada principal, Recepción Turismo, Recepción Hippocampus y Ascensores.

Los **16 registros iniciales de cobertura** se conservan. La vista por punto identifica las capturas y referencias ya vinculadas. El rótulo «Sin captura vinculada en esta versión» indica un dato aún no incorporado; no afirma que el usuario deba repetir el levantamiento.

[Detalle de la revisión y fuentes de WiFi Analyzer](docs/Revision-WiFi-Analyzer.md).

Los **24 tramos** se transcriben de `tabla_puntos_interes_y_recorridos.pdf` y se muestran con tres decimales, diferenciando medidas y distancias calculadas por pasos o suma. La app aplica la misma fuente al grafo local y a los datos cargados, preservando conexiones cerradas y puntos desactivados.

- Los 2,577 m de cada escalera quedan registrados, pero pendientes de comprobar por la contradicción con 13 escalones y dos descansos. No se usan como distancia validada para seguir por metros.
- El registro de 48,293 m del piso 6 termina en **Tinajas**, según la tabla. Se conserva esa medida hasta dicho destino. El subtramo independiente hasta la puerta queda por medir; la ruta a Masajes que pasa por ella no debe sumar una distancia total ficticia. Puerta → Alma Spa conserva 4,800 m calculados por 24 pasos.
- Hall → Altamar queda por medir: 32,184 m es el registro de Montemar; un borrador rotula 13,586 m como Altamar, mientras la tabla original lo asigna a Terramar. Se mantiene la tabla de terreno para Terramar y se deja pendiente Altamar.

Fuentes de revisión: `tabla_puntos_interes_y_recorridos.pdf`, `NavInside_Nivel1_Plano_con_medidas-1.pdf` y `NavInside_Nivel3_Mapa_Completo_Orie.pdf`. El catálogo Wi-Fi disponible se conserva en `src/app/data/referencias-wifi.data.ts`.

Exportaciones incluidas para revisar en Excel: [24 tramos](docs/levantamiento-24-tramos.csv) y [60 lecturas Wi-Fi](docs/levantamiento-wifi-disponible.csv). También se incluyen las filas sin RSSI legible y las referencias compartidas.
