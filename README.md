# eTickets

Sistema para la generación y administración de tickets de soporte y requerimientos de clientes.

## Funcionalidades

- **Roles**: cliente, agente de soporte y administrador.
  - **Cliente**: se registra, crea tickets, ve y comenta solo sus propios tickets.
  - **Agente**: ve todos los tickets, cambia su estado, los asigna y comenta.
  - **Administrador**: todo lo anterior y, de forma exclusiva, **eliminar tickets**, ver el **dashboard**, generar **informes PDF** y gestionar usuarios.
- **Folio** único y correlativo por año: `TCK-2026-000001`.
- **Estados**: Abierto, En progreso, Cerrado.
- **SLA con semáforo** según prioridad:

  | Prioridad | Plazo |
  |-----------|-------|
  | Crítica   | 4 h   |
  | Alta      | 8 h   |
  | Media     | 24 h  |
  | Baja      | 72 h  |

  - 🔴 **Rojo**: SLA vencido (o ticket cerrado fuera de plazo).
  - 🟡 **Amarillo**: queda 25 % o menos del plazo (configurable con `SLA_UMBRAL_AMARILLO_PCT`).
  - 🟢 **Verde**: a tiempo (o cerrado dentro del plazo).
- **Dashboard** (admin): totales por estado, semáforo SLA de tickets activos, por prioridad, % de cumplimiento y lista de tickets en riesgo, con filtro por fechas.
- **Informe PDF** (admin): resumen y detalle de tickets del periodo filtrado.

## Tecnología

Next.js 15 (App Router) + TypeScript, PostgreSQL con Prisma, Auth.js (credenciales, sesión JWT con rol) y pdf-lib.

## Puesta en marcha

Requisitos: Node.js 20+ y PostgreSQL 14+.

```bash
cp .env.example .env          # ajusta DATABASE_URL y AUTH_SECRET
npm install
npx prisma migrate deploy     # crea las tablas
npm run db:seed               # usuarios y tickets de ejemplo (opcional)
npm run dev                   # http://localhost:3000
```

Usuarios de ejemplo (contraseña `eticket123`): `admin@eticket.local`, `agente@eticket.local`, `cliente@eticket.local`. Cámbialos antes de usar el sistema en producción.

## Scripts

| Comando | Descripción |
|---------|-------------|
| `npm run dev` | Servidor de desarrollo |
| `npm run build` / `npm start` | Compilación y servidor de producción |
| `npm test` | Pruebas unitarias (SLA, folio, permisos) |
| `npm run typecheck` | Verificación de tipos |
| `npm run db:migrate` | Nueva migración en desarrollo |

## Estructura

```
prisma/schema.prisma        Modelo de datos (Usuario, Ticket, Comentario, ContadorFolio)
src/auth.ts                 Auth.js con credenciales y rol
src/middleware.ts           Protección de rutas (/admin solo para administrador)
src/app/acciones.ts         Server actions con validación y control de permisos
src/lib/sla.ts              Plazos y semáforo de SLA
src/lib/folio.ts            Generación atómica de folios
src/lib/permisos.ts         Reglas de autorización por rol
src/lib/pdf.ts              Generación del informe PDF
src/app/admin/              Dashboard, usuarios e informe PDF
src/app/tickets/            Listado, creación y detalle de tickets
```
