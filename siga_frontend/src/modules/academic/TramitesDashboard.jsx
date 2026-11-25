import { useState, useEffect } from 'react';
import { apiClient } from '../../core/api/client';
import { Plus, Eye, FileText, Repeat, GraduationCap, X } from 'lucide-react';
import { ConvalidacionesTab } from './ConvalidacionesTab';
import { BecasTab } from './BecasTab';

const TIPOS_TRAMITE = [
  'Constancia de Estudios',
  'Constancia de Egreso',
  'Certificado Oficial de Estudios',
  'Reserva de Matrícula (Licencia)',
  'Rectificación de Nota (Auditoría)',
  'Retiro Excepcional',
];

export function TramitesDashboard() {
  const [activeTab, setActiveTab] = useState('solicitudes');
  const [loading, setLoading] = useState(false);
  
  // States for Solicitudes (TUPA)
  const [solicitudes, setSolicitudes] = useState([]);
  const [estudiantes, setEstudiantes] = useState([]);
  
  const [error, setError] = useState('');

  // Modal state
  const [showTramiteModal, setShowTramiteModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [tramiteForm, setTramiteForm] = useState({
    estudiante_id: '',
    tipo_tramite: TIPOS_TRAMITE[0],
    observaciones: '',
  });

  const fetchSolicitudes = async () => {
    setLoading(true);
    setError('');
    try {
      const [tramites, ests] = await Promise.all([
        apiClient.request('/api/mod-gestion-academica/tramites/'),
        apiClient.request('/api/mod-gestion-academica/estudiantes/').catch(() => []),
      ]);
      const nombres = new Map((ests || []).map(e => [e.id, `${e.apellidos}, ${e.nombres}`]));
      setSolicitudes((tramites || []).map(t => ({ ...t, nombre_alumno: nombres.get(t.estudiante_id) })));
      setEstudiantes(ests || []);
    } catch (err) {
      console.error(err);
      setError('No se pudieron cargar los trámites.');
      setSolicitudes([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'solicitudes') {
      fetchSolicitudes();
    }
  }, [activeTab]);

  const handleEstadoChange = async (id, newEstado) => {
    const anterior = solicitudes;
    setSolicitudes(prev => prev.map(s => s.id === id ? { ...s, estado: newEstado } : s));
    try {
      await apiClient.request(`/api/mod-gestion-academica/tramites/${id}/estado?estado=${newEstado}`, { method: 'PUT' });
    } catch (err) {
      console.error(err);
      setSolicitudes(anterior);
      setError('No se pudo actualizar el estado del trámite.');
    }
  };

  const handleCreateTramite = async (e) => {
    e.preventDefault();
    if (!tramiteForm.estudiante_id) return setError('Seleccione un estudiante.');
    setSaving(true);
    setError('');
    try {
      await apiClient.request('/api/mod-gestion-academica/tramites/', {
        method: 'POST',
        body: JSON.stringify({
          estudiante_id: parseInt(tramiteForm.estudiante_id),
          tipo_tramite: tramiteForm.tipo_tramite,
          observaciones: tramiteForm.observaciones,
        }),
      });
      setShowTramiteModal(false);
      setTramiteForm({ estudiante_id: '', tipo_tramite: TIPOS_TRAMITE[0], observaciones: '' });
      fetchSolicitudes();
    } catch (err) {
      console.error(err);
      setError('No se pudo registrar la solicitud.');
    } finally {
      setSaving(false);
    }
  };

  const renderTabHeader = (id, label, icon) => (
    <button
      onClick={() => setActiveTab(id)}
      className={`px-5 py-3 rounded-t-xl font-bold transition-colors flex items-center space-x-2 ${
        activeTab === id 
          ? 'bg-white text-primary border-t-2 border-primary shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] z-10 relative' 
          : 'bg-slate-100 text-slate-500 hover:bg-slate-200 border-b border-slate-300'
      }`}
    >
      <span>{icon}</span>
      <span>{label}</span>
    </button>
  );

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
        <div>
          <h3 className="text-3xl font-bold tracking-tight text-slate-text">
            Gestión de <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-500 to-orange-500">Trámites y Casuísticas</span>
          </h3>
          <p className="text-slate-500 text-sm mt-1">Administración TUPA, Convalidaciones, Becas y Resoluciones</p>
        </div>
      </div>

      <div className="w-full">
        <div className="flex border-b-0 space-x-1">
          {renderTabHeader('solicitudes', 'Trámites y Solicitudes', <FileText size={16} />)}
          {renderTabHeader('convalidaciones', 'Convalidaciones', <Repeat size={16} />)}
          {renderTabHeader('becas', 'Becas y Beneficios', <GraduationCap size={16} />)}
        </div>

        <div className="glass-card rounded-tl-none p-6 min-h-[500px]">
          {activeTab === 'solicitudes' && (
            <div className="space-y-6 animate-fade-in">
              <div className="flex justify-between items-center mb-4">
                <h4 className="text-lg font-bold text-slate-700">Solicitudes Ingresadas</h4>
                <button
                  onClick={() => setShowTramiteModal(true)}
                  className="btn-primary py-1.5 px-4 text-sm rounded-lg flex items-center gap-1.5"
                >
                  <Plus size={16} /> Nueva Solicitud Manual
                </button>
              </div>
              
              {error && <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</div>}
              {loading ? (
                <div className="text-center py-10"><div className="w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto"></div></div>
              ) : (
                <table className="w-full text-left text-sm border-collapse">
                  <thead className="bg-slate-50/80 border-y border-slate-200">
                    <tr>
                      <th className="py-3 px-4 font-bold text-slate-600">ID / Fecha</th>
                      <th className="py-3 px-4 font-bold text-slate-600">Estudiante</th>
                      <th className="py-3 px-4 font-bold text-slate-600">Tipo de Trámite</th>
                      <th className="py-3 px-4 font-bold text-slate-600">Estado</th>
                      <th className="py-3 px-4 font-bold text-slate-600 text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {solicitudes.length === 0 && (
                      <tr><td colSpan={5} className="py-10 text-center text-slate-400">No hay solicitudes registradas.</td></tr>
                    )}
                    {solicitudes.map(s => (
                      <tr key={s.id} className="hover:bg-primary/5 transition-colors">
                        <td className="py-3 px-4">
                          <span className="font-semibold text-slate-700">#{s.id}</span>
                          <div className="text-xs text-slate-500">{s.fecha_solicitud}</div>
                        </td>
                        <td className="py-3 px-4 font-semibold text-slate-700">{s.nombre_alumno || `Estudiante #${s.estudiante_id}`}</td>
                        <td className="py-3 px-4 font-medium text-slate-600">{s.tipo_tramite}</td>
                        <td className="py-3 px-4">
                          <span className={`badge ${
                            s.estado === 'pendiente' ? 'badge-amber' :
                            s.estado === 'en_proceso' ? 'badge-blue' :
                            s.estado === 'emitido' ? 'badge-green' :
                            'badge-slate'
                          }`}>
                            {s.estado.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <select 
                            className="input-field text-xs mr-2 py-1.5"
                            value={s.estado}
                            onChange={(e) => handleEstadoChange(s.id, e.target.value)}
                          >
                            <option value="pendiente">Pendiente</option>
                            <option value="en_proceso">En Proceso</option>
                            <option value="emitido">Emitido / Aprobado</option>
                            <option value="rechazado">Rechazado</option>
                          </select>
                          <button className="btn-icon text-slate-400 hover:text-amber-600" title="Ver Detalles">
                            <Eye size={18} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {activeTab === 'convalidaciones' && <ConvalidacionesTab />}

          {activeTab === 'becas' && <BecasTab />}
        </div>
      </div>

      {/* MODAL: NUEVA SOLICITUD TUPA */}
      {showTramiteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xl w-full max-w-lg overflow-hidden">
            <div className="flex justify-between items-center px-6 py-4 border-b border-slate-100">
              <h5 className="font-bold text-sm text-slate-900">Nueva Solicitud / Trámite TUPA</h5>
              <button
                onClick={() => setShowTramiteModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateTramite} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">Seleccionar Estudiante</label>
                <select
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                  value={tramiteForm.estudiante_id}
                  onChange={e => setTramiteForm({ ...tramiteForm, estudiante_id: e.target.value })}
                  required
                >
                  <option value="">-- Seleccionar Alumno --</option>
                  {estudiantes.map(e => (
                    <option key={e.id} value={e.id}>
                      {e.apellidos}, {e.nombres} - DNI: {e.dni}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">Tipo de Trámite</label>
                <select
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                  value={tramiteForm.tipo_tramite}
                  onChange={e => setTramiteForm({ ...tramiteForm, tipo_tramite: e.target.value })}
                >
                  {TIPOS_TRAMITE.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">Observaciones / Número de FUT</label>
                <textarea
                  rows="3"
                  className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                  value={tramiteForm.observaciones}
                  onChange={e => setTramiteForm({ ...tramiteForm, observaciones: e.target.value })}
                  placeholder="Número de expediente o sustento..."
                />
              </div>

              <div className="flex gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowTramiteModal(false)}
                  className="flex-1 py-2 px-4 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold shadow-sm transition-all"
                  disabled={saving}
                >
                  {saving ? 'Registrando...' : 'Registrar Solicitud'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
