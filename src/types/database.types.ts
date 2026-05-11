export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

// ─── Enums ────────────────────────────────────────────────────────────────────

export type UserRole =
  | 'super_admin'
  | 'admin'
  | 'cliente_principal'
  | 'subcliente'
  | 'sst'
  | 'operativo'
  | 'financiero'

export type ProyectoEstado =
  | 'planificacion'
  | 'en_curso'
  | 'pausado'
  | 'completado'
  | 'cancelado'

export type FormularioEstado = 'borrador' | 'completado' | 'firmado' | 'archivado'
export type FormularioTipo = 'ats' | 'permiso_altura' | 'permiso_caliente'
export type IncidenteTipo = 'incidente' | 'accidente' | 'casi_accidente'
export type IncidenteSeveridad = 'leve' | 'moderado' | 'grave' | 'critico'
export type AusentismoTipo = 'medico' | 'personal' | 'incapacidad' | 'vacaciones' | 'otro'
export type DocumentoEmpleadoTipo =
  | 'cedula'
  | 'arl'
  | 'eps'
  | 'certificacion_altura'
  | 'certificacion_caliente'
  | 'examen_medico'
  | 'otro'
export type MovimientoEstado = 'solicitado' | 'aprobado' | 'rechazado' | 'ejecutado'
export type MovimientoTipo = 'gasto' | 'traslado_entre_rubros' | 'ajuste'
export type RiesgoDecision = 'proceder' | 'detener'
export type ChequeoResultado = 'si' | 'no' | 'na'
export type FirmaMomento = 'inicio' | 'fin'

// ─── Helpers (keep compat with GenericTable / GenericView) ───────────────────
// supabase-js v2.105+ requires Relationships: [] on every table/view so that
// Database["public"] satisfies GenericSchema and Schema is not typed as never.
// These helpers add the empty tuple without polluting individual table types.

type Tbl<R, I = Partial<Omit<R, never>>, U = Partial<R>> = {
  Row: R
  Insert: I
  Update: U
  Relationships: []
}

type ReadonlyView<R> = {
  Row: R
  Relationships: []
}

// ─── Row shapes ──────────────────────────────────────────────────────────────

type EmpresaRow = {
  id: string
  nombre: string
  nit: string
  logo_path: string | null
  email: string | null
  telefono: string | null
  direccion: string | null
  ciudad: string | null
  activa: boolean
  created_at: string
  updated_at: string
  deleted_at: string | null
}

type SubempresaRow = {
  id: string
  empresa_id: string
  nombre: string
  nit: string | null
  descripcion: string | null
  activa: boolean
  created_at: string
  updated_at: string
  deleted_at: string | null
}

type UsuarioRow = {
  id: string
  empresa_id: string | null
  subempresa_id: string | null
  rol: UserRole
  nombre: string
  email: string
  telefono: string | null
  cedula: string | null
  cargo: string | null
  avatar_path: string | null
  activo: boolean
  ultimo_login: string | null
  created_at: string
  updated_at: string
}

type ProyectoRow = {
  id: string
  empresa_id: string
  subempresa_id: string
  codigo: string
  nombre: string
  descripcion: string | null
  ubicacion: string | null
  ciudad: string | null
  fecha_inicio: string | null
  fecha_fin_proyectada: string | null
  fecha_fin_real: string | null
  estado: ProyectoEstado
  presupuesto_total: number | null
  cliente_contacto: string | null
  cliente_telefono: string | null
  notas: string | null
  created_by: string | null
  created_at: string
  updated_at: string
  deleted_at: string | null
}

type ProyectoUsuarioRow = {
  proyecto_id: string
  usuario_id: string
  asignado_at: string
  asignado_por: string | null
  retirado_at: string | null
}

type ProyectoAvanceRow = {
  id: string
  proyecto_id: string
  fecha: string
  avance_real: number
  avance_proyectado: number
  notas: string | null
  registrado_por: string | null
  created_at: string
}

type ObservacionRow = {
  id: string
  proyecto_id: string
  autor_id: string | null
  contenido: string
  importante: boolean
  created_at: string
  updated_at: string
}

type FotoRow = {
  id: string
  proyecto_id: string
  autor_id: string | null
  storage_path: string
  nombre: string | null
  descripcion: string | null
  lat: number | null
  lng: number | null
  capturada_at: string | null
  exif_json: Json | null
  tamano_bytes: number | null
  uploaded_at: string
}

type EmpleadoRow = {
  id: string
  empresa_id: string
  subempresa_id: string
  cedula: string
  nombre: string
  cargo: string | null
  profesion: string | null
  telefono: string | null
  email: string | null
  eps: string | null
  arl: string | null
  fondo_pension: string | null
  fecha_ingreso: string | null
  fecha_retiro: string | null
  activo: boolean
  foto_path: string | null
  created_at: string
  updated_at: string
  deleted_at: string | null
}

type IncidenteRow = {
  id: string
  empleado_id: string
  proyecto_id: string
  tipo: IncidenteTipo
  severidad: IncidenteSeveridad
  fecha: string
  ubicacion: string | null
  lat: number | null
  lng: number | null
  descripcion: string
  causas: string | null
  acciones_tomadas: string | null
  acciones_correctivas: string | null
  reportado_arl: boolean
  registrado_por: string | null
  created_at: string
  updated_at: string
}

type FormularioRow = {
  id: string
  empresa_id: string
  subempresa_id: string
  proyecto_id: string
  tipo: FormularioTipo
  estado: FormularioEstado
  codigo_consecutivo: string | null
  creado_por: string | null
  fecha_inicio: string | null
  fecha_fin: string | null
  ciudad: string | null
  ubicacion: string | null
  area: string | null
  pdf_generado_path: string | null
  firmado_at: string | null
  created_at: string
  updated_at: string
}

type RubroRow = {
  id: string
  proyecto_id: string
  nombre: string
  descripcion: string | null
  monto_maximo: number
  orden: number
  activo: boolean
  created_at: string
  updated_at: string
}

type MovimientoRow = {
  id: string
  proyecto_id: string
  rubro_origen_id: string | null
  rubro_destino_id: string
  tipo: MovimientoTipo
  monto: number
  justificacion: string
  estado: MovimientoEstado
  solicitado_por: string | null
  aprobado_por: string | null
  aprobado_at: string | null
  ejecutado_at: string | null
  created_at: string
  updated_at: string
}

type AuditoriaLogRow = {
  id: string
  tabla: string
  registro_id: string
  accion: 'INSERT' | 'UPDATE' | 'DELETE'
  actor_id: string | null
  antes: Json | null
  despues: Json | null
  created_at: string
}

// ─── View row shapes ──────────────────────────────────────────────────────────

type VwRubroBalanceRow = {
  rubro_id: string
  proyecto_id: string
  nombre: string
  monto_maximo: number
  ejecutado: number
  comprometido: number
  disponible: number
  porcentaje_ejecutado: number | null
}

type VwProyectoResumenRow = {
  proyecto_id: string
  empresa_id: string
  subempresa_id: string
  nombre: string
  estado: ProyectoEstado
  fecha_inicio: string | null
  fecha_fin_proyectada: string | null
  presupuesto_total: number | null
  avance_real: number | null
  avance_proyectado: number | null
  avance_fecha: string | null
  presupuesto_ejecutado: number
  presupuesto_comprometido: number
  porcentaje_ejecutado: number | null
  incidentes_30d: number
  ultima_observacion_at: string | null
}

type VwDashboardEmpresaRow = {
  empresa_id: string
  nombre: string
  proyectos_en_curso: number
  proyectos_completados: number
  proyectos_total: number
  presupuesto_total_empresa: number
  presupuesto_ejecutado_empresa: number
  incidentes_30d: number
}

// ─── Database type ────────────────────────────────────────────────────────────

export interface Database {
  public: {
    Tables: {
      empresas: Tbl<EmpresaRow, Omit<EmpresaRow, 'id' | 'created_at' | 'updated_at'> & { id?: string }, Partial<EmpresaRow>>
      subempresas: Tbl<SubempresaRow, Omit<SubempresaRow, 'id' | 'created_at' | 'updated_at'> & { id?: string }, Partial<SubempresaRow>>
      usuarios: Tbl<UsuarioRow, Omit<UsuarioRow, 'created_at' | 'updated_at'>, Partial<UsuarioRow>>
      proyectos: Tbl<ProyectoRow, Omit<ProyectoRow, 'id' | 'created_at' | 'updated_at'> & { id?: string }, Partial<ProyectoRow>>
      proyecto_usuarios: Tbl<ProyectoUsuarioRow, Omit<ProyectoUsuarioRow, 'asignado_at'> & { asignado_at?: string }, Partial<ProyectoUsuarioRow>>
      proyecto_avances: Tbl<ProyectoAvanceRow, Omit<ProyectoAvanceRow, 'id' | 'created_at'> & { id?: string }, Partial<ProyectoAvanceRow>>
      observaciones: Tbl<ObservacionRow, Omit<ObservacionRow, 'id' | 'created_at' | 'updated_at'> & { id?: string }, Partial<ObservacionRow>>
      fotos: Tbl<FotoRow, Omit<FotoRow, 'id' | 'uploaded_at'> & { id?: string }, Partial<FotoRow>>
      empleados: Tbl<EmpleadoRow, Omit<EmpleadoRow, 'id' | 'created_at' | 'updated_at'> & { id?: string }, Partial<EmpleadoRow>>
      incidentes: Tbl<IncidenteRow, Omit<IncidenteRow, 'id' | 'created_at' | 'updated_at'> & { id?: string }, Partial<IncidenteRow>>
      formularios: Tbl<FormularioRow, Omit<FormularioRow, 'id' | 'created_at' | 'updated_at'> & { id?: string }, Partial<FormularioRow>>
      rubros: Tbl<RubroRow, Omit<RubroRow, 'id' | 'created_at' | 'updated_at'> & { id?: string }, Partial<RubroRow>>
      movimientos: Tbl<MovimientoRow, Omit<MovimientoRow, 'id' | 'created_at' | 'updated_at'> & { id?: string }, Partial<MovimientoRow>>
      auditoria_logs: { Row: AuditoriaLogRow; Insert: never; Update: never; Relationships: [] }
    }
    Views: {
      vw_rubro_balance: ReadonlyView<VwRubroBalanceRow>
      vw_proyecto_resumen: ReadonlyView<VwProyectoResumenRow>
      vw_dashboard_empresa: ReadonlyView<VwDashboardEmpresaRow>
    }
    Functions: {
      registrar_avance_proyecto: {
        Args: {
          p_proyecto_id: string
          p_fecha: string
          p_avance_real: number
          p_avance_proyectado: number
          p_notas?: string | null
        }
        Returns: string
      }
      solicitar_movimiento_rubro: {
        Args: {
          p_proyecto_id: string
          p_rubro_destino_id: string
          p_tipo: MovimientoTipo
          p_monto: number
          p_justificacion: string
          p_rubro_origen_id?: string | null
        }
        Returns: string
      }
      aprobar_movimiento: {
        Args: { p_movimiento_id: string }
        Returns: void
      }
      rechazar_movimiento: {
        Args: { p_movimiento_id: string }
        Returns: void
      }
      ejecutar_movimiento: {
        Args: { p_movimiento_id: string }
        Returns: void
      }
      cerrar_formulario_sst: {
        Args: { p_formulario_id: string }
        Returns: void
      }
    }
    Enums: {
      user_role: UserRole
      proyecto_estado: ProyectoEstado
      formulario_estado: FormularioEstado
      formulario_tipo: FormularioTipo
      incidente_tipo: IncidenteTipo
      incidente_severidad: IncidenteSeveridad
      movimiento_estado: MovimientoEstado
      movimiento_tipo: MovimientoTipo
    }
  }
}

// ─── Convenience aliases ──────────────────────────────────────────────────────

export type Tables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row']

export type Views<T extends keyof Database['public']['Views']> =
  Database['public']['Views'][T]['Row']

export type Enums<T extends keyof Database['public']['Enums']> =
  Database['public']['Enums'][T]

// Shared typed client — import this in lib/data/* and lib/actions/*
// Uses `any` for the schema generics to avoid the SchemaNameOrClientOptions complexity
// in supabase-js v2.105+. Replace with generated types via `npm run db:types`.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type TypedSupabaseClient = import('@supabase/supabase-js').SupabaseClient<Database, any, any>
