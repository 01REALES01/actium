# ACTIUM – Infraestructura y Activos
## Product Requirements Document (PRD)
### Software Empresarial de Gestión de Proyectos, SST y Presupuesto

| Campo | Valor |
|---|---|
| Versión | 1.0 |
| Fecha | Mayo 2026 |
| Estado | En definición |
| Clasificación | Confidencial |

---

## 1. Visión del Producto

Actium es una empresa de **infraestructura y activos en acero** con 16 años de experiencia en el sector industrial y de construcción colombiano. Su propósito es **facilitar el desarrollo dando vida al acero**, ejecutando cada proyecto bajo un estricto rigor técnico, agilidad y cumplimiento de estándares.

Este software nace de la necesidad de digitalizar tres pilares operativos críticos que hoy se manejan de forma manual o dispersa: el seguimiento de proyectos para clientes, la gestión de Seguridad y Salud en el Trabajo (SST), y el control presupuestal. La plataforma debe proyectar la misma solidez, confianza y modernidad que la marca Actium transmite en cada estructura que fabrica.

### 1.1 North Star

Posicionar a Actium como el referente regional garantizando confianza a través del rigor técnico en el acero. El software es la extensión digital de esta promesa: cada dato, cada visualización, cada interacción debe transmitir precisión, control y profesionalismo.

### 1.2 Principio rector de diseño

> **"La calidad gráfica y visual lo es todo."**
> El sistema debe sentirse moderno, intuitivo, premium, corporativo y extremadamente visual. Calidad SaaS de clase mundial.

---

## 2. Usuarios y Roles

La plataforma opera bajo un modelo **multi-tenant** con aislamiento estricto de datos. La estructura jerárquica es: `Empresa → Subempresa → Usuarios → Proyectos`. Cada usuario accede exclusivamente a sus propios proyectos, documentos, dashboards, empleados y observaciones.

### 2.1 Ejemplo de estructura multi-tenant

```
Argos (Empresa)
├── Argos Operaciones (Subempresa A)
└── Argos Mantenimiento (Subempresa B)
```

Ambas pertenecen a Argos pero **NO pueden ver información entre sí**. El aislamiento es absoluto.

### 2.2 Matriz de roles

| Rol | Descripción | Nivel de acceso |
|---|---|---|
| `SUPER_ADMIN` | Administrador global de la plataforma Actium | Total |
| `ADMIN` | Administrador de una empresa cliente específica | Empresa completa |
| `CLIENTE_PRINCIPAL` | Cliente que ve todos los proyectos de su empresa | Empresa (lectura) |
| `SUBCLIENTE` | Usuario aislado dentro de una subempresa | Solo su subempresa |
| `SST` | Gestor de Seguridad y Salud en el Trabajo | Módulo SST |
| `OPERATIVO` | Personal de campo que reporta avances | Proyecto asignado |
| `FINANCIERO` | Gestor de presupuesto y rubros | Módulo financiero |

### 2.3 Seguridad y aislamiento (crítico)

- Row Level Security (RLS) en Supabase a nivel de base de datos, no solo en frontend
- Policies reales por `empresa_id` y `subempresa_id` en cada tabla
- Aislamiento de archivos en storage por tenant
- Validaciones de acceso en cada endpoint del backend
- Tokens JWT con claims de empresa y subempresa

---

## 3. Módulos del Sistema

### 3.1 Módulo 1 – Portal de Clientes

Portal donde cada cliente visualiza el estado completo de sus proyectos. Es la cara visible de la plataforma y debe causar una primera impresión premium.

#### 3.1.1 Autenticación y acceso

- Login con email/contraseña y recuperación de contraseña
- Manejo de sesiones con refresh tokens
- Roles y permisos validados en backend
- Redirección automática según rol al iniciar sesión

#### 3.1.2 Vista principal del proyecto

- Resumen ejecutivo del proyecto con KPIs principales
- Gráficas de avance (real vs proyectado, diario, semanal, total)
- Indicadores SST integrados (empleados, ausentismos, incidentes)
- Galería fotográfica de evidencias
- Observaciones y notas operativas

#### 3.1.3 Submódulo SST (indicadores)

Información requerida por proyecto:

- Número de empleados asignados vs en operación
- Ausentismos (con razón y PDF soporte)
- Incidentes y accidentes (formularios detallados con evidencias)

**Drill-downs interactivos:** al hacer clic en cualquier indicador se abre la lista de empleados con sus documentos (ARL, EPS, cédula, certificaciones en PDF).

#### 3.1.4 Submódulo Operativo

Dashboards de avance con estética tipo Monday/Linear/ClickUp:

- Avance real vs proyectado con gráficas comparativas
- Cards modernas, charts premium, animaciones suaves
- Dark mode por defecto con soporte light mode
- Responsive completo para acceso en campo

#### 3.1.5 Submódulo Fotográfico

- Uploads múltiples con drag & drop
- Galería con previews y lightbox
- Metadatos automáticos: fecha, hora, geolocalización *(recomendado para valor probatorio SST)*

#### 3.1.6 Submódulo Observaciones

- Texto libre para novedades, notas operativas, bloqueos y avances
- Historial con timestamps y autor

---

### 3.2 Módulo 2 – SST Digital

Digitalización completa de los formularios SST que actualmente se diligencian manualmente en papel. El sistema debe replicar la estructura y campos de los formatos existentes pero con una experiencia digital moderna.

#### 3.2.1 Formularios identificados

| Formulario | Propósito | Campos críticos |
|---|---|---|
| **ATS – Análisis de Trabajo Seguro** | Evaluación previa de riesgos antes de iniciar cualquier tarea | Datos básicos, trabajadores, equipos/herramientas, análisis paso a paso, evaluación de riesgo, firmas |
| **Permiso de Trabajo en Altura** | Autorización formal según Res. 1409/2012 para trabajos sobre 1.5m | Datos básicos, certificaciones del personal, EPP y sistemas contra caídas (27 ítems de verificación), firma emisor |
| **Permiso de Trabajo en Caliente** | Autorización para soldadura, corte o actividades con chispas/llama | Planeación, área de trabajo, EPP (10 ítems), verificación (14 ítems), cierre de labor, firmas inicio/fin |

#### 3.2.2 Funcionalidades del módulo

- Formularios digitales con validaciones en tiempo real
- Firma digital simple (canvas touch/mouse) con aclaración legal de que **NO** es firma certificada tipo DocuSign
- Generación automática de PDF con el formulario completado
- Descarga y envío por email del PDF generado
- Historial completo de formularios por proyecto y por empleado
- Estados: `Borrador → Completado → Firmado → Archivado`

#### 3.2.3 Detalle del formulario ATS

Secciones del formulario digital:

- **Encabezado:** empresa, ciudad, área/proceso, ubicación, fecha, hora inicio/fin
- **Permisos requeridos:** checkboxes para Altura, Espacio Confinado, Caliente, Energías Peligrosas, Otro
- **Trabajadores ejecutores:** tabla dinámica (cédula, nombre, firma) hasta 7 registros
- **Equipos y herramientas:** categorizados en Manuales, Eléctricas, Neumáticas, Hidráulicas, Mecánicas, Otras
- **Análisis de la tarea:** 11 preguntas de evaluación de riesgo específicas
- **Pasos detallados:** tabla dinámica con columnas Paso, Peligros, Consecuencias, Controles
- **Evaluación del riesgo:** flujo de decisión SI/NO para proceder o detenerse

#### 3.2.4 Detalle del Permiso de Trabajo en Altura

Secciones del formulario digital:

- **Datos básicos:** empresa, ciudad, lugar, área, vigencia del permiso, fechas y horas
- **Personal ejecutor:** tabla con cédula, nombre, constancia de capacitación, profesión, verificación seguridad social, firma
- **Descripción del trabajo:** tipo, herramientas, altura aproximada en metros
- **Medidas de prevención:** sistemas de acceso (Andamio, Escalera, Elevador), TAR involucradas
- **EPP y sistemas contra caídas:** 12 ítems con verificación Sí/No (líneas de vida, eslingas, arnés, casco, etc.)
- **Lista de chequeo:** 28 ítems de verificación con Sí/No/N.A.
- **Autorización:** nombre, cédula y firma del emisor

#### 3.2.5 Detalle del Permiso de Trabajo en Caliente

Secciones del formulario digital:

- **Vigencia:** fecha/hora inicio y fin del permiso
- **Área y propósito** del trabajo
- **Permisos adicionales:** bloqueo de energías (Eléctrica, Neumática, Mecánica, Hidráulica, Térmica)
- **Planeación de la labor:** 4 ítems de verificación
- **Área de trabajo:** 2 ítems de verificación
- **EPP:** 10 ítems específicos (casco, guantes calor, guantes mecánica, botas, gafas, careta, peto carnaza, polainas, protección auditiva)
- **Verificación:** 14 ítems (mamparas, conexión tierra, extintores, gases, cilindros, etc.)
- **Cierre de labor:** 4 ítems de verificación post-trabajo
- **Firmas:** inicio del permiso (hasta 3 trabajadores) y fin del permiso (mismos trabajadores)

---

### 3.3 Módulo 3 – Control Presupuestal

Gestión financiera por proyecto con trazabilidad completa de cada movimiento.

#### 3.3.1 Funcionalidades

- Definición de rubros con montos máximos por proyecto
- Registro de gasto actual y proyección de gasto
- Movimientos entre rubros con justificación obligatoria
- Dashboard financiero: gasto vs presupuesto por rubro
- Historial de auditoría: quién modificó qué, cuándo y por qué
- Logs inmutables de cada transacción
- Alertas automáticas al superar umbrales (80%, 90%, 100% del rubro)

#### 3.3.2 Lógica de negocio crítica

- Los movimientos entre rubros deben tener estado: `Solicitado → Aprobado → Ejecutado`
- Solo roles `ADMIN` o `FINANCIERO` pueden aprobar movimientos
- No se permite gasto que supere el monto máximo del rubro sin aprobación explícita
- Cada movimiento genera un registro inmutable en tabla de auditoría

---

## 4. Stack Técnico

| Capa | Tecnología | Justificación |
|---|---|---|
| Frontend | Next.js + Tailwind CSS + shadcn/ui | SSR, rendimiento, ecosistema React moderno |
| Animaciones | Framer Motion | Transiciones premium, micro-interacciones |
| Gráficas | Recharts | Integración nativa con React, altamente personalizable |
| Backend/DB | Supabase (PostgreSQL) | Auth integrado, RLS nativo, real-time, storage |
| Storage | Cloudflare R2 o AWS S3 | Archivos, fotos, PDFs generados |
| PDFs | React PDF (`@react-pdf/renderer`) | Generación de formularios SST en PDF |
| Deploy | Vercel | CI/CD automático, previews por branch |

### 4.1 Pipeline de desarrollo AI-assisted

| Fase | Herramienta | Output |
|---|---|---|
| Planeación | Antigravity | Backlog estructurado |
| Arquitectura UX | Relume | Wireframes y flujos |
| Exploración visual | Google Stitch | Moodboards y opciones de UI |
| Producción UI | v0 by Vercel | Componentes Tailwind/shadcn listos |
| Backend/Arquitectura | Claude Code | Schemas, policies, APIs |
| Frontend/Refinamiento | Codex | Integración y código final |
| Refinamiento final | Humano/Manual | UX premium, edge cases, QA |

---

## 5. Roadmap y Fases

### Fase 1 – MVP (Semanas 1–2)

**Objetivo:** Demo funcional impresionante del Portal de Clientes.

- **Semana 1:** Arquitectura, auth, DB con RLS, policies, dashboard principal, navegación, uploads, PDFs, galería de fotos
- **Semana 2:** Polish UI, charts premium, responsive, SST drilldowns, testing manual, deploy a producción

### Fase 2 – SST Digital (Semanas 3–4)

- Digitalización de los 3 formularios SST (ATS, Altura, Caliente)
- Sistema de firma simple
- Generación de PDFs
- Historial y estados de formularios

### Fase 3 – Control Presupuestal (Semanas 5–6)

- CRUD de rubros y presupuestos por proyecto
- Movimientos financieros con aprobación
- Dashboard financiero
- Auditoría y logs

### Fase 4 – Hardening (Semanas 7–8)

- Permisos ultra-sólidos y testing de seguridad
- Edge cases y validaciones exhaustivas
- Testing end-to-end
- Refinamiento UX final
- Documentación de usuario

### Estimación de esfuerzo

| Escenario | Duración | Resultado |
|---|---|---|
| Sin AI | 5–8 meses | Software enterprise terminado |
| Con AI + pipeline correcto | 1.5–3 meses | Software enterprise terminado |
| MVP visual impresionante | 2 semanas | Demo funcional, NO producción enterprise |

---

## 6. Riesgos Identificados

| Riesgo | Impacto | Probabilidad | Mitigación |
|---|---|---|---|
| Inconsistencia visual entre 3 desarrolladores | Alto | Alta | Design system + brief de sistema obligatorio para todos los agentes |
| Firma simple confundida con firma legal | Crítico | Media | Disclaimer visible en cada formulario. Aclaración legal en T&C |
| RLS mal configurado expone datos entre tenants | Crítico | Media | Testing de seguridad dedicado. Policies auditadas antes de deploy |
| Scope creep en control presupuestal | Alto | Alta | Definir MVP mínimo del módulo financiero antes de codificar |
| Fuentes sin licencia (Ancorli, Axiforma) | Medio | Confirmado | Sustituir por Plus Jakarta Sans (textos) y DM Serif Display (títulos) |
| Fotos sin metadatos probatorios | Medio | Alta | Embeder geolocalización y timestamp en cada upload desde el inicio |

---

## 7. Métricas de Éxito

- Tiempo de carga del dashboard < 2 segundos
- 100% de formularios SST digitalizados eliminan el uso de papel
- 0 fugas de datos entre tenants en auditoría de seguridad
- NPS del cliente ≥ 8/10 en experiencia visual
- 100% de movimientos presupuestales con trazabilidad completa
- Responsive funcional en dispositivos móviles para uso en campo

---

## 8. Conclusión

> El cliente **NO** paga por escribir código. Paga por **decisiones correctas, UX premium, arquitectura correcta, experiencia visual, velocidad y entendimiento del negocio.** Cada línea de código, cada componente y cada pantalla debe reflejar la misma solidez y confianza que Actium transmite en cada estructura de acero que fabrica.

---

*Versión 1.0 – Mayo 2026 | Actium – Infraestructura y Activos*
