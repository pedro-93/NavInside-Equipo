# Bitácora privada: mapas de niveles 1 y 3, y comando por voz

**Fecha:** 8 de octubre de 2026  
**Proyecto:** NavInside Hippocampus, copia privada  
**Estado:** preparado para revisión local; todavía no trasladado al repositorio de Pedro.

## Cambios preparados

- Se incorporó al selector del mapa el diseño fotográfico de Nivel 1, con puntos seleccionables para destinos que ya tienen una ruta en el grafo.
- Se incorporó el mapa visual del Nivel 3 y un selector entre los niveles 1 y 3.
- Al seleccionar un destino con fotografía se muestra una tarjeta; cuando la guía llega al último paso, la tarjeta indica que se llegó al destino.
- Se agregó el comando de una sola frase para pedir una ruta, por ejemplo: **«desde ascensor principal hasta gimnasio»**. El comando reconoce los nombres disponibles en el mapa y completa origen y destino. Los selectores manuales siguen disponibles.
- Las tarjetas de selección de destinos de los niveles 1 y 3 ahora muestran la fotografía correspondiente antes de iniciar la ruta.
- La guía hablada ya no dice «Paso X de Y»: usa indicaciones como «Continúa», «Luego» y «Ahora», junto con la distancia aproximada del tramo.
- Se sincronizaron los resultados de reconocimiento de voz con la actualización visual de Angular y se aclaró el aviso del micrófono para navegador/permiso/contexto seguro.
- En navegador se usa `SpeechRecognition` / `webkitSpeechRecognition` si el dispositivo lo ofrece. En Android Capacitor se agregó un plugin nativo de reconocimiento, con solicitud explícita del permiso de micrófono.
- Se conservaron las fotos y mapas de los destinos que ya estaban preparados en esta copia.

## Revisión local

1. Ejecutar `npm ci` si todavía no se han instalado las dependencias.
2. Ejecutar `npm start` y abrir la dirección local que muestre Angular.
3. En el selector sobre el mapa, revisar **Nivel 1** y **Nivel 3**. Tocar las tarjetas del mapa para comprobar la selección y la fotografía del destino.
4. En Chrome o Edge, probar el micrófono y decir **«desde ascensor principal hasta gimnasio»**. Permitir el acceso al micrófono y mantener conexión a internet para el reconocimiento del navegador. Si el navegador no ofrece reconocimiento, usar los selectores de origen y destino.
5. Para el APK: tras probar la app, ejecutar `npm run build` y `npx cap sync android`, abrir `android/` en Android Studio y generar el APK.

## Validación realizada

- `npm run build`: correcto.
- `npm test -- --watch=false`: 51 pruebas aprobadas.
- `npx cap sync android`: correcto; los mapas y fotos quedaron copiados al proyecto Android.
- `git diff --check`: sin errores de espacios o formato.
- Se añadieron pruebas para el texto de voz sin numeración, distancia aproximada y tarjetas con foto.

## Pendiente de validar en equipo Android

No se generó ni instaló un APK en esta sesión. La compilación nativa no pudo comprobarse porque Gradle necesitaba descargar `gradle-8.14.3-all.zip` y la conexión del entorno bloqueó esa descarga. La primera compilación del plugin Android, el permiso real del micrófono y el reconocimiento de voz deben probarse desde Android Studio o en un dispositivo antes de portar estos cambios al repositorio de Pedro.

La compilación web muestra advertencias existentes de Browserslist y del presupuesto de estilos; no impiden compilar ni ejecutar las pruebas.
