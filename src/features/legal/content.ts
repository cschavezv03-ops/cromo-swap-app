/**
 * Textos legales versionados. La versión cambia cuando se modifica el
 * contenido sustantivo; los users que aceptaron una versión anterior
 * deberán re-aceptar la nueva (no implementado todavía — TODO).
 *
 * Marco legal:
 *   - LOPDP (Ley Orgánica de Protección de Datos Personales, Registro
 *     Oficial 459, vigente desde 2021, plenamente aplicable 26-may-2023)
 *   - Ley de Comercio Electrónico, Firmas Electrónicas y Mensajes de
 *     Datos (LCEFEMD, 2002)
 *   - Código Civil Ecuatoriano (Art. 21, capacidad legal = 18+)
 *   - Ley Orgánica de Defensa del Consumidor (LODC)
 *
 * Placeholders a reemplazar antes de prod:
 *   [TITULAR_NOMBRE]   → Nombre completo legal del titular
 *   [TITULAR_CEDULA]   → Cédula de ciudadanía del titular
 *   [TITULAR_DIRECCION] → Dirección física en Ecuador (calle, ciudad,
 *                         provincia) — exigida por LOPDP Art. 12 para
 *                         ejercicio de derechos ARCO + portabilidad.
 */
export const LEGAL_VERSION = '1.0';
export const LEGAL_LAST_UPDATED = '17 de mayo de 2026';

export const CONTACT_EMAIL = 'daxrpm@proton.me';

/** Placeholders — REEMPLAZAR ANTES DE LANZAMIENTO */
export const TITULAR = {
  nombre: '[TITULAR_NOMBRE]',
  cedula: '[TITULAR_CEDULA]',
  direccion: '[TITULAR_DIRECCION]',
  ciudad: 'Quito, Ecuador',
  email: CONTACT_EMAIL,
};

export const TERMS_TEXT = `# Términos y Condiciones de Uso

**Última actualización:** ${LEGAL_LAST_UPDATED}
**Versión:** ${LEGAL_VERSION}

Estos Términos y Condiciones ("Términos") regulan el acceso y uso de la aplicación móvil **Cromo Swap** ("la Aplicación", "el Servicio") operada por **${TITULAR.nombre}**, persona natural con cédula de ciudadanía **${TITULAR.cedula}**, domiciliada en ${TITULAR.direccion} (${TITULAR.ciudad}), en adelante "el Titular".

Al crear una cuenta, registrarte o usar la Aplicación, declaras haber leído, entendido y aceptado expresamente estos Términos, así como la Política de Privacidad. Si no estás de acuerdo, debes abstenerte de usar la Aplicación.

---

## 1. Aceptación y capacidad legal

1.1. Para usar Cromo Swap debes ser **mayor de 18 años**, conforme al Art. 21 del Código Civil ecuatoriano. Al registrarte declaras bajo juramento ser mayor de edad y tener plena capacidad legal para obligarte por estos Términos.

1.2. Si descubrimos que un usuario es menor de edad, cancelaremos su cuenta inmediatamente y eliminaremos sus datos.

1.3. Tu aceptación de estos Términos constituye un contrato electrónico vinculante conforme a la Ley de Comercio Electrónico, Firmas Electrónicas y Mensajes de Datos del Ecuador.

---

## 2. Descripción del Servicio

2.1. Cromo Swap es una plataforma social y de intercambio dirigida exclusivamente a estudiantes de universidades reconocidas en Quito, Ecuador. Permite:

  a) Llevar un registro digital de los cromos del álbum del Mundial 2026 (edición Panini Ecuador).
  b) Identificar coincidencias automáticas para intercambios entre usuarios ("matches").
  c) Proponer y aceptar intercambios, ventas y subastas entre usuarios.
  d) Conectarse socialmente con otros usuarios (amistades, perfiles públicos).

2.2. **Cromo Swap NO es parte de las transacciones entre usuarios.** Actuamos exclusivamente como facilitadores de la conexión. Toda transacción (intercambio físico de cromos, pago, entrega, coordinación) ocurre directamente entre los usuarios involucrados, fuera de la Aplicación, típicamente vía WhatsApp.

2.3. **No procesamos pagos.** No actuamos como intermediarios financieros. Los precios mostrados en publicaciones de venta son referenciales y los usuarios coordinan el pago directamente entre sí.

---

## 3. Registro y cuenta

3.1. Para usar la Aplicación debes registrarte con un correo electrónico **institucional** de una de las universidades habilitadas en Quito (USFQ, EPN, ESPE, UCE, PUCE, UDLA, UTE, IST Sucre). Esto se valida automáticamente por el dominio del correo.

3.2. La autenticación es vía **enlace mágico** (magic link) enviado a tu correo. No usamos contraseñas. Eres responsable de mantener el acceso a tu correo electrónico y de la seguridad de tu dispositivo.

3.3. Solo puedes mantener UNA cuenta. La creación de múltiples cuentas o el uso de identidades falsas constituye motivo de suspensión.

3.4. Toda actividad realizada desde tu cuenta es de tu responsabilidad.

---

## 4. Reglas de uso

Al usar Cromo Swap te comprometes a:

4.1. Proporcionar información veraz (nombre real, universidad real).

4.2. **No** acosar, amenazar, intimidar, difamar o discriminar a otros usuarios. Tales conductas resultan en suspensión inmediata sin reembolso.

4.3. **No** publicar contenido obsceno, ilegal, racista, sexista, xenófobo o que infrinja derechos de terceros.

4.4. **No** ofrecer productos distintos a cromos del álbum oficial del Mundial 2026. Está prohibido usar la plataforma para venta de drogas, armas, productos falsificados, servicios sexuales o cualquier bien ilegal.

4.5. **No** intentar acceder por medios técnicos no autorizados (scraping masivo, ingeniería inversa, explotación de vulnerabilidades). Estas conductas pueden constituir delitos informáticos tipificados en el Código Orgánico Integral Penal (COIP) ecuatoriano (Arts. 178, 229, 230).

4.6. **No** usar la Aplicación para fines comerciales no autorizados, publicidad, spam o reventa masiva.

4.7. Cumplir con la legislación ecuatoriana aplicable, especialmente en materia tributaria si tus actividades en la plataforma generan ingresos sujetos a impuestos.

---

## 5. Transacciones entre usuarios — Importante

5.1. **El Titular NO es parte, ni avalista, ni garante** de ninguna transacción entre usuarios. Toda coordinación de pago, entrega física, calidad del cromo, autenticidad y cumplimiento se realiza directamente entre las partes involucradas, bajo su propio riesgo.

5.2. Si tienes una disputa con otro usuario (te enviaron un cromo dañado, no te pagaron, no apareció a la cita, etc.), debes resolverla directamente con él. Cromo Swap puede recibir reportes y aplicar sanciones internas (suspensión, bloqueo de subastas), pero **NO mediamos ni garantizamos resolución, ni devolución de dinero**.

5.3. El sistema de calificaciones (1 a 5 estrellas post-transacción) es la herramienta principal para evaluar la reputación de otros usuarios. Te recomendamos siempre revisar la reputación antes de coordinar un trade.

5.4. El bloqueo automático de 14 días tras incumplimiento de subasta es una medida disuasiva interna, no constituye sanción legal.

---

## 6. Propiedad intelectual

6.1. Las imágenes y datos de los cromos referenciados en la Aplicación corresponden a la edición oficial del Mundial 2026 publicada por **Panini** (terceros no afiliados a Cromo Swap). Esta Aplicación no está afiliada, patrocinada ni respaldada por Panini, la FIFA, ni la Confederación Sudamericana de Fútbol (CONMEBOL).

6.2. El uso de marcas, escudos y referencias a equipos, jugadores y federaciones es **descriptivo y meramente informativo**, conforme a usos legítimos protegidos por el Código Orgánico de la Economía Social de los Conocimientos (Ingenios), Ecuador.

6.3. El código fuente, diseño, logotipo y contenido editorial de la Aplicación son propiedad del Titular y están protegidos por derechos de autor.

---

## 7. Limitación de responsabilidad

7.1. La Aplicación se proporciona **"tal cual"** y **"según disponibilidad"**, sin garantías expresas o implícitas de funcionamiento ininterrumpido, ausencia de errores o adecuación a un propósito particular.

7.2. En la máxima medida permitida por la ley ecuatoriana, el Titular no será responsable por:

  a) Daños indirectos, lucro cesante, daño emergente o pérdida de oportunidad derivados del uso o imposibilidad de uso de la Aplicación.
  b) Conductas, declaraciones o actos de otros usuarios.
  c) Pérdida de cromos físicos, dinero, o cualquier otro bien intercambiado fuera de la Aplicación.
  d) Fallas de servicios de terceros (Supabase, Expo, proveedores de correo, telecomunicaciones).
  e) Eventos de fuerza mayor o caso fortuito.

7.3. La responsabilidad máxima acumulada del Titular frente a cualquier usuario, por cualquier causa, se limita a USD $1 (un dólar), monto que las partes reconocen como justo y suficiente dado el carácter gratuito del Servicio.

---

## 8. Suspensión y terminación

8.1. El Titular puede suspender o eliminar tu cuenta, sin previo aviso, si infringes estos Términos.

8.2. Puedes eliminar tu cuenta en cualquier momento desde Perfil → Eliminar cuenta. El proceso de eliminación se completa en máximo 30 días.

8.3. Tras eliminación, tus datos personales se borran o se anonimizan conforme a la Política de Privacidad. Algunos datos pueden conservarse por obligación legal (registros de transacciones disputadas, conforme a plazos del Código Civil).

---

## 9. Modificaciones

9.1. El Titular puede modificar estos Términos en cualquier momento. Cambios sustantivos se notificarán dentro de la Aplicación con al menos **15 días de anticipación**.

9.2. El uso continuado de la Aplicación después de la entrada en vigor de cambios constituye aceptación de los nuevos Términos. Si no estás de acuerdo, debes eliminar tu cuenta.

---

## 10. Ley aplicable y jurisdicción

10.1. Estos Términos se rigen por las leyes de la **República del Ecuador**.

10.2. Cualquier disputa será resuelta primero por negociación directa de buena fe. Si no hay acuerdo en 30 días, las partes se someten a la jurisdicción de los juzgados civiles del **Distrito Metropolitano de Quito**.

---

## 11. Contacto

Para preguntas, ejercicio de derechos o reportes, escribe a **${CONTACT_EMAIL}**.

---

*Estos Términos constituyen el acuerdo completo entre el usuario y el Titular respecto al uso de Cromo Swap. La invalidez de una cláusula no afecta la validez de las restantes.*
`;

export const PRIVACY_TEXT = `# Política de Privacidad

**Última actualización:** ${LEGAL_LAST_UPDATED}
**Versión:** ${LEGAL_VERSION}

Esta Política describe cómo Cromo Swap (operado por **${TITULAR.nombre}**, cédula **${TITULAR.cedula}**, en adelante "el Titular") trata tus datos personales, conforme a la **Ley Orgánica de Protección de Datos Personales (LOPDP)** del Ecuador, Registro Oficial Suplemento 459 del 26 de mayo de 2021, plenamente aplicable desde el 26 de mayo de 2023.

---

## 1. Responsable del tratamiento

| | |
|---|---|
| Responsable | ${TITULAR.nombre} |
| Cédula | ${TITULAR.cedula} |
| Domicilio | ${TITULAR.direccion} (${TITULAR.ciudad}) |
| Email | ${CONTACT_EMAIL} |

---

## 2. Qué datos recolectamos

Cuando creas tu cuenta y usas la Aplicación, recolectamos:

### 2.1. Datos que tú nos proporcionas

- **Correo electrónico institucional** — obligatorio para registro.
- **Nombre o apodo** (display name) — obligatorio.
- **Universidad** — derivada automáticamente del dominio de tu correo.
- **Avatar** (foto de perfil) — opcional. NO procesamos características biométricas: la imagen se almacena como archivo sin análisis facial.
- **Número de WhatsApp** — opcional, solo se revela a la contraparte cuando ambos aceptan una transacción.

### 2.2. Datos que se generan con el uso

- Tu inventario de cromos (cuántos tienes, marcados, faltantes, repetidos).
- Tus matches, intercambios, ventas, subastas, calificaciones.
- Tu lista de amistades y usuarios bloqueados.
- Solicitudes de búsqueda de personas.
- Eventos de interacción con la app (sesiones, pantallas vistas, acciones críticas) — usados para analítica de producto.
- Notificaciones que recibes (in-app y push).

### 2.3. Datos técnicos automáticos

- Dirección IP del dispositivo (registrada por Supabase, nuestro proveedor de backend).
- Identificador de dispositivo para notificaciones push (Expo Push Token).
- Tipo de dispositivo, sistema operativo, versión de la app.

**NO recolectamos** datos sensibles según el Art. 5 LOPDP: ni origen étnico/racial, ni datos genéticos, biométricos procesados, de salud, religión, ideología política, orientación sexual, ni información financiera (no procesamos pagos).

---

## 3. Para qué tratamos tus datos (finalidades)

| Finalidad | Base legal (Art. 7 LOPDP) |
|---|---|
| Crear y mantener tu cuenta | Ejecución del contrato (Términos) |
| Validar que perteneces a una universidad habilitada | Ejecución del contrato |
| Mostrar tu perfil a otros usuarios en tu scope | Ejecución del contrato + consentimiento |
| Generar matches automáticos | Ejecución del contrato |
| Facilitar comunicación entre usuarios (WhatsApp lazy reveal) | Consentimiento expreso al revelar |
| Enviar notificaciones in-app y push | Consentimiento (permiso de sistema) |
| Mejorar el producto (analítica agregada) | Interés legítimo del Titular |
| Cumplir obligaciones legales y de seguridad | Obligación legal |
| Prevenir fraude, abuso y violaciones a los Términos | Interés legítimo |

---

## 4. Con quién compartimos tus datos

### 4.1. Otros usuarios de Cromo Swap

Tu **perfil público** (nombre, universidad, % del álbum, avatar si lo subiste, calificación promedio) es visible para:
- Usuarios de tu mismo scope universitario.
- Tus amigos (vínculo mutuo aceptado).
- Usuarios que te encuentran por búsqueda explícita.

**No expuestos públicamente:**
- Email
- WhatsApp (solo se revela en transacciones aceptadas)
- Inventario detallado (solo amigos pueden ver tus repetidos disponibles)
- Datos técnicos

### 4.2. Proveedores ("encargados del tratamiento" — Art. 38 LOPDP)

| Proveedor | Función | Ubicación servidores |
|---|---|---|
| **Supabase Inc.** | Base de datos, autenticación, storage, realtime | Estados Unidos |
| **Expo (Universe Inc.)** | Push notifications | Estados Unidos |
| **PostHog Inc.** | Analítica de producto | Estados Unidos |

### 4.3. Transferencias internacionales — IMPORTANTE

Tus datos personales se almacenan y procesan en servidores ubicados en **Estados Unidos**, fuera del Ecuador. La LOPDP (Art. 56) lo permite siempre que:

- Exista un nivel adecuado de protección en el país receptor, o
- Existan **cláusulas contractuales tipo** con el proveedor, o
- El titular preste **consentimiento expreso** después de ser informado.

**Al aceptar esta Política, consientes expresamente la transferencia internacional de tus datos a los proveedores arriba listados**, todos los cuales cumplen con estándares industriales de seguridad (SOC 2, GDPR) que ofrecen protección equivalente.

### 4.4. Autoridades

Solo entregaremos tus datos a autoridades ecuatorianas si nos lo requiere una orden judicial válida o requerimiento legal expreso, en el marco de un proceso formal.

---

## 5. Por cuánto tiempo conservamos tus datos

| Dato | Plazo |
|---|---|
| Datos de cuenta activa | Mientras tu cuenta esté activa |
| Datos tras eliminar cuenta | 30 días para procesamiento; luego se borran o anonimizan |
| Registros de transacciones disputadas | 5 años (Código Civil — prescripción acciones) |
| Logs técnicos (IP, errores) | 90 días |
| Eventos de analítica (PostHog) | 1 año, luego se agrupan |

---

## 6. Tus derechos (Art. 10 LOPDP)

Como titular de tus datos tienes derecho a:

- **Acceso**: conocer qué datos tuyos tenemos.
- **Rectificación**: corregir datos inexactos o incompletos.
- **Eliminación** (derecho al olvido): borrar tus datos cuando ya no sean necesarios.
- **Oposición**: oponerte al tratamiento por motivos legítimos.
- **Portabilidad**: recibir tus datos en formato estructurado (JSON).
- **No ser objeto de decisiones automatizadas** que produzcan efectos jurídicos significativos. (No usamos decisiones automatizadas que afecten derechos legales).
- **Suspensión del tratamiento** en casos específicos.

**Cómo ejercer estos derechos**: escríbenos a **${CONTACT_EMAIL}** con copia de tu documento de identidad. Responderemos en un plazo máximo de **15 días hábiles** (Art. 38 RLOPDP). En caso de no recibir respuesta o disconformidad, puedes presentar reclamo ante la **Superintendencia de Protección de Datos Personales (SPDP)** del Ecuador.

---

## 7. Seguridad

7.1. Aplicamos medidas técnicas y organizativas razonables para proteger tus datos: cifrado en tránsito (TLS 1.2+), control de acceso por Row Level Security en la base de datos, almacenamiento seguro de tokens, registro de auditoría.

7.2. Ningún sistema es 100% seguro. En caso de **brecha de seguridad** que afecte tus datos personales, te notificaremos en un plazo máximo de **72 horas** después de tomar conocimiento, e informaremos a la SPDP, conforme al Art. 47 LOPDP.

---

## 8. Menores de edad

8.1. Cromo Swap está dirigido a **mayores de 18 años** (Art. 21 Código Civil). No recolectamos datos a sabiendas de personas menores de 18 años.

8.2. Si descubrimos que un usuario es menor, eliminaremos su cuenta y datos inmediatamente. Si crees que un menor está usando la app, repórtanos a ${CONTACT_EMAIL}.

---

## 9. Cookies y rastreadores

La Aplicación móvil **NO usa cookies de navegador**. Sí utilizamos identificadores técnicos (push token, distinct_id de analytics) que son funcionalmente equivalentes y se rigen por esta Política.

---

## 10. Cambios a esta Política

Si modificamos esta Política sustantivamente, te notificaremos en la Aplicación con al menos **15 días de anticipación**. El uso continuado tras la entrada en vigor de cambios constituye aceptación.

---

## 11. Contacto

Responsable del tratamiento: **${TITULAR.nombre}**.
Email para ejercicio de derechos: **${CONTACT_EMAIL}**.

Autoridad de control: **Superintendencia de Protección de Datos Personales del Ecuador**.

---

*Esta Política se complementa con los Términos y Condiciones de Uso.*
`;
