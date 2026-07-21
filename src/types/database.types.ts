export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      altura_detalles: {
        Row: {
          altura_metros: number | null
          autorizado_por_cedula: string | null
          autorizado_por_nombre: string | null
          firma_emisor_path: string | null
          formulario_id: string
          herramientas: string | null
          sistema_andamio: boolean
          sistema_elevador: boolean
          sistema_escalera: boolean
          tar_involucradas: string | null
          tipo_trabajo: string | null
          vigencia_fin: string | null
          vigencia_inicio: string | null
        }
        Insert: {
          altura_metros?: number | null
          autorizado_por_cedula?: string | null
          autorizado_por_nombre?: string | null
          firma_emisor_path?: string | null
          formulario_id: string
          herramientas?: string | null
          sistema_andamio?: boolean
          sistema_elevador?: boolean
          sistema_escalera?: boolean
          tar_involucradas?: string | null
          tipo_trabajo?: string | null
          vigencia_fin?: string | null
          vigencia_inicio?: string | null
        }
        Update: {
          altura_metros?: number | null
          autorizado_por_cedula?: string | null
          autorizado_por_nombre?: string | null
          firma_emisor_path?: string | null
          formulario_id?: string
          herramientas?: string | null
          sistema_andamio?: boolean
          sistema_elevador?: boolean
          sistema_escalera?: boolean
          tar_involucradas?: string | null
          tipo_trabajo?: string | null
          vigencia_fin?: string | null
          vigencia_inicio?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "altura_detalles_formulario_id_fkey"
            columns: ["formulario_id"]
            isOneToOne: true
            referencedRelation: "formularios"
            referencedColumns: ["id"]
          },
        ]
      }
      altura_epp_chequeo: {
        Row: {
          formulario_id: string
          id: string
          item_codigo: string
          resultado: Database["public"]["Enums"]["chequeo_resultado"]
        }
        Insert: {
          formulario_id: string
          id?: string
          item_codigo: string
          resultado: Database["public"]["Enums"]["chequeo_resultado"]
        }
        Update: {
          formulario_id?: string
          id?: string
          item_codigo?: string
          resultado?: Database["public"]["Enums"]["chequeo_resultado"]
        }
        Relationships: [
          {
            foreignKeyName: "altura_epp_chequeo_formulario_id_fkey"
            columns: ["formulario_id"]
            isOneToOne: false
            referencedRelation: "formularios"
            referencedColumns: ["id"]
          },
        ]
      }
      altura_lista_chequeo: {
        Row: {
          formulario_id: string
          id: string
          item_codigo: string
          resultado: Database["public"]["Enums"]["chequeo_resultado"]
        }
        Insert: {
          formulario_id: string
          id?: string
          item_codigo: string
          resultado: Database["public"]["Enums"]["chequeo_resultado"]
        }
        Update: {
          formulario_id?: string
          id?: string
          item_codigo?: string
          resultado?: Database["public"]["Enums"]["chequeo_resultado"]
        }
        Relationships: [
          {
            foreignKeyName: "altura_lista_chequeo_formulario_id_fkey"
            columns: ["formulario_id"]
            isOneToOne: false
            referencedRelation: "formularios"
            referencedColumns: ["id"]
          },
        ]
      }
      altura_personal: {
        Row: {
          constancia_capacitacion: boolean
          empleado_id: string | null
          firma_path: string | null
          formulario_id: string
          id: string
          nombre_libre: string | null
          profesion: string | null
          ss_verificada: boolean
        }
        Insert: {
          constancia_capacitacion?: boolean
          empleado_id?: string | null
          firma_path?: string | null
          formulario_id: string
          id?: string
          nombre_libre?: string | null
          profesion?: string | null
          ss_verificada?: boolean
        }
        Update: {
          constancia_capacitacion?: boolean
          empleado_id?: string | null
          firma_path?: string | null
          formulario_id?: string
          id?: string
          nombre_libre?: string | null
          profesion?: string | null
          ss_verificada?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "altura_personal_empleado_id_fkey"
            columns: ["empleado_id"]
            isOneToOne: false
            referencedRelation: "empleados"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "altura_personal_formulario_id_fkey"
            columns: ["formulario_id"]
            isOneToOne: false
            referencedRelation: "formularios"
            referencedColumns: ["id"]
          },
        ]
      }
      ats_analisis_riesgo: {
        Row: {
          formulario_id: string
          id: string
          observacion: string | null
          pregunta_codigo: string
          respuesta: boolean | null
        }
        Insert: {
          formulario_id: string
          id?: string
          observacion?: string | null
          pregunta_codigo: string
          respuesta?: boolean | null
        }
        Update: {
          formulario_id?: string
          id?: string
          observacion?: string | null
          pregunta_codigo?: string
          respuesta?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "ats_analisis_riesgo_formulario_id_fkey"
            columns: ["formulario_id"]
            isOneToOne: false
            referencedRelation: "formularios"
            referencedColumns: ["id"]
          },
        ]
      }
      ats_detalles: {
        Row: {
          decision: Database["public"]["Enums"]["riesgo_decision"] | null
          formulario_id: string
          permiso_altura: boolean
          permiso_caliente: boolean
          permiso_confinado: boolean
          permiso_energias: boolean
          permiso_otro: string | null
        }
        Insert: {
          decision?: Database["public"]["Enums"]["riesgo_decision"] | null
          formulario_id: string
          permiso_altura?: boolean
          permiso_caliente?: boolean
          permiso_confinado?: boolean
          permiso_energias?: boolean
          permiso_otro?: string | null
        }
        Update: {
          decision?: Database["public"]["Enums"]["riesgo_decision"] | null
          formulario_id?: string
          permiso_altura?: boolean
          permiso_caliente?: boolean
          permiso_confinado?: boolean
          permiso_energias?: boolean
          permiso_otro?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ats_detalles_formulario_id_fkey"
            columns: ["formulario_id"]
            isOneToOne: true
            referencedRelation: "formularios"
            referencedColumns: ["id"]
          },
        ]
      }
      ats_equipos: {
        Row: {
          categoria: string
          descripcion: string
          formulario_id: string
          id: string
        }
        Insert: {
          categoria: string
          descripcion: string
          formulario_id: string
          id?: string
        }
        Update: {
          categoria?: string
          descripcion?: string
          formulario_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ats_equipos_formulario_id_fkey"
            columns: ["formulario_id"]
            isOneToOne: false
            referencedRelation: "formularios"
            referencedColumns: ["id"]
          },
        ]
      }
      ats_pasos: {
        Row: {
          consecuencias: string | null
          controles: string | null
          formulario_id: string
          id: string
          orden: number
          paso: string
          peligros: string | null
        }
        Insert: {
          consecuencias?: string | null
          controles?: string | null
          formulario_id: string
          id?: string
          orden: number
          paso: string
          peligros?: string | null
        }
        Update: {
          consecuencias?: string | null
          controles?: string | null
          formulario_id?: string
          id?: string
          orden?: number
          paso?: string
          peligros?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ats_pasos_formulario_id_fkey"
            columns: ["formulario_id"]
            isOneToOne: false
            referencedRelation: "formularios"
            referencedColumns: ["id"]
          },
        ]
      }
      ats_trabajadores: {
        Row: {
          cargo: string | null
          empleado_id: string | null
          firma_path: string | null
          formulario_id: string
          id: string
          nombre_libre: string | null
        }
        Insert: {
          cargo?: string | null
          empleado_id?: string | null
          firma_path?: string | null
          formulario_id: string
          id?: string
          nombre_libre?: string | null
        }
        Update: {
          cargo?: string | null
          empleado_id?: string | null
          firma_path?: string | null
          formulario_id?: string
          id?: string
          nombre_libre?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ats_trabajadores_empleado_id_fkey"
            columns: ["empleado_id"]
            isOneToOne: false
            referencedRelation: "empleados"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ats_trabajadores_formulario_id_fkey"
            columns: ["formulario_id"]
            isOneToOne: false
            referencedRelation: "formularios"
            referencedColumns: ["id"]
          },
        ]
      }
      auditoria_logs: {
        Row: {
          accion: string
          actor_id: string | null
          antes: Json | null
          created_at: string
          despues: Json | null
          id: string
          registro_id: string
          tabla: string
        }
        Insert: {
          accion: string
          actor_id?: string | null
          antes?: Json | null
          created_at?: string
          despues?: Json | null
          id?: string
          registro_id: string
          tabla: string
        }
        Update: {
          accion?: string
          actor_id?: string | null
          antes?: Json | null
          created_at?: string
          despues?: Json | null
          id?: string
          registro_id?: string
          tabla?: string
        }
        Relationships: [
          {
            foreignKeyName: "auditoria_logs_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      ausentismos: {
        Row: {
          created_at: string
          empleado_id: string
          fecha_fin: string
          fecha_inicio: string
          id: string
          proyecto_id: string
          razon: string
          registrado_por: string | null
          soporte_pdf_path: string | null
          tipo: Database["public"]["Enums"]["ausentismo_tipo"]
        }
        Insert: {
          created_at?: string
          empleado_id: string
          fecha_fin: string
          fecha_inicio: string
          id?: string
          proyecto_id: string
          razon: string
          registrado_por?: string | null
          soporte_pdf_path?: string | null
          tipo: Database["public"]["Enums"]["ausentismo_tipo"]
        }
        Update: {
          created_at?: string
          empleado_id?: string
          fecha_fin?: string
          fecha_inicio?: string
          id?: string
          proyecto_id?: string
          razon?: string
          registrado_por?: string | null
          soporte_pdf_path?: string | null
          tipo?: Database["public"]["Enums"]["ausentismo_tipo"]
        }
        Relationships: [
          {
            foreignKeyName: "ausentismos_empleado_id_fkey"
            columns: ["empleado_id"]
            isOneToOne: false
            referencedRelation: "empleados"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ausentismos_proyecto_id_fkey"
            columns: ["proyecto_id"]
            isOneToOne: false
            referencedRelation: "proyectos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ausentismos_proyecto_id_fkey"
            columns: ["proyecto_id"]
            isOneToOne: false
            referencedRelation: "vw_proyecto_resumen"
            referencedColumns: ["proyecto_id"]
          },
          {
            foreignKeyName: "ausentismos_proyecto_id_fkey"
            columns: ["proyecto_id"]
            isOneToOne: false
            referencedRelation: "vw_proyectos_finanzas"
            referencedColumns: ["proyecto_id"]
          },
          {
            foreignKeyName: "ausentismos_registrado_por_fkey"
            columns: ["registrado_por"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      caliente_area_trabajo: {
        Row: {
          formulario_id: string
          id: string
          item_codigo: string
          resultado: Database["public"]["Enums"]["chequeo_resultado"]
        }
        Insert: {
          formulario_id: string
          id?: string
          item_codigo: string
          resultado: Database["public"]["Enums"]["chequeo_resultado"]
        }
        Update: {
          formulario_id?: string
          id?: string
          item_codigo?: string
          resultado?: Database["public"]["Enums"]["chequeo_resultado"]
        }
        Relationships: [
          {
            foreignKeyName: "caliente_area_trabajo_formulario_id_fkey"
            columns: ["formulario_id"]
            isOneToOne: false
            referencedRelation: "formularios"
            referencedColumns: ["id"]
          },
        ]
      }
      caliente_cierre: {
        Row: {
          formulario_id: string
          id: string
          item_codigo: string
          resultado: Database["public"]["Enums"]["chequeo_resultado"]
        }
        Insert: {
          formulario_id: string
          id?: string
          item_codigo: string
          resultado: Database["public"]["Enums"]["chequeo_resultado"]
        }
        Update: {
          formulario_id?: string
          id?: string
          item_codigo?: string
          resultado?: Database["public"]["Enums"]["chequeo_resultado"]
        }
        Relationships: [
          {
            foreignKeyName: "caliente_cierre_formulario_id_fkey"
            columns: ["formulario_id"]
            isOneToOne: false
            referencedRelation: "formularios"
            referencedColumns: ["id"]
          },
        ]
      }
      caliente_detalles: {
        Row: {
          area: string | null
          bloqueo_electrica: boolean
          bloqueo_hidraulica: boolean
          bloqueo_mecanica: boolean
          bloqueo_neumatica: boolean
          bloqueo_termica: boolean
          formulario_id: string
          proposito: string | null
          vigencia_fin: string | null
          vigencia_inicio: string | null
        }
        Insert: {
          area?: string | null
          bloqueo_electrica?: boolean
          bloqueo_hidraulica?: boolean
          bloqueo_mecanica?: boolean
          bloqueo_neumatica?: boolean
          bloqueo_termica?: boolean
          formulario_id: string
          proposito?: string | null
          vigencia_fin?: string | null
          vigencia_inicio?: string | null
        }
        Update: {
          area?: string | null
          bloqueo_electrica?: boolean
          bloqueo_hidraulica?: boolean
          bloqueo_mecanica?: boolean
          bloqueo_neumatica?: boolean
          bloqueo_termica?: boolean
          formulario_id?: string
          proposito?: string | null
          vigencia_fin?: string | null
          vigencia_inicio?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "caliente_detalles_formulario_id_fkey"
            columns: ["formulario_id"]
            isOneToOne: true
            referencedRelation: "formularios"
            referencedColumns: ["id"]
          },
        ]
      }
      caliente_epp: {
        Row: {
          formulario_id: string
          id: string
          item_codigo: string
          resultado: Database["public"]["Enums"]["chequeo_resultado"]
        }
        Insert: {
          formulario_id: string
          id?: string
          item_codigo: string
          resultado: Database["public"]["Enums"]["chequeo_resultado"]
        }
        Update: {
          formulario_id?: string
          id?: string
          item_codigo?: string
          resultado?: Database["public"]["Enums"]["chequeo_resultado"]
        }
        Relationships: [
          {
            foreignKeyName: "caliente_epp_formulario_id_fkey"
            columns: ["formulario_id"]
            isOneToOne: false
            referencedRelation: "formularios"
            referencedColumns: ["id"]
          },
        ]
      }
      caliente_firmas: {
        Row: {
          empleado_id: string | null
          firma_path: string | null
          firmado_at: string
          formulario_id: string
          id: string
          momento: Database["public"]["Enums"]["firma_momento"]
          nombre_libre: string | null
        }
        Insert: {
          empleado_id?: string | null
          firma_path?: string | null
          firmado_at?: string
          formulario_id: string
          id?: string
          momento: Database["public"]["Enums"]["firma_momento"]
          nombre_libre?: string | null
        }
        Update: {
          empleado_id?: string | null
          firma_path?: string | null
          firmado_at?: string
          formulario_id?: string
          id?: string
          momento?: Database["public"]["Enums"]["firma_momento"]
          nombre_libre?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "caliente_firmas_empleado_id_fkey"
            columns: ["empleado_id"]
            isOneToOne: false
            referencedRelation: "empleados"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "caliente_firmas_formulario_id_fkey"
            columns: ["formulario_id"]
            isOneToOne: false
            referencedRelation: "formularios"
            referencedColumns: ["id"]
          },
        ]
      }
      caliente_planeacion: {
        Row: {
          formulario_id: string
          id: string
          item_codigo: string
          resultado: Database["public"]["Enums"]["chequeo_resultado"]
        }
        Insert: {
          formulario_id: string
          id?: string
          item_codigo: string
          resultado: Database["public"]["Enums"]["chequeo_resultado"]
        }
        Update: {
          formulario_id?: string
          id?: string
          item_codigo?: string
          resultado?: Database["public"]["Enums"]["chequeo_resultado"]
        }
        Relationships: [
          {
            foreignKeyName: "caliente_planeacion_formulario_id_fkey"
            columns: ["formulario_id"]
            isOneToOne: false
            referencedRelation: "formularios"
            referencedColumns: ["id"]
          },
        ]
      }
      caliente_verificacion: {
        Row: {
          formulario_id: string
          id: string
          item_codigo: string
          resultado: Database["public"]["Enums"]["chequeo_resultado"]
        }
        Insert: {
          formulario_id: string
          id?: string
          item_codigo: string
          resultado: Database["public"]["Enums"]["chequeo_resultado"]
        }
        Update: {
          formulario_id?: string
          id?: string
          item_codigo?: string
          resultado?: Database["public"]["Enums"]["chequeo_resultado"]
        }
        Relationships: [
          {
            foreignKeyName: "caliente_verificacion_formulario_id_fkey"
            columns: ["formulario_id"]
            isOneToOne: false
            referencedRelation: "formularios"
            referencedColumns: ["id"]
          },
        ]
      }
      cuentas_por_cobrar: {
        Row: {
          cliente_nit: string | null
          cliente_nombre: string
          created_at: string
          created_by: string | null
          estado: Database["public"]["Enums"]["factura_estado"]
          fecha_emision: string
          fecha_vencimiento: string
          id: string
          monto_cobrado: number
          monto_total: number
          notas: string | null
          numero_factura: string
          proyecto_id: string
          rubro_id: string
          updated_at: string
        }
        Insert: {
          cliente_nit?: string | null
          cliente_nombre: string
          created_at?: string
          created_by?: string | null
          estado?: Database["public"]["Enums"]["factura_estado"]
          fecha_emision: string
          fecha_vencimiento: string
          id?: string
          monto_cobrado?: number
          monto_total: number
          notas?: string | null
          numero_factura: string
          proyecto_id: string
          rubro_id: string
          updated_at?: string
        }
        Update: {
          cliente_nit?: string | null
          cliente_nombre?: string
          created_at?: string
          created_by?: string | null
          estado?: Database["public"]["Enums"]["factura_estado"]
          fecha_emision?: string
          fecha_vencimiento?: string
          id?: string
          monto_cobrado?: number
          monto_total?: number
          notas?: string | null
          numero_factura?: string
          proyecto_id?: string
          rubro_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cuentas_por_cobrar_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cuentas_por_cobrar_proyecto_id_fkey"
            columns: ["proyecto_id"]
            isOneToOne: false
            referencedRelation: "proyectos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cuentas_por_cobrar_proyecto_id_fkey"
            columns: ["proyecto_id"]
            isOneToOne: false
            referencedRelation: "vw_proyecto_resumen"
            referencedColumns: ["proyecto_id"]
          },
          {
            foreignKeyName: "cuentas_por_cobrar_proyecto_id_fkey"
            columns: ["proyecto_id"]
            isOneToOne: false
            referencedRelation: "vw_proyectos_finanzas"
            referencedColumns: ["proyecto_id"]
          },
          {
            foreignKeyName: "cuentas_por_cobrar_rubro_id_fkey"
            columns: ["rubro_id"]
            isOneToOne: false
            referencedRelation: "rubros"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cuentas_por_cobrar_rubro_id_fkey"
            columns: ["rubro_id"]
            isOneToOne: false
            referencedRelation: "vw_flujo_caja_quincenal"
            referencedColumns: ["rubro_id"]
          },
          {
            foreignKeyName: "cuentas_por_cobrar_rubro_id_fkey"
            columns: ["rubro_id"]
            isOneToOne: false
            referencedRelation: "vw_rubro_balance"
            referencedColumns: ["rubro_id"]
          },
        ]
      }
      cuentas_por_cobrar_cuotas: {
        Row: {
          created_at: string
          cxc_id: string
          estado: Database["public"]["Enums"]["factura_estado"]
          fecha_vencimiento: string
          id: string
          monto: number
          monto_cobrado: number
          numero_cuota: number
          proyecto_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          cxc_id: string
          estado?: Database["public"]["Enums"]["factura_estado"]
          fecha_vencimiento: string
          id?: string
          monto: number
          monto_cobrado?: number
          numero_cuota: number
          proyecto_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          cxc_id?: string
          estado?: Database["public"]["Enums"]["factura_estado"]
          fecha_vencimiento?: string
          id?: string
          monto?: number
          monto_cobrado?: number
          numero_cuota?: number
          proyecto_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cuentas_por_cobrar_cuotas_cxc_id_fkey"
            columns: ["cxc_id"]
            isOneToOne: false
            referencedRelation: "cuentas_por_cobrar"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cuentas_por_cobrar_cuotas_proyecto_id_fkey"
            columns: ["proyecto_id"]
            isOneToOne: false
            referencedRelation: "proyectos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cuentas_por_cobrar_cuotas_proyecto_id_fkey"
            columns: ["proyecto_id"]
            isOneToOne: false
            referencedRelation: "vw_proyecto_resumen"
            referencedColumns: ["proyecto_id"]
          },
          {
            foreignKeyName: "cuentas_por_cobrar_cuotas_proyecto_id_fkey"
            columns: ["proyecto_id"]
            isOneToOne: false
            referencedRelation: "vw_proyectos_finanzas"
            referencedColumns: ["proyecto_id"]
          },
        ]
      }
      cuentas_por_pagar: {
        Row: {
          created_at: string
          created_by: string | null
          estado: Database["public"]["Enums"]["factura_estado"]
          fecha_emision: string
          fecha_vencimiento: string
          id: string
          monto_pagado: number
          monto_total: number
          notas: string | null
          numero_factura: string
          proveedor_nit: string | null
          proveedor_nombre: string
          proyecto_id: string
          rubro_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          estado?: Database["public"]["Enums"]["factura_estado"]
          fecha_emision: string
          fecha_vencimiento: string
          id?: string
          monto_pagado?: number
          monto_total: number
          notas?: string | null
          numero_factura: string
          proveedor_nit?: string | null
          proveedor_nombre: string
          proyecto_id: string
          rubro_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          estado?: Database["public"]["Enums"]["factura_estado"]
          fecha_emision?: string
          fecha_vencimiento?: string
          id?: string
          monto_pagado?: number
          monto_total?: number
          notas?: string | null
          numero_factura?: string
          proveedor_nit?: string | null
          proveedor_nombre?: string
          proyecto_id?: string
          rubro_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cuentas_por_pagar_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cuentas_por_pagar_proyecto_id_fkey"
            columns: ["proyecto_id"]
            isOneToOne: false
            referencedRelation: "proyectos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cuentas_por_pagar_proyecto_id_fkey"
            columns: ["proyecto_id"]
            isOneToOne: false
            referencedRelation: "vw_proyecto_resumen"
            referencedColumns: ["proyecto_id"]
          },
          {
            foreignKeyName: "cuentas_por_pagar_proyecto_id_fkey"
            columns: ["proyecto_id"]
            isOneToOne: false
            referencedRelation: "vw_proyectos_finanzas"
            referencedColumns: ["proyecto_id"]
          },
          {
            foreignKeyName: "cuentas_por_pagar_rubro_id_fkey"
            columns: ["rubro_id"]
            isOneToOne: false
            referencedRelation: "rubros"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cuentas_por_pagar_rubro_id_fkey"
            columns: ["rubro_id"]
            isOneToOne: false
            referencedRelation: "vw_flujo_caja_quincenal"
            referencedColumns: ["rubro_id"]
          },
          {
            foreignKeyName: "cuentas_por_pagar_rubro_id_fkey"
            columns: ["rubro_id"]
            isOneToOne: false
            referencedRelation: "vw_rubro_balance"
            referencedColumns: ["rubro_id"]
          },
        ]
      }
      cuentas_por_pagar_cuotas: {
        Row: {
          created_at: string
          cxp_id: string
          estado: Database["public"]["Enums"]["factura_estado"]
          fecha_vencimiento: string
          id: string
          monto: number
          monto_pagado: number
          numero_cuota: number
          proyecto_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          cxp_id: string
          estado?: Database["public"]["Enums"]["factura_estado"]
          fecha_vencimiento: string
          id?: string
          monto: number
          monto_pagado?: number
          numero_cuota: number
          proyecto_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          cxp_id?: string
          estado?: Database["public"]["Enums"]["factura_estado"]
          fecha_vencimiento?: string
          id?: string
          monto?: number
          monto_pagado?: number
          numero_cuota?: number
          proyecto_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cuentas_por_pagar_cuotas_cxp_id_fkey"
            columns: ["cxp_id"]
            isOneToOne: false
            referencedRelation: "cuentas_por_pagar"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cuentas_por_pagar_cuotas_proyecto_id_fkey"
            columns: ["proyecto_id"]
            isOneToOne: false
            referencedRelation: "proyectos"
            referencedColumns: ["id"]
          },
        ]
      }
      empleado_documentos: {
        Row: {
          empleado_id: string
          id: string
          nombre: string | null
          storage_path: string
          tipo: Database["public"]["Enums"]["documento_empleado_tipo"]
          uploaded_at: string
          uploaded_by: string | null
          vigencia_desde: string | null
          vigencia_hasta: string | null
        }
        Insert: {
          empleado_id: string
          id?: string
          nombre?: string | null
          storage_path: string
          tipo: Database["public"]["Enums"]["documento_empleado_tipo"]
          uploaded_at?: string
          uploaded_by?: string | null
          vigencia_desde?: string | null
          vigencia_hasta?: string | null
        }
        Update: {
          empleado_id?: string
          id?: string
          nombre?: string | null
          storage_path?: string
          tipo?: Database["public"]["Enums"]["documento_empleado_tipo"]
          uploaded_at?: string
          uploaded_by?: string | null
          vigencia_desde?: string | null
          vigencia_hasta?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "empleado_documentos_empleado_id_fkey"
            columns: ["empleado_id"]
            isOneToOne: false
            referencedRelation: "empleados"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "empleado_documentos_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      empleado_proyectos: {
        Row: {
          asignado_at: string
          asignado_por: string | null
          empleado_id: string
          id: string
          notas: string | null
          proyecto_id: string
          retirado_at: string | null
        }
        Insert: {
          asignado_at?: string
          asignado_por?: string | null
          empleado_id: string
          id?: string
          notas?: string | null
          proyecto_id: string
          retirado_at?: string | null
        }
        Update: {
          asignado_at?: string
          asignado_por?: string | null
          empleado_id?: string
          id?: string
          notas?: string | null
          proyecto_id?: string
          retirado_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "empleado_proyectos_asignado_por_fkey"
            columns: ["asignado_por"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "empleado_proyectos_empleado_id_fkey"
            columns: ["empleado_id"]
            isOneToOne: false
            referencedRelation: "empleados"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "empleado_proyectos_proyecto_id_fkey"
            columns: ["proyecto_id"]
            isOneToOne: false
            referencedRelation: "proyectos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "empleado_proyectos_proyecto_id_fkey"
            columns: ["proyecto_id"]
            isOneToOne: false
            referencedRelation: "vw_proyecto_resumen"
            referencedColumns: ["proyecto_id"]
          },
          {
            foreignKeyName: "empleado_proyectos_proyecto_id_fkey"
            columns: ["proyecto_id"]
            isOneToOne: false
            referencedRelation: "vw_proyectos_finanzas"
            referencedColumns: ["proyecto_id"]
          },
        ]
      }
      empleados: {
        Row: {
          activo: boolean
          arl: string | null
          cargo: string | null
          cedula: string
          created_at: string
          deleted_at: string | null
          email: string | null
          empresa_id: string
          eps: string | null
          fecha_ingreso: string | null
          fecha_retiro: string | null
          fondo_pension: string | null
          foto_path: string | null
          id: string
          nombre: string
          profesion: string | null
          subempresa_id: string
          telefono: string | null
          updated_at: string
        }
        Insert: {
          activo?: boolean
          arl?: string | null
          cargo?: string | null
          cedula: string
          created_at?: string
          deleted_at?: string | null
          email?: string | null
          empresa_id: string
          eps?: string | null
          fecha_ingreso?: string | null
          fecha_retiro?: string | null
          fondo_pension?: string | null
          foto_path?: string | null
          id?: string
          nombre: string
          profesion?: string | null
          subempresa_id: string
          telefono?: string | null
          updated_at?: string
        }
        Update: {
          activo?: boolean
          arl?: string | null
          cargo?: string | null
          cedula?: string
          created_at?: string
          deleted_at?: string | null
          email?: string | null
          empresa_id?: string
          eps?: string | null
          fecha_ingreso?: string | null
          fecha_retiro?: string | null
          fondo_pension?: string | null
          foto_path?: string | null
          id?: string
          nombre?: string
          profesion?: string | null
          subempresa_id?: string
          telefono?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "empleados_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "empleados_subempresa_id_fkey"
            columns: ["subempresa_id"]
            isOneToOne: false
            referencedRelation: "subempresas"
            referencedColumns: ["id"]
          },
        ]
      }
      empresas: {
        Row: {
          activa: boolean
          ciudad: string | null
          created_at: string
          deleted_at: string | null
          direccion: string | null
          email: string | null
          id: string
          logo_path: string | null
          nit: string
          nombre: string
          telefono: string | null
          updated_at: string
        }
        Insert: {
          activa?: boolean
          ciudad?: string | null
          created_at?: string
          deleted_at?: string | null
          direccion?: string | null
          email?: string | null
          id?: string
          logo_path?: string | null
          nit: string
          nombre: string
          telefono?: string | null
          updated_at?: string
        }
        Update: {
          activa?: boolean
          ciudad?: string | null
          created_at?: string
          deleted_at?: string | null
          direccion?: string | null
          email?: string | null
          id?: string
          logo_path?: string | null
          nit?: string
          nombre?: string
          telefono?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      formulario_secuencias: {
        Row: {
          anio: number
          empresa_id: string
          tipo: Database["public"]["Enums"]["formulario_tipo"]
          ultimo_num: number
        }
        Insert: {
          anio: number
          empresa_id: string
          tipo: Database["public"]["Enums"]["formulario_tipo"]
          ultimo_num?: number
        }
        Update: {
          anio?: number
          empresa_id?: string
          tipo?: Database["public"]["Enums"]["formulario_tipo"]
          ultimo_num?: number
        }
        Relationships: [
          {
            foreignKeyName: "formulario_secuencias_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      formularios: {
        Row: {
          area: string | null
          ciudad: string | null
          codigo_consecutivo: string | null
          creado_por: string | null
          created_at: string
          empresa_id: string
          estado: Database["public"]["Enums"]["formulario_estado"]
          fecha_fin: string | null
          fecha_inicio: string | null
          firmado_at: string | null
          id: string
          pdf_generado_path: string | null
          proyecto_id: string
          subempresa_id: string
          tipo: Database["public"]["Enums"]["formulario_tipo"]
          ubicacion: string | null
          updated_at: string
        }
        Insert: {
          area?: string | null
          ciudad?: string | null
          codigo_consecutivo?: string | null
          creado_por?: string | null
          created_at?: string
          empresa_id: string
          estado?: Database["public"]["Enums"]["formulario_estado"]
          fecha_fin?: string | null
          fecha_inicio?: string | null
          firmado_at?: string | null
          id?: string
          pdf_generado_path?: string | null
          proyecto_id: string
          subempresa_id: string
          tipo: Database["public"]["Enums"]["formulario_tipo"]
          ubicacion?: string | null
          updated_at?: string
        }
        Update: {
          area?: string | null
          ciudad?: string | null
          codigo_consecutivo?: string | null
          creado_por?: string | null
          created_at?: string
          empresa_id?: string
          estado?: Database["public"]["Enums"]["formulario_estado"]
          fecha_fin?: string | null
          fecha_inicio?: string | null
          firmado_at?: string | null
          id?: string
          pdf_generado_path?: string | null
          proyecto_id?: string
          subempresa_id?: string
          tipo?: Database["public"]["Enums"]["formulario_tipo"]
          ubicacion?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "formularios_creado_por_fkey"
            columns: ["creado_por"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "formularios_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "formularios_proyecto_id_fkey"
            columns: ["proyecto_id"]
            isOneToOne: false
            referencedRelation: "proyectos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "formularios_proyecto_id_fkey"
            columns: ["proyecto_id"]
            isOneToOne: false
            referencedRelation: "vw_proyecto_resumen"
            referencedColumns: ["proyecto_id"]
          },
          {
            foreignKeyName: "formularios_proyecto_id_fkey"
            columns: ["proyecto_id"]
            isOneToOne: false
            referencedRelation: "vw_proyectos_finanzas"
            referencedColumns: ["proyecto_id"]
          },
          {
            foreignKeyName: "formularios_subempresa_id_fkey"
            columns: ["subempresa_id"]
            isOneToOne: false
            referencedRelation: "subempresas"
            referencedColumns: ["id"]
          },
        ]
      }
      fotos: {
        Row: {
          autor_id: string | null
          capturada_at: string | null
          descripcion: string | null
          exif_json: Json | null
          id: string
          lat: number | null
          lng: number | null
          nombre: string | null
          proyecto_id: string
          storage_path: string
          tamano_bytes: number | null
          uploaded_at: string
        }
        Insert: {
          autor_id?: string | null
          capturada_at?: string | null
          descripcion?: string | null
          exif_json?: Json | null
          id?: string
          lat?: number | null
          lng?: number | null
          nombre?: string | null
          proyecto_id: string
          storage_path: string
          tamano_bytes?: number | null
          uploaded_at?: string
        }
        Update: {
          autor_id?: string | null
          capturada_at?: string | null
          descripcion?: string | null
          exif_json?: Json | null
          id?: string
          lat?: number | null
          lng?: number | null
          nombre?: string | null
          proyecto_id?: string
          storage_path?: string
          tamano_bytes?: number | null
          uploaded_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fotos_autor_id_fkey"
            columns: ["autor_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fotos_proyecto_id_fkey"
            columns: ["proyecto_id"]
            isOneToOne: false
            referencedRelation: "proyectos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fotos_proyecto_id_fkey"
            columns: ["proyecto_id"]
            isOneToOne: false
            referencedRelation: "vw_proyecto_resumen"
            referencedColumns: ["proyecto_id"]
          },
          {
            foreignKeyName: "fotos_proyecto_id_fkey"
            columns: ["proyecto_id"]
            isOneToOne: false
            referencedRelation: "vw_proyectos_finanzas"
            referencedColumns: ["proyecto_id"]
          },
        ]
      }
      incidente_evidencias: {
        Row: {
          descripcion: string | null
          id: string
          incidente_id: string
          storage_path: string
          tipo: string | null
          uploaded_at: string
          uploaded_by: string | null
        }
        Insert: {
          descripcion?: string | null
          id?: string
          incidente_id: string
          storage_path: string
          tipo?: string | null
          uploaded_at?: string
          uploaded_by?: string | null
        }
        Update: {
          descripcion?: string | null
          id?: string
          incidente_id?: string
          storage_path?: string
          tipo?: string | null
          uploaded_at?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "incidente_evidencias_incidente_id_fkey"
            columns: ["incidente_id"]
            isOneToOne: false
            referencedRelation: "incidentes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incidente_evidencias_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      incidentes: {
        Row: {
          acciones_correctivas: string | null
          acciones_tomadas: string | null
          causas: string | null
          created_at: string
          descripcion: string
          empleado_id: string
          fecha: string
          id: string
          lat: number | null
          lng: number | null
          proyecto_id: string
          registrado_por: string | null
          reportado_arl: boolean
          severidad: Database["public"]["Enums"]["incidente_severidad"]
          tipo: Database["public"]["Enums"]["incidente_tipo"]
          ubicacion: string | null
          updated_at: string
        }
        Insert: {
          acciones_correctivas?: string | null
          acciones_tomadas?: string | null
          causas?: string | null
          created_at?: string
          descripcion: string
          empleado_id: string
          fecha: string
          id?: string
          lat?: number | null
          lng?: number | null
          proyecto_id: string
          registrado_por?: string | null
          reportado_arl?: boolean
          severidad: Database["public"]["Enums"]["incidente_severidad"]
          tipo: Database["public"]["Enums"]["incidente_tipo"]
          ubicacion?: string | null
          updated_at?: string
        }
        Update: {
          acciones_correctivas?: string | null
          acciones_tomadas?: string | null
          causas?: string | null
          created_at?: string
          descripcion?: string
          empleado_id?: string
          fecha?: string
          id?: string
          lat?: number | null
          lng?: number | null
          proyecto_id?: string
          registrado_por?: string | null
          reportado_arl?: boolean
          severidad?: Database["public"]["Enums"]["incidente_severidad"]
          tipo?: Database["public"]["Enums"]["incidente_tipo"]
          ubicacion?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "incidentes_empleado_id_fkey"
            columns: ["empleado_id"]
            isOneToOne: false
            referencedRelation: "empleados"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incidentes_proyecto_id_fkey"
            columns: ["proyecto_id"]
            isOneToOne: false
            referencedRelation: "proyectos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incidentes_proyecto_id_fkey"
            columns: ["proyecto_id"]
            isOneToOne: false
            referencedRelation: "vw_proyecto_resumen"
            referencedColumns: ["proyecto_id"]
          },
          {
            foreignKeyName: "incidentes_proyecto_id_fkey"
            columns: ["proyecto_id"]
            isOneToOne: false
            referencedRelation: "vw_proyectos_finanzas"
            referencedColumns: ["proyecto_id"]
          },
          {
            foreignKeyName: "incidentes_registrado_por_fkey"
            columns: ["registrado_por"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      movimientos: {
        Row: {
          aprobado_at: string | null
          aprobado_por: string | null
          comprobante_nombre: string | null
          comprobante_path: string | null
          created_at: string
          ejecutado_at: string | null
          estado: Database["public"]["Enums"]["movimiento_estado"]
          fecha_efectiva: string
          id: string
          justificacion: string
          monto: number
          proyecto_id: string
          rubro_destino_id: string
          rubro_origen_id: string | null
          solicitado_por: string | null
          tipo: Database["public"]["Enums"]["movimiento_tipo"]
          updated_at: string
        }
        Insert: {
          aprobado_at?: string | null
          aprobado_por?: string | null
          comprobante_nombre?: string | null
          comprobante_path?: string | null
          created_at?: string
          ejecutado_at?: string | null
          estado?: Database["public"]["Enums"]["movimiento_estado"]
          fecha_efectiva?: string
          id?: string
          justificacion: string
          monto: number
          proyecto_id: string
          rubro_destino_id: string
          rubro_origen_id?: string | null
          solicitado_por?: string | null
          tipo: Database["public"]["Enums"]["movimiento_tipo"]
          updated_at?: string
        }
        Update: {
          aprobado_at?: string | null
          aprobado_por?: string | null
          comprobante_nombre?: string | null
          comprobante_path?: string | null
          created_at?: string
          ejecutado_at?: string | null
          estado?: Database["public"]["Enums"]["movimiento_estado"]
          fecha_efectiva?: string
          id?: string
          justificacion?: string
          monto?: number
          proyecto_id?: string
          rubro_destino_id?: string
          rubro_origen_id?: string | null
          solicitado_por?: string | null
          tipo?: Database["public"]["Enums"]["movimiento_tipo"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "movimientos_aprobado_por_fkey"
            columns: ["aprobado_por"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "movimientos_proyecto_id_fkey"
            columns: ["proyecto_id"]
            isOneToOne: false
            referencedRelation: "proyectos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "movimientos_proyecto_id_fkey"
            columns: ["proyecto_id"]
            isOneToOne: false
            referencedRelation: "vw_proyecto_resumen"
            referencedColumns: ["proyecto_id"]
          },
          {
            foreignKeyName: "movimientos_proyecto_id_fkey"
            columns: ["proyecto_id"]
            isOneToOne: false
            referencedRelation: "vw_proyectos_finanzas"
            referencedColumns: ["proyecto_id"]
          },
          {
            foreignKeyName: "movimientos_rubro_destino_id_fkey"
            columns: ["rubro_destino_id"]
            isOneToOne: false
            referencedRelation: "rubros"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "movimientos_rubro_destino_id_fkey"
            columns: ["rubro_destino_id"]
            isOneToOne: false
            referencedRelation: "vw_flujo_caja_quincenal"
            referencedColumns: ["rubro_id"]
          },
          {
            foreignKeyName: "movimientos_rubro_destino_id_fkey"
            columns: ["rubro_destino_id"]
            isOneToOne: false
            referencedRelation: "vw_rubro_balance"
            referencedColumns: ["rubro_id"]
          },
          {
            foreignKeyName: "movimientos_rubro_origen_id_fkey"
            columns: ["rubro_origen_id"]
            isOneToOne: false
            referencedRelation: "rubros"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "movimientos_rubro_origen_id_fkey"
            columns: ["rubro_origen_id"]
            isOneToOne: false
            referencedRelation: "vw_flujo_caja_quincenal"
            referencedColumns: ["rubro_id"]
          },
          {
            foreignKeyName: "movimientos_rubro_origen_id_fkey"
            columns: ["rubro_origen_id"]
            isOneToOne: false
            referencedRelation: "vw_rubro_balance"
            referencedColumns: ["rubro_id"]
          },
          {
            foreignKeyName: "movimientos_solicitado_por_fkey"
            columns: ["solicitado_por"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      observaciones: {
        Row: {
          autor_id: string | null
          contenido: string
          created_at: string
          id: string
          importante: boolean
          proyecto_id: string
          updated_at: string
        }
        Insert: {
          autor_id?: string | null
          contenido: string
          created_at?: string
          id?: string
          importante?: boolean
          proyecto_id: string
          updated_at?: string
        }
        Update: {
          autor_id?: string | null
          contenido?: string
          created_at?: string
          id?: string
          importante?: boolean
          proyecto_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "observaciones_autor_id_fkey"
            columns: ["autor_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "observaciones_proyecto_id_fkey"
            columns: ["proyecto_id"]
            isOneToOne: false
            referencedRelation: "proyectos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "observaciones_proyecto_id_fkey"
            columns: ["proyecto_id"]
            isOneToOne: false
            referencedRelation: "vw_proyecto_resumen"
            referencedColumns: ["proyecto_id"]
          },
          {
            foreignKeyName: "observaciones_proyecto_id_fkey"
            columns: ["proyecto_id"]
            isOneToOne: false
            referencedRelation: "vw_proyectos_finanzas"
            referencedColumns: ["proyecto_id"]
          },
        ]
      }
      partes_diarios_sst: {
        Row: {
          created_at: string
          empresa_id: string
          fecha: string
          id: string
          observaciones: string | null
          presentes: number
          proyecto_id: string
          registrado_por: string | null
          subempresa_id: string | null
          total_programado: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          empresa_id: string
          fecha: string
          id?: string
          observaciones?: string | null
          presentes?: number
          proyecto_id: string
          registrado_por?: string | null
          subempresa_id?: string | null
          total_programado?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          empresa_id?: string
          fecha?: string
          id?: string
          observaciones?: string | null
          presentes?: number
          proyecto_id?: string
          registrado_por?: string | null
          subempresa_id?: string | null
          total_programado?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "partes_diarios_sst_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partes_diarios_sst_proyecto_id_fkey"
            columns: ["proyecto_id"]
            isOneToOne: false
            referencedRelation: "proyectos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partes_diarios_sst_proyecto_id_fkey"
            columns: ["proyecto_id"]
            isOneToOne: false
            referencedRelation: "vw_proyecto_resumen"
            referencedColumns: ["proyecto_id"]
          },
          {
            foreignKeyName: "partes_diarios_sst_proyecto_id_fkey"
            columns: ["proyecto_id"]
            isOneToOne: false
            referencedRelation: "vw_proyectos_finanzas"
            referencedColumns: ["proyecto_id"]
          },
          {
            foreignKeyName: "partes_diarios_sst_registrado_por_fkey"
            columns: ["registrado_por"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partes_diarios_sst_subempresa_id_fkey"
            columns: ["subempresa_id"]
            isOneToOne: false
            referencedRelation: "subempresas"
            referencedColumns: ["id"]
          },
        ]
      }
      proyecto_avances: {
        Row: {
          avance_proyectado: number
          avance_real: number
          created_at: string
          fecha: string
          id: string
          notas: string | null
          proyecto_id: string
          registrado_por: string | null
        }
        Insert: {
          avance_proyectado: number
          avance_real: number
          created_at?: string
          fecha: string
          id?: string
          notas?: string | null
          proyecto_id: string
          registrado_por?: string | null
        }
        Update: {
          avance_proyectado?: number
          avance_real?: number
          created_at?: string
          fecha?: string
          id?: string
          notas?: string | null
          proyecto_id?: string
          registrado_por?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "proyecto_avances_proyecto_id_fkey"
            columns: ["proyecto_id"]
            isOneToOne: false
            referencedRelation: "proyectos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proyecto_avances_proyecto_id_fkey"
            columns: ["proyecto_id"]
            isOneToOne: false
            referencedRelation: "vw_proyecto_resumen"
            referencedColumns: ["proyecto_id"]
          },
          {
            foreignKeyName: "proyecto_avances_proyecto_id_fkey"
            columns: ["proyecto_id"]
            isOneToOne: false
            referencedRelation: "vw_proyectos_finanzas"
            referencedColumns: ["proyecto_id"]
          },
          {
            foreignKeyName: "proyecto_avances_registrado_por_fkey"
            columns: ["registrado_por"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      proyecto_metas: {
        Row: {
          avance_esperado: number
          created_at: string | null
          fecha: string
          id: string
          proyecto_id: string
        }
        Insert: {
          avance_esperado: number
          created_at?: string | null
          fecha: string
          id?: string
          proyecto_id: string
        }
        Update: {
          avance_esperado?: number
          created_at?: string | null
          fecha?: string
          id?: string
          proyecto_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "proyecto_metas_proyecto_id_fkey"
            columns: ["proyecto_id"]
            isOneToOne: false
            referencedRelation: "proyectos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proyecto_metas_proyecto_id_fkey"
            columns: ["proyecto_id"]
            isOneToOne: false
            referencedRelation: "vw_proyecto_resumen"
            referencedColumns: ["proyecto_id"]
          },
          {
            foreignKeyName: "proyecto_metas_proyecto_id_fkey"
            columns: ["proyecto_id"]
            isOneToOne: false
            referencedRelation: "vw_proyectos_finanzas"
            referencedColumns: ["proyecto_id"]
          },
        ]
      }
      proyecto_usuarios: {
        Row: {
          asignado_at: string
          asignado_por: string | null
          proyecto_id: string
          retirado_at: string | null
          usuario_id: string
        }
        Insert: {
          asignado_at?: string
          asignado_por?: string | null
          proyecto_id: string
          retirado_at?: string | null
          usuario_id: string
        }
        Update: {
          asignado_at?: string
          asignado_por?: string | null
          proyecto_id?: string
          retirado_at?: string | null
          usuario_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "proyecto_usuarios_asignado_por_fkey"
            columns: ["asignado_por"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proyecto_usuarios_proyecto_id_fkey"
            columns: ["proyecto_id"]
            isOneToOne: false
            referencedRelation: "proyectos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proyecto_usuarios_proyecto_id_fkey"
            columns: ["proyecto_id"]
            isOneToOne: false
            referencedRelation: "vw_proyecto_resumen"
            referencedColumns: ["proyecto_id"]
          },
          {
            foreignKeyName: "proyecto_usuarios_proyecto_id_fkey"
            columns: ["proyecto_id"]
            isOneToOne: false
            referencedRelation: "vw_proyectos_finanzas"
            referencedColumns: ["proyecto_id"]
          },
          {
            foreignKeyName: "proyecto_usuarios_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      proyectos: {
        Row: {
          ciudad: string | null
          cliente_contacto: string | null
          cliente_telefono: string | null
          codigo: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          descripcion: string | null
          empresa_id: string
          es_interno: boolean
          estado: Database["public"]["Enums"]["proyecto_estado"]
          etiqueta_eje_y: string | null
          fecha_fin_proyectada: string | null
          fecha_fin_real: string | null
          fecha_inicio: string | null
          id: string
          meta_total_cantidad: number | null
          nombre: string
          notas: string | null
          permite_sobregiro: boolean
          presupuesto_fijado: number | null
          presupuesto_total: number | null
          subempresa_id: string
          ubicacion: string | null
          unidad_medida: string
          updated_at: string
        }
        Insert: {
          ciudad?: string | null
          cliente_contacto?: string | null
          cliente_telefono?: string | null
          codigo: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          descripcion?: string | null
          empresa_id: string
          es_interno?: boolean
          estado?: Database["public"]["Enums"]["proyecto_estado"]
          etiqueta_eje_y?: string | null
          fecha_fin_proyectada?: string | null
          fecha_fin_real?: string | null
          fecha_inicio?: string | null
          id?: string
          meta_total_cantidad?: number | null
          nombre: string
          notas?: string | null
          permite_sobregiro?: boolean
          presupuesto_fijado?: number | null
          presupuesto_total?: number | null
          subempresa_id: string
          ubicacion?: string | null
          unidad_medida?: string
          updated_at?: string
        }
        Update: {
          ciudad?: string | null
          cliente_contacto?: string | null
          cliente_telefono?: string | null
          codigo?: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          descripcion?: string | null
          empresa_id?: string
          es_interno?: boolean
          estado?: Database["public"]["Enums"]["proyecto_estado"]
          etiqueta_eje_y?: string | null
          fecha_fin_proyectada?: string | null
          fecha_fin_real?: string | null
          fecha_inicio?: string | null
          id?: string
          meta_total_cantidad?: number | null
          nombre?: string
          notas?: string | null
          permite_sobregiro?: boolean
          presupuesto_fijado?: number | null
          presupuesto_total?: number | null
          subempresa_id?: string
          ubicacion?: string | null
          unidad_medida?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "proyectos_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proyectos_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proyectos_subempresa_id_fkey"
            columns: ["subempresa_id"]
            isOneToOne: false
            referencedRelation: "subempresas"
            referencedColumns: ["id"]
          },
        ]
      }
      rubros: {
        Row: {
          activo: boolean
          categoria: Database["public"]["Enums"]["categoria_flujo"]
          codigo: string | null
          created_at: string
          descripcion: string | null
          id: string
          monto_maximo: number
          nombre: string
          orden: number
          proyecto_id: string
          updated_at: string
        }
        Insert: {
          activo?: boolean
          categoria?: Database["public"]["Enums"]["categoria_flujo"]
          codigo?: string | null
          created_at?: string
          descripcion?: string | null
          id?: string
          monto_maximo: number
          nombre: string
          orden?: number
          proyecto_id: string
          updated_at?: string
        }
        Update: {
          activo?: boolean
          categoria?: Database["public"]["Enums"]["categoria_flujo"]
          codigo?: string | null
          created_at?: string
          descripcion?: string | null
          id?: string
          monto_maximo?: number
          nombre?: string
          orden?: number
          proyecto_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "rubros_proyecto_id_fkey"
            columns: ["proyecto_id"]
            isOneToOne: false
            referencedRelation: "proyectos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rubros_proyecto_id_fkey"
            columns: ["proyecto_id"]
            isOneToOne: false
            referencedRelation: "vw_proyecto_resumen"
            referencedColumns: ["proyecto_id"]
          },
          {
            foreignKeyName: "rubros_proyecto_id_fkey"
            columns: ["proyecto_id"]
            isOneToOne: false
            referencedRelation: "vw_proyectos_finanzas"
            referencedColumns: ["proyecto_id"]
          },
        ]
      }
      subempresas: {
        Row: {
          activa: boolean
          created_at: string
          deleted_at: string | null
          descripcion: string | null
          empresa_id: string
          id: string
          nit: string | null
          nombre: string
          updated_at: string
        }
        Insert: {
          activa?: boolean
          created_at?: string
          deleted_at?: string | null
          descripcion?: string | null
          empresa_id: string
          id?: string
          nit?: string | null
          nombre: string
          updated_at?: string
        }
        Update: {
          activa?: boolean
          created_at?: string
          deleted_at?: string | null
          descripcion?: string | null
          empresa_id?: string
          id?: string
          nit?: string | null
          nombre?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "subempresas_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      usuarios: {
        Row: {
          activo: boolean
          avatar_path: string | null
          cargo: string | null
          cedula: string | null
          created_at: string
          email: string
          empresa_id: string | null
          id: string
          nombre: string
          rol: Database["public"]["Enums"]["user_role"]
          subempresa_id: string | null
          telefono: string | null
          ultimo_login: string | null
          updated_at: string
        }
        Insert: {
          activo?: boolean
          avatar_path?: string | null
          cargo?: string | null
          cedula?: string | null
          created_at?: string
          email: string
          empresa_id?: string | null
          id: string
          nombre: string
          rol: Database["public"]["Enums"]["user_role"]
          subempresa_id?: string | null
          telefono?: string | null
          ultimo_login?: string | null
          updated_at?: string
        }
        Update: {
          activo?: boolean
          avatar_path?: string | null
          cargo?: string | null
          cedula?: string | null
          created_at?: string
          email?: string
          empresa_id?: string | null
          id?: string
          nombre?: string
          rol?: Database["public"]["Enums"]["user_role"]
          subempresa_id?: string | null
          telefono?: string | null
          ultimo_login?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "usuarios_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "usuarios_subempresa_id_fkey"
            columns: ["subempresa_id"]
            isOneToOne: false
            referencedRelation: "subempresas"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      vw_flujo_caja_quincenal: {
        Row: {
          categoria: Database["public"]["Enums"]["categoria_flujo"] | null
          proyecto_id: string | null
          quincena: string | null
          rubro_codigo: string | null
          rubro_id: string | null
          rubro_nombre: string | null
          total_periodo: number | null
        }
        Relationships: [
          {
            foreignKeyName: "rubros_proyecto_id_fkey"
            columns: ["proyecto_id"]
            isOneToOne: false
            referencedRelation: "proyectos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rubros_proyecto_id_fkey"
            columns: ["proyecto_id"]
            isOneToOne: false
            referencedRelation: "vw_proyecto_resumen"
            referencedColumns: ["proyecto_id"]
          },
          {
            foreignKeyName: "rubros_proyecto_id_fkey"
            columns: ["proyecto_id"]
            isOneToOne: false
            referencedRelation: "vw_proyectos_finanzas"
            referencedColumns: ["proyecto_id"]
          },
        ]
      }
      vw_proyecto_resumen: {
        Row: {
          avance_fecha: string | null
          avance_proyectado: number | null
          avance_real: number | null
          empresa_id: string | null
          estado: Database["public"]["Enums"]["proyecto_estado"] | null
          fecha_fin_proyectada: string | null
          fecha_inicio: string | null
          incidentes_30d: number | null
          nombre: string | null
          porcentaje_ejecutado: number | null
          presupuesto_comprometido: number | null
          presupuesto_ejecutado: number | null
          presupuesto_total: number | null
          proyecto_id: string | null
          subempresa_id: string | null
          ultima_observacion_at: string | null
          unidad_medida: string | null
        }
        Relationships: [
          {
            foreignKeyName: "proyectos_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proyectos_subempresa_id_fkey"
            columns: ["subempresa_id"]
            isOneToOne: false
            referencedRelation: "subempresas"
            referencedColumns: ["id"]
          },
        ]
      }
      vw_proyectos_finanzas: {
        Row: {
          empresa_id: string | null
          es_interno: boolean | null
          estado: Database["public"]["Enums"]["proyecto_estado"] | null
          permite_sobregiro: boolean | null
          porcentaje_ejecutado: number | null
          presupuesto_comprometido: number | null
          presupuesto_disponible: number | null
          presupuesto_ejecutado: number | null
          presupuesto_fijado: number | null
          presupuesto_total: number | null
          proyecto_id: string | null
          proyecto_nombre: string | null
        }
        Relationships: [
          {
            foreignKeyName: "proyectos_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      vw_rubro_balance: {
        Row: {
          categoria: Database["public"]["Enums"]["categoria_flujo"] | null
          codigo: string | null
          comprometido: number | null
          disponible: number | null
          ejecutado: number | null
          monto_maximo: number | null
          nombre: string | null
          porcentaje_ejecutado: number | null
          proyecto_id: string | null
          rubro_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "rubros_proyecto_id_fkey"
            columns: ["proyecto_id"]
            isOneToOne: false
            referencedRelation: "proyectos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rubros_proyecto_id_fkey"
            columns: ["proyecto_id"]
            isOneToOne: false
            referencedRelation: "vw_proyecto_resumen"
            referencedColumns: ["proyecto_id"]
          },
          {
            foreignKeyName: "rubros_proyecto_id_fkey"
            columns: ["proyecto_id"]
            isOneToOne: false
            referencedRelation: "vw_proyectos_finanzas"
            referencedColumns: ["proyecto_id"]
          },
        ]
      }
    }
    Functions: {
      ajustar_techo_rubro: {
        Args: {
          p_justificacion: string
          p_nuevo_monto: number
          p_rubro_id: string
        }
        Returns: string
      }
      aprobar_movimiento: {
        Args: { p_movimiento_id: string }
        Returns: undefined
      }
      auth_empresa_id: { Args: never; Returns: string }
      auth_es_admin_o_superior: { Args: never; Returns: boolean }
      auth_es_super_admin: { Args: never; Returns: boolean }
      auth_puede_ver_proyecto: {
        Args: { p_proyecto_id: string }
        Returns: boolean
      }
      auth_rol: {
        Args: never
        Returns: Database["public"]["Enums"]["user_role"]
      }
      auth_subempresa_id: { Args: never; Returns: string }
      auth_tiene_acceso_empresa: {
        Args: { p_empresa_id: string }
        Returns: boolean
      }
      auth_tiene_acceso_proyecto: {
        Args: {
          p_empresa_id?: string
          p_proyecto_id: string
          p_subempresa_id?: string
        }
        Returns: boolean
      }
      auth_tiene_acceso_subempresa: {
        Args: { p_empresa_id: string; p_subempresa_id: string }
        Returns: boolean
      }
      cerrar_formulario_sst: {
        Args: { p_formulario_id: string }
        Returns: undefined
      }
      crear_cxc_con_cuotas: {
        Args: {
          p_cliente_nit: string
          p_cliente_nombre: string
          p_fecha_emision: string
          p_fecha_primera_cuota: string
          p_monto_total: number
          p_notas?: string
          p_numero_cuotas: number
          p_numero_factura: string
          p_periodicidad: Database["public"]["Enums"]["cuota_periodicidad"]
          p_proyecto_id: string
          p_rubro_id: string
        }
        Returns: string
      }
      custom_access_token_hook: { Args: { event: Json }; Returns: Json }
      ejecutar_movimiento: {
        Args: { p_movimiento_id: string }
        Returns: undefined
      }
      path_empresa_id: { Args: { obj_path: string }; Returns: string }
      path_subempresa_id: { Args: { obj_path: string }; Returns: string }
      rechazar_movimiento: {
        Args: { p_movimiento_id: string }
        Returns: undefined
      }
      registrar_avance_proyecto: {
        Args: {
          p_avance_proyectado: number
          p_avance_real: number
          p_fecha: string
          p_notas?: string
          p_proyecto_id: string
        }
        Returns: string
      }
      registrar_cobro_cuota_cxc: {
        Args: { p_cuota_id: string; p_fecha?: string; p_monto: number }
        Returns: string
      }
      registrar_cobro_cxc: {
        Args: { p_cxc_id: string; p_fecha?: string; p_monto: number }
        Returns: string
      }
      registrar_pago_cxp: {
        Args: { p_cxp_id: string; p_fecha?: string; p_monto: number }
        Returns: string
      }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
      solicitar_movimiento_rubro: {
        Args: {
          p_justificacion: string
          p_monto: number
          p_proyecto_id: string
          p_rubro_destino_id: string
          p_rubro_origen_id?: string
          p_tipo: Database["public"]["Enums"]["movimiento_tipo"]
        }
        Returns: string
      }
    }
    Enums: {
      ausentismo_tipo:
        | "medico"
        | "personal"
        | "incapacidad"
        | "vacaciones"
        | "otro"
      categoria_flujo:
        | "costos_operativos"
        | "gastos_administrativos"
        | "gastos_financieros"
        | "ingresos"
      chequeo_resultado: "si" | "no" | "na"
      cuota_periodicidad: "quincenal" | "mensual"
      documento_empleado_tipo:
        | "cedula"
        | "arl"
        | "eps"
        | "certificacion_altura"
        | "certificacion_caliente"
        | "examen_medico"
        | "otro"
      factura_estado: "pendiente" | "parcial" | "pagada" | "vencida" | "anulada"
      firma_momento: "inicio" | "fin"
      formulario_estado: "borrador" | "completado" | "firmado" | "archivado"
      formulario_tipo: "ats" | "permiso_altura" | "permiso_caliente"
      incidente_severidad: "leve" | "moderado" | "grave" | "critico"
      incidente_tipo: "incidente" | "accidente" | "casi_accidente"
      movimiento_estado: "solicitado" | "aprobado" | "rechazado" | "ejecutado"
      movimiento_tipo: "gasto" | "traslado_entre_rubros" | "ajuste"
      proyecto_estado:
        | "planificacion"
        | "en_curso"
        | "pausado"
        | "completado"
        | "cancelado"
      riesgo_decision: "proceder" | "detener"
      user_role:
        | "super_admin"
        | "admin"
        | "cliente_principal"
        | "subcliente"
        | "sst"
        | "operativo"
        | "financiero"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      ausentismo_tipo: [
        "medico",
        "personal",
        "incapacidad",
        "vacaciones",
        "otro",
      ],
      categoria_flujo: [
        "costos_operativos",
        "gastos_administrativos",
        "gastos_financieros",
        "ingresos",
      ],
      chequeo_resultado: ["si", "no", "na"],
      cuota_periodicidad: ["quincenal", "mensual"],
      documento_empleado_tipo: [
        "cedula",
        "arl",
        "eps",
        "certificacion_altura",
        "certificacion_caliente",
        "examen_medico",
        "otro",
      ],
      factura_estado: ["pendiente", "parcial", "pagada", "vencida", "anulada"],
      firma_momento: ["inicio", "fin"],
      formulario_estado: ["borrador", "completado", "firmado", "archivado"],
      formulario_tipo: ["ats", "permiso_altura", "permiso_caliente"],
      incidente_severidad: ["leve", "moderado", "grave", "critico"],
      incidente_tipo: ["incidente", "accidente", "casi_accidente"],
      movimiento_estado: ["solicitado", "aprobado", "rechazado", "ejecutado"],
      movimiento_tipo: ["gasto", "traslado_entre_rubros", "ajuste"],
      proyecto_estado: [
        "planificacion",
        "en_curso",
        "pausado",
        "completado",
        "cancelado",
      ],
      riesgo_decision: ["proceder", "detener"],
      user_role: [
        "super_admin",
        "admin",
        "cliente_principal",
        "subcliente",
        "sst",
        "operativo",
        "financiero",
      ],
    },
  },
} as const

// ─── Convenience aliases ──────────────────────────────────────────────────────
export type TypedSupabaseClient = import('@supabase/supabase-js').SupabaseClient<Database, any, any>;

export type UserRole = Enums<'user_role'>;
export type ProyectoEstado = Enums<'proyecto_estado'>;
export type FormularioEstado = Enums<'formulario_estado'>;
export type FormularioTipo = Enums<'formulario_tipo'>;
export type IncidenteTipo = Enums<'incidente_tipo'>;
export type IncidenteSeveridad = Enums<'incidente_severidad'>;
export type MovimientoEstado = Enums<'movimiento_estado'>;
export type MovimientoTipo = Enums<'movimiento_tipo'>;
export type CategoriaFlujo = Enums<'categoria_flujo'>;
export type FacturaEstado = Enums<'factura_estado'>;
export type DocumentoEmpleadoTipo = Enums<'documento_empleado_tipo'>;
export type AusentismoTipo = Enums<'ausentismo_tipo'>;
export type CuotaPeriodicidad = Enums<'cuota_periodicidad'>;
