# Revisión del levantamiento con WiFi Analyzer

Mediciones entregadas por Gonzalo y realizadas el 20 de octubre de 2026. Se revisaron las 26 imágenes de WiFi Analyzer enviadas en el chat; algunas son reenvíos de las mismas pantallas. Corresponden a diez capturas de redes, no a 26 levantamientos independientes.

La revisión anterior solo había incorporado 42 lecturas y había dejado BSSID incompletos. Esta revisión recupera los identificadores completos directamente de las listas de redes y conserva las imágenes de origen por nombre e identificador en cada registro del código.

| Captura | Hora | Lecturas con RSSI | Asociación |
|---|---|---:|---|
| Hall | 11:33 | 8 | Hall nivel 1 |
| Gimnasio | 11:36 | 1 | Gimnasio nivel 1 |
| Alma Spa / Montemar | 11:42 | 8 | Sector compartido nivel 1 |
| Altamar | 11:50 | 7 | Asociación existente; una lectura es aproximada del gráfico |
| Captura por asociar | 11:57 | 6 | Lugar pendiente de confirmar; no se usa para sugerir ubicación |
| Entrada / Recepciones / Ascensores | 12:08 | 6 | Sector compartido nivel 4 |
| Entrada / Recepciones / Ascensores | 12:16 | 6 | Segunda captura del sector nivel 4 |
| Piscina temperada | 12:20 | 5 | Nivel 3 |
| Entrega de Toallas | 12:23 | 6 | Nivel 1 |
| Restaurante Faro | 12:28 | 6 | Nivel 3 |

Se conservan 59 lecturas: 58 de listas de redes y una aproximación del gráfico de 614AB 2.4. La aproximación se muestra como tal y no se utiliza para comparar. También se conservan siete filas de redes cuyo RSSI está recortado o tapado por publicidad, sin completar sus valores. Las redes de teléfonos se muestran como inventario y se excluyen de la comparación.

## Referencias compartidas que sí se entregaron

Gonzalo indicó que la señal Movistar del sector Hall sirve como referencia para Minimarket Proa, Zona Play, Zona de Juegos Adultos y Mini Club Kids. Estos cuatro puntos figuran como «Referencia compartida recibida». La lectura de −36 dBm pertenece al Hall: no se duplica como una medición individual en cada lugar ni convierte esa referencia en cuatro huellas distintas.

La medición conjunta del nivel 4 conserva los cuatro lugares indicados: Entrada principal, Recepción Turismo Viña, Recepción Hippocampus y Ascensores del piso 4. Las dos capturas no prueban una ubicación independiente para cada uno de esos puntos.

Los reenvíos de la captura de las 11:50 no se cuentan como una nueva medición específica en Tinajas. Se conserva la asociación existente a Altamar. La captura de las 11:57 se mantiene íntegra y separada hasta recuperar o confirmar su lugar, sin atribuirle un destino por su intensidad o por el nombre de la red.

## Archivos para revisar

- `levantamiento-wifi-disponible.csv`: 59 lecturas, hora, BSSID, canal, frecuencia, herramienta, archivo de origen y estado de asociación.
- `lecturas-wifi-sin-rssi.csv`: siete filas parcialmente tapadas o recortadas.
- `referencias-wifi-compartidas.csv`: los cuatro puntos con referencia Movistar de sector.

«Sin captura vinculada en esta versión» describe el estado de integración del archivo actual; no afirma que el usuario no haya realizado o entregado el levantamiento. El inventario inicial de 16 antenas/sectores se conserva como registro de cobertura.

## Corrección de la exclusión solicitada

La revisión previa contenía Galaxy A31BE7C como inventario. Se eliminó del código y del CSV por solicitud expresa de Pedro. La captura original conserva su valor histórico; no se borra el archivo original. Se conservaron los restantes 59 registros y siete filas sin RSSI. El inventario adicional del nivel 3 está en un archivo separado y no debe confundirse con estas diez capturas.
