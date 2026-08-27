import { Badge } from "@/components/ui/badge";
import { UnidadFormDialog } from "@/components/inventario/unidad-form-dialog";
import { AsignarHerramientaDialog } from "@/components/inventario/asignar-herramienta-dialog";
import { DevolverHerramientaDialog } from "@/components/inventario/devolver-herramienta-dialog";
import { HistorialUnidad } from "@/components/inventario/historial-unidad";
import { CambiarEstadoUnidad } from "@/components/inventario/cambiar-estado-unidad";
import { EliminarUnidadButton } from "@/components/inventario/eliminar-unidad-button";
import { ESTADO_HERRAMIENTA_LABEL, ESTADO_HERRAMIENTA_VARIANT } from "@/constants/inventario";
import { formatCOP } from "@/lib/format";
import type { UnidadConMovimientoAbierto, MovimientoConRelaciones, ProyectoConEmpresa } from "@/lib/data/inventario";

export function UnidadesTable({
  unidades,
  movimientosPorUnidad,
  proyectos,
  puedeEscribir,
}: {
  unidades: UnidadConMovimientoAbierto[];
  movimientosPorUnidad: Record<string, MovimientoConRelaciones[]>;
  proyectos: ProyectoConEmpresa[];
  puedeEscribir: boolean;
}) {
  if (unidades.length === 0) {
    return (
      <p className="rounded-actium border border-dashed border-[--border-subtle] p-8 text-center text-sm text-[--text-secondary]">
        Este tipo aún no tiene unidades registradas. Crea la primera.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {unidades.map((u) => {
        const movimientos = movimientosPorUnidad[u.id] ?? [];
        return (
          <div key={u.id} className="rounded-actium border border-[--border-subtle] bg-[--bg-elevated] p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-sans text-sm font-semibold text-[--text-primary]">{u.codigo}</p>
                {u.serial ? <p className="text-xs text-[--text-secondary]">Serial: {u.serial}</p> : null}
                <div className="mt-1.5 flex flex-wrap items-center gap-2">
                  <Badge variant={ESTADO_HERRAMIENTA_VARIANT[u.estado]}>{ESTADO_HERRAMIENTA_LABEL[u.estado]}</Badge>
                  {u.estado === "asignada" && u.proyectos ? (
                    <span className="text-xs text-[--text-secondary]">en {u.proyectos.nombre}</span>
                  ) : null}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <HistorialUnidad unidadCodigo={u.codigo} movimientos={movimientos} />
                {puedeEscribir ? (
                  <>
                    {u.estado === "disponible" ? (
                      <AsignarHerramientaDialog unidadId={u.id} unidadCodigo={u.codigo} proyectos={proyectos} />
                    ) : null}
                    {u.estado === "asignada" ? (
                      <DevolverHerramientaDialog
                        unidadId={u.id}
                        unidadCodigo={u.codigo}
                        proyectoNombre={u.proyectos?.nombre}
                      />
                    ) : (
                      <CambiarEstadoUnidad unidadId={u.id} estadoActual={u.estado} />
                    )}
                    <UnidadFormDialog modo="editar" catalogoId={u.catalogo_id} unidad={u} />
                    {u.estado !== "asignada" ? (
                      <EliminarUnidadButton unidadId={u.id} unidadCodigo={u.codigo} />
                    ) : null}
                  </>
                ) : null}
              </div>
            </div>

            {(u.notas || u.costo_adquisicion != null) ? (
              <p className="mt-2 text-xs text-[--text-secondary]">
                {u.costo_adquisicion != null ? `Costo: ${formatCOP(u.costo_adquisicion)}` : ""}
                {u.notas && u.costo_adquisicion != null ? " · " : ""}
                {u.notas ?? ""}
              </p>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
