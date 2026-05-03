import React, { useState, useEffect } from 'react';
import { useData } from '../../store/DataContext';
import { 
  Calculator, Trophy, Clock, Settings2, Warehouse, Target, 
  Flag, Shield, Star, Plus, Trash2, ChevronRight, ChevronDown
} from 'lucide-react';

type PlayFormat = 'liga' | 'eliminatoria' | 'grupos_playoffs';

interface DivisionNode {
  id: string;
  name: string;
  teams: number;
  format: PlayFormat;
  laps: number;
  matches: number;
  hoursPerMatch: number;
  groupSize?: number;
  playoffSeries?: number; // 1 for Oro, 2 for Oro and Plata
}

interface CategoryNode {
  id: string;
  name: string;
  divisions: DivisionNode[];
}

interface CompetitionNode {
  id: string;
  name: string;
  iconType: 'trophy' | 'target' | 'flag' | 'shield' | 'star';
  categories: CategoryNode[];
  venueDistributions: Record<string, number>; // key: venue_name, value: hours assigned
}

const DEFAULT_COMPETITIONS: CompetitionNode[] = [
  { 
    id: 'apertura', 
    name: 'Torneo Apertura', 
    iconType: 'flag',
    categories: [
      {
        id: 'cat-ap-1',
        name: 'Senior Masculino',
        divisions: [
          { id: 'div-ap-1-1', name: '1ª División', teams: 10, format: 'liga', laps: 1, matches: 45, hoursPerMatch: 1 }
        ]
      }
    ],
    venueDistributions: {}
  },
  { 
    id: 'clausura', 
    name: 'Torneo Clausura', 
    iconType: 'flag',
    categories: [
      {
        id: 'cat-cl-1',
        name: 'Senior Masculino',
        divisions: [
          { id: 'div-cl-1-1', name: '1ª División', teams: 10, format: 'liga', laps: 1, matches: 45, hoursPerMatch: 1 }
        ]
      }
    ],
    venueDistributions: {}
  },
  { 
    id: 'copa', 
    name: 'Copa', 
    iconType: 'trophy',
    categories: [
      {
        id: 'cat-co-1',
        name: 'Open',
        divisions: [
          { id: 'div-co-1-1', name: 'Fase Final', teams: 8, format: 'eliminatoria', laps: 1, matches: 7, hoursPerMatch: 1 }
        ]
      }
    ],
    venueDistributions: {}
  },
  { 
    id: 'summer', 
    name: 'NovaSports Summer Cup', 
    iconType: 'star',
    categories: [
      {
        id: 'cat-su-1',
        name: 'Open',
        divisions: [
          { id: 'div-su-1-1', name: 'Grupo A', teams: 8, format: 'liga', laps: 1, matches: 28, hoursPerMatch: 1 }
        ]
      }
    ],
    venueDistributions: {}
  },
];

const ICONS = {
  trophy: Trophy,
  target: Target,
  flag: Flag,
  shield: Shield,
  star: Star
};

export default function AdminUtilities() {
  const { economicSettings } = useData();

  const [competitions, setCompetitions] = useState<CompetitionNode[]>(() => {
    const saved = localStorage.getItem('utilidades_competitions');
    return saved ? JSON.parse(saved) : DEFAULT_COMPETITIONS;
  });

  const [expandedComps, setExpandedComps] = useState<Record<string, boolean>>({});
  const [expandedCats, setExpandedCats] = useState<Record<string, boolean>>({});
  const [expandedVenues, setExpandedVenues] = useState<Record<string, boolean>>({});

  const [cloneSourceId, setCloneSourceId] = useState<string>('');
  const [competitionToDelete, setCompetitionToDelete] = useState<string | null>(null);

  useEffect(() => {
    localStorage.setItem('utilidades_competitions', JSON.stringify(competitions));
  }, [competitions]);

  const refereeCost = economicSettings?.referee_payment_standard || 25;
  const venues = economicSettings?.venue_costs || [];

  const toggleComp = (id: string) => setExpandedComps(p => ({ ...p, [id]: !p[id] }));
  const toggleCat = (id: string) => setExpandedCats(p => ({ ...p, [id]: !p[id] }));
  const toggleVenues = (id: string) => setExpandedVenues(p => ({ ...p, [id]: !p[id] }));

  const generateId = () => Math.random().toString(36).substr(2, 9);
  
  const getRoundName = (teams: number) => {
      if (teams === 32) return 'Dieciseisavos';
      if (teams === 16) return 'Octavos';
      if (teams === 8) return 'Cuartos';
      if (teams === 4) return 'Semifinales';
      if (teams === 2) return 'Final';
      return `${teams}avos`;
  };

  const getGruposPlayoffExplanation = (totalTeams: number, groupSize: number, series: number) => {
      if (!totalTeams || totalTeams < 4) return "Se requieren al menos 4 equipos para este formato.";
      const numGroups = Math.ceil(totalTeams / groupSize);
      
      let targetOro = 2;
      while (targetOro * 2 <= totalTeams) targetOro *= 2;
      
      let exactAdvance = Math.floor(targetOro / numGroups);
      let remainingToAdvance = targetOro - (exactAdvance * numGroups);
      
      let targetPlata = totalTeams - targetOro;
      let powerPlata = 2;
      if (targetPlata >= 2) {
         while (powerPlata * 2 <= targetPlata) powerPlata *= 2;
      } else {
         powerPlata = 0;
      }
      
      let exp = `Se formarán ${numGroups} grupos de aprox. ${groupSize} equipos. A Fase Oro clasifican ${targetOro} equipos `;
      
      if (exactAdvance > 0) {
        exp += `(${exactAdvance} mejores de cada grupo`;
        if (remainingToAdvance > 0) {
            exp += ` + los ${remainingToAdvance} mejores ${exactAdvance + 1}ºs`;
        }
        exp += ') ';
      }
      
      exp += `para jugar desde ${getRoundName(targetOro)}.`;
      
      if (series === 2 && targetPlata > 0) {
          exp += ` Serie Plata: Los ${targetPlata} equipos restantes van a consolación${powerPlata > 0 ? `, jugando un cuadro de ${powerPlata} equipos desde ${getRoundName(powerPlata)}.` : '.'}`;
      }
      return exp;
  };

  const addCompetition = () => {
    if (cloneSourceId) {
      const source = competitions.find(c => c.id === cloneSourceId);
      if (source) {
        const newId = generateId();
        const cloned = JSON.parse(JSON.stringify(source)) as CompetitionNode;
        cloned.id = newId;
        cloned.name = `${cloned.name} (Copia)`;
        cloned.categories = cloned.categories.map(cat => ({
          ...cat,
          id: generateId(),
          divisions: cat.divisions.map(div => ({
            ...div,
            id: generateId()
          }))
        }));
        setCompetitions(prev => [...prev, cloned]);
        setExpandedComps(p => ({ ...p, [newId]: true }));
        setCloneSourceId(''); // reset
        return;
      }
    }
    setCompetitions(prev => [...prev, {
      id: generateId(),
      name: 'Nueva Competición',
      iconType: 'trophy',
      categories: [],
      venueDistributions: {}
    }]);
  };

  const removeCompetition = (compId: string) => {
    setCompetitions(prev => prev.filter(c => c.id !== compId));
    setCompetitionToDelete(null);
  };

  const duplicateCompetition = (comp: CompetitionNode) => {
    const newId = generateId();
    const cloned = JSON.parse(JSON.stringify(comp)) as CompetitionNode;
    cloned.id = newId;
    cloned.name = `${cloned.name} (Copia)`;
    
    cloned.categories = cloned.categories.map(cat => ({
      ...cat,
      id: generateId(),
      divisions: cat.divisions.map(div => ({
        ...div,
        id: generateId()
      }))
    }));

    setCompetitions(prev => [...prev, cloned]);
    setExpandedComps(p => ({ ...p, [newId]: true }));
  };

  const addCategory = (compId: string) => {
    setCompetitions(prev => prev.map(c => {
      if (c.id === compId) {
        return {
          ...c,
          categories: [...c.categories, { id: generateId(), name: 'Nueva Categoría', divisions: [] }]
        };
      }
      return c;
    }));
  };

  const removeCategory = (compId: string, catId: string) => {
    setCompetitions(prev => prev.map(c => {
      if (c.id === compId) {
        return { ...c, categories: c.categories.filter(cat => cat.id !== catId) };
      }
      return c;
    }));
  };

  const addDivision = (compId: string, catId: string) => {
    setCompetitions(prev => prev.map(c => {
      if (c.id === compId) {
        return {
          ...c,
          categories: c.categories.map(cat => {
            if (cat.id === catId) {
              return {
                ...cat,
                divisions: [...cat.divisions, {
                  id: generateId(), name: 'Subgrupo / División', teams: 4, format: 'liga', laps: 1, matches: 6, hoursPerMatch: 1
                }]
              };
            }
            return cat;
          })
        };
      }
      return c;
    }));
  };

  const removeDivision = (compId: string, catId: string, divId: string) => {
    setCompetitions(prev => prev.map(c => {
      if (c.id === compId) {
        return {
          ...c,
          categories: c.categories.map(cat => {
            if (cat.id === catId) {
              return { ...cat, divisions: cat.divisions.filter(d => d.id !== divId) };
            }
            return cat;
          })
        };
      }
      return c;
    }));
  };

  const updateCompetitionField = (compId: string, field: keyof CompetitionNode, value: any) => {
    setCompetitions(prev => prev.map(c => c.id === compId ? { ...c, [field]: value } : c));
  };

  const updateCategoryField = (compId: string, catId: string, name: string) => {
    setCompetitions(prev => prev.map(c => c.id === compId ? {
      ...c, categories: c.categories.map(cat => cat.id === catId ? { ...cat, name } : cat)
    } : c));
  };

  const updateDivisionField = (compId: string, catId: string, divId: string, field: keyof DivisionNode, value: any) => {
    setCompetitions(prev => prev.map(c => c.id === compId ? {
      ...c,
      categories: c.categories.map(cat => cat.id === catId ? {
        ...cat,
        divisions: cat.divisions.map(div => {
          if (div.id !== divId) return div;
          const updated = { ...div, [field]: value };
          
          if (field === 'teams' || field === 'format' || field === 'laps' || field === 'groupSize' || field === 'playoffSeries') {
            const N = parseInt(updated.teams.toString()) || 0;
            const L = parseInt(updated.laps.toString()) || 1;
            if (updated.format === 'liga') {
              updated.matches = (N * (N - 1) / 2) * L;
            } else if (updated.format === 'eliminatoria') {
              updated.matches = (N - 1) * L; 
            } else if (updated.format === 'grupos_playoffs') {
              const G = parseInt(updated.groupSize?.toString() || '4') || 4;
              const series = parseInt(updated.playoffSeries?.toString() || '2') || 2;
              
              if (N >= 4) {
                 const numGroups = Math.ceil(N / G);
                 const groupStageMatches = (G * (G - 1) / 2) * numGroups * L;
                 
                 let targetOro = 2;
                 while (targetOro * 2 <= N) targetOro *= 2;
                 let playoffMatches = targetOro - 1;
                 
                 if (series === 2) {
                   let targetPlata = N - targetOro;
                   if (targetPlata >= 2) {
                     let powerPlata = 2;
                     while (powerPlata * 2 <= targetPlata) powerPlata *= 2;
                     playoffMatches += (powerPlata - 1);
                   }
                 }
                 updated.matches = groupStageMatches + playoffMatches;
              } else {
                 updated.matches = 0;
              }
            }
          }
          return updated;
        })
      } : cat)
    } : c));
  };

  const updateVenueDistribution = (compId: string, venueName: string, hours: number) => {
    setCompetitions(prev => prev.map(c => {
      if (c.id === compId) {
        return {
          ...c,
          venueDistributions: {
            ...c.venueDistributions,
            [venueName]: hours
          }
        };
      }
      return c;
    }));
  };

  // Calculations
  let totalMatchesGlobal = 0;
  let totalRefereeCostGlobal = 0;
  let totalPitchCostGlobal = 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Utilidades</h2>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Costes y Estructura Organizativa</p>
        </div>
        <div className="flex items-center gap-3 bg-white p-1.5 rounded-xl border border-slate-200">
          <select 
            className="px-3 py-2 text-sm font-bold text-slate-600 bg-slate-50 border-none outline-none rounded-lg"
            value={cloneSourceId}
            onChange={e => setCloneSourceId(e.target.value)}
          >
            <option value="">Nueva Competición Vacía</option>
            {competitions.map((c, idx) => (
              <option key={`clone-${c.id || 'no-id'}-${idx}`} value={c.id}>Clonar: {c.name}</option>
            ))}
          </select>
          <button
            onClick={addCompetition}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-bold shadow-sm shadow-indigo-600/20 hover:bg-indigo-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Añadir
          </button>
        </div>
      </div>

      {competitions.length === 0 && (
        <div className="bg-white rounded-3xl p-12 text-center border border-slate-200">
          <Warehouse className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">Sin Competiciones</h3>
          <p className="text-sm font-medium text-slate-500 mt-2">Añade competiciones para calcular la estructura de costes.</p>
        </div>
      )}

      {/* Competitions Tree */}
      <div className="space-y-4">
        {competitions.map((comp, compIdx) => {
          
          let compMatches = 0;
          let compHours = 0;
          
          comp.categories.forEach(cat => {
            cat.divisions.forEach(div => {
              compMatches += (parseInt(div.matches.toString())||0);
              compHours += ((parseInt(div.matches.toString())||0) * (parseFloat(div.hoursPerMatch.toString())||0));
            });
          });

          // Calculate Costs for this Comp
          const compRefereeCost = compMatches * refereeCost;
          
          let compPitchCost = 0;
          venues.forEach(v => {
            const distributedHours = comp.venueDistributions[v.venue_name] || 0;
            compPitchCost += distributedHours * v.hourly_rate;
          });

          // Unassigned hours detection
          const totalAssignedHours = Number(Object.values(comp.venueDistributions).reduce((a: any, b: any) => Number(a) + Number(b), 0));
          const unassignedHours: number = compHours - totalAssignedHours;

          totalMatchesGlobal += compMatches;
          totalRefereeCostGlobal += compRefereeCost;
          totalPitchCostGlobal += compPitchCost;

          const isExpanded = expandedComps[comp.id];
          const CompIcon = ICONS[comp.iconType];

          return (
            <div key={`comp-main-${comp.id || 'no-id'}-${compIdx}`} className="bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden">
              <div 
                className="bg-slate-50 border-b border-slate-100 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-pointer hover:bg-slate-100 transition-colors"
              >
                <div className="flex items-center gap-3 flex-1" onClick={() => toggleComp(comp.id)}>
                  <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center shrink-0">
                    <CompIcon className="w-5 h-5" />
                  </div>
                  {isExpanded ? (
                    <div className="flex flex-col gap-2 flex-1" onClick={e => e.stopPropagation()}>
                      <div className="flex items-center gap-2">
                         <select 
                            value={comp.iconType} 
                            onChange={e => updateCompetitionField(comp.id, 'iconType', e.target.value)}
                            className="bg-white border border-slate-300 rounded-lg text-xs font-bold px-2 py-1 outline-none"
                         >
                            {Object.keys(ICONS).map(k => <option key={k} value={k}>{k}</option>)}
                         </select>
                         <input 
                            type="text" 
                            value={comp.name} 
                            onChange={e => updateCompetitionField(comp.id, 'name', e.target.value)}
                            className="flex-1 bg-white border border-slate-300 rounded-lg text-sm font-black px-3 py-1 outline-none"
                            placeholder="Nombre Competición"
                         />
                      </div>
                    </div>
                  ) : (
                    <div>
                      <h3 className="text-base font-black text-slate-900">{comp.name}</h3>
                      <p className="text-xs font-medium text-slate-500">
                        {comp.categories.length} categorías • {compMatches} partidos • {compHours} horas req.
                      </p>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-4">
                  <div className="hidden md:flex flex-col text-right">
                     <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Subtotal</span>
                     <span className="text-sm font-black text-indigo-600">{(compRefereeCost + compPitchCost).toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €</span>
                  </div>
                  <button onClick={(e) => { e.stopPropagation(); duplicateCompetition(comp); }} className="p-2 text-indigo-500 hover:bg-indigo-50 rounded-xl transition-colors" title="Duplicar">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                  </button>
                  <button onClick={(e) => { e.stopPropagation(); setCompetitionToDelete(comp.id); }} className="p-2 text-rose-500 hover:bg-rose-50 rounded-xl transition-colors" title="Eliminar">
                    <Trash2 className="w-4 h-4" />
                  </button>
                  <button onClick={() => toggleComp(comp.id)} className="p-2 text-slate-400 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors">
                    {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {isExpanded && (
                <div className="p-6">
                  {/* Categorías */}
                  <div className="mb-6">
                    <div className="flex items-center justify-between mb-4">
                       <h4 className="text-sm font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
                         Categorías y Estructura
                       </h4>
                       <button onClick={() => addCategory(comp.id)} className="text-xs font-bold text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-lg hover:bg-indigo-100 flex items-center gap-1">
                          <Plus className="w-3 h-3" /> Añadir Categoría
                       </button>
                    </div>
                    
                    {comp.categories.length === 0 ? (
                      <div className="text-sm text-slate-400 font-medium p-4 bg-slate-50 rounded-xl text-center border border-dashed border-slate-200">
                        No hay categorías en esta competición. Añade una para empezar.
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {comp.categories.map((cat, catIdx) => {
                          const isCatExpanded = expandedCats[cat.id];
                          return (
                            <div key={`cat-sub-${cat.id || 'no-id'}-${catIdx}`} className="border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                              <div className="bg-slate-50 p-3 flex items-center justify-between border-b border-slate-200">
                                <div className="flex items-center gap-3">
                                  <button onClick={() => toggleCat(cat.id)} className="p-1 text-slate-400 hover:text-slate-600">
                                    {isCatExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                                  </button>
                                  <input 
                                    type="text"
                                    value={cat.name}
                                    onChange={e => updateCategoryField(comp.id, cat.id, e.target.value)}
                                    className="bg-white border border-slate-200 px-2 py-1 rounded-md text-sm font-bold text-slate-800 outline-none w-48 focus:border-indigo-500"
                                    placeholder="Nombre Categoría"
                                  />
                                </div>
                                <div className="flex items-center gap-2">
                                  <button onClick={() => addDivision(comp.id, cat.id)} className="text-[10px] uppercase font-black tracking-wider text-slate-500 hover:text-indigo-600 flex items-center gap-1">
                                    <Plus className="w-3 h-3" /> Grupo/División
                                  </button>
                                  <div className="w-px h-4 bg-slate-300 mx-2" />
                                  <button onClick={() => removeCategory(comp.id, cat.id)} className="text-rose-400 hover:text-rose-600 p-1">
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              </div>

                              {isCatExpanded && (
                                <div className="p-2 bg-white">
                                  {cat.divisions.length === 0 ? (
                                    <p className="text-xs text-slate-400 font-medium py-3 text-center">No hay grupos o divisiones.</p>
                                  ) : (
                                    <div className="overflow-x-auto">
                                      <table className="w-full text-left text-xs">
                                        <thead>
                                          <tr className="border-b border-slate-100 text-slate-500 font-black uppercase tracking-wider">
                                            <th className="p-2">División/Grupo</th>
                                            <th className="p-2 text-center">Nº Equip.</th>
                                            <th className="p-2">Formato</th>
                                            <th className="p-2 text-center">Vueltas</th>
                                            <th className="p-2 text-center">Partidos</th>
                                            <th className="p-2 text-center">Hrs/Part.</th>
                                            <th className="p-2"></th>
                                          </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-50">
                                          {cat.divisions.map((div: any, divIdx: number) => (
                                            <React.Fragment key={`div-${div.id || 'no-id'}-${divIdx}`}>
                                              <tr className="hover:bg-slate-50 transition-colors">
                                                <td className="p-2">
                                                  <input 
                                                    type="text" value={div.name} onChange={e => updateDivisionField(comp.id, cat.id, div.id, 'name', e.target.value)}
                                                    className="w-32 px-2 py-1 bg-white border border-slate-200 rounded outline-none font-bold text-slate-700" 
                                                  />
                                                </td>
                                                <td className="p-2 text-center">
                                                  <input 
                                                    type="number" min="2" value={div.teams} onChange={e => updateDivisionField(comp.id, cat.id, div.id, 'teams', parseInt(e.target.value)||0)}
                                                    className="w-12 px-1 py-1 text-center bg-white border border-slate-200 rounded outline-none font-medium" 
                                                  />
                                                </td>
                                                <td className="p-2">
                                                  <select 
                                                    value={div.format} onChange={e => updateDivisionField(comp.id, cat.id, div.id, 'format', e.target.value)}
                                                    className="w-36 px-2 py-1 bg-white border border-slate-200 rounded outline-none font-bold text-xs cursor-pointer shadow-sm focus:border-indigo-500"
                                                  >
                                                    <option value="liga">Formato: Liga</option>
                                                    <option value="eliminatoria">Formato: Eliminatoria</option>
                                                    <option value="grupos_playoffs">Grupos + Fase Final</option>
                                                  </select>
                                                </td>
                                                <td className="p-2 text-center">
                                                  <input 
                                                    type="number" min="1" value={div.laps} onChange={e => updateDivisionField(comp.id, cat.id, div.id, 'laps', parseInt(e.target.value)||1)}
                                                    className="w-12 px-1 py-1 text-center bg-white border border-slate-200 rounded outline-none font-medium" 
                                                  />
                                                </td>
                                              <td className="p-2 text-center">
                                                <input 
                                                  type="number" min="0" value={div.matches} onChange={e => updateDivisionField(comp.id, cat.id, div.id, 'matches', parseInt(e.target.value)||0)}
                                                  className="w-14 px-1 py-1 text-center bg-indigo-50 text-indigo-700 font-bold border border-indigo-200 rounded outline-none" 
                                                />
                                              </td>
                                              <td className="p-2 text-center">
                                                <input 
                                                  type="number" min="0" step="0.5" value={div.hoursPerMatch} onChange={e => updateDivisionField(comp.id, cat.id, div.id, 'hoursPerMatch', parseFloat(e.target.value)||0)}
                                                  className="w-14 px-1 py-1 text-center bg-white border border-slate-200 rounded outline-none font-medium" 
                                                />
                                              </td>
                                              <td className="p-2 text-right">
                                                <button onClick={() => removeDivision(comp.id, cat.id, div.id)} className="text-slate-400 hover:text-rose-500 p-1">
                                                  <Trash2 className="w-3 h-3" />
                                                </button>
                                              </td>
                                            </tr>
                                            {div.format === 'grupos_playoffs' && (
                                              <tr className="bg-slate-50/70 border-b border-t border-indigo-100">
                                                <td colSpan={7} className="p-2 px-4 shadow-inner">
                                                  <div className="flex flex-wrap items-center gap-6 text-xs text-indigo-900 border border-indigo-200/60 p-2.5 rounded-xl bg-indigo-50/50">
                                                    <span className="font-bold flex items-center gap-1.5 uppercase tracking-wider text-[10px]">
                                                      Config. Grupos y Playoff:
                                                    </span>
                                                    <label className="flex items-center gap-2 font-medium">
                                                      Equipos por grupo:
                                                      <input 
                                                        type="number" min="2" 
                                                        className="w-16 px-2 py-1 text-center bg-white border border-indigo-200 rounded outline-none font-bold text-indigo-900 shadow-sm" 
                                                        value={div.groupSize || 4} 
                                                        onChange={(e) => updateDivisionField(comp.id, cat.id, div.id, 'groupSize', parseInt(e.target.value)||4)} 
                                                      />
                                                    </label>
                                                    <label className="flex items-center gap-2 font-medium">
                                                      Fases (Oro/Plata):
                                                      <select 
                                                        className="px-2 py-1 bg-white border border-indigo-200 rounded outline-none font-bold text-indigo-900 shadow-sm" 
                                                        value={div.playoffSeries || 2} 
                                                        onChange={(e) => updateDivisionField(comp.id, cat.id, div.id, 'playoffSeries', parseInt(e.target.value)||2)}
                                                      >
                                                        <option value={1}>Solo Fase Oro</option>
                                                        <option value={2}>Fases Oro y Plata</option>
                                                      </select>
                                                    </label>
                                                    <div className="flex-1 min-w-full text-[11px] text-indigo-700 bg-white p-2 rounded border border-indigo-100 font-medium">
                                                      {getGruposPlayoffExplanation(div.teams, div.groupSize || 4, div.playoffSeries || 2)}
                                                    </div>
                                                  </div>
                                                </td>
                                              </tr>
                                            )}
                                          </React.Fragment>
                                          ))}
                                        </tbody>
                                      </table>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Distribución de Instalaciones y Gastos */}
                  <div className="bg-slate-50 border border-slate-200 rounded-2xl overflow-hidden mt-6">
                    <div 
                      className="p-5 flex items-center justify-between cursor-pointer hover:bg-slate-100 transition-colors"
                      onClick={() => toggleVenues(comp.id)}
                    >
                      <h4 className="text-sm font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
                        <span>Distribución de Campos y Gastos</span>
                        {/* Title simple without the small tag to avoid duplicate numbers */}
                      </h4>
                      <button className="p-1 text-slate-400 hover:text-slate-600">
                        {expandedVenues[comp.id] ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
                      </button>
                    </div>
                    
                    {expandedVenues[comp.id] && (
                      <div className="p-5 border-t border-slate-200 bg-white">
                        
                        {/* SUMMARY CARDS */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                          <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl flex flex-col items-center justify-center text-center">
                            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Horas Requeridas</span>
                            <span className="text-2xl font-black text-slate-800">{compHours} <span className="text-sm text-slate-500">h</span></span>
                          </div>
                          <div className="bg-indigo-50 border border-indigo-100 p-4 rounded-2xl flex flex-col items-center justify-center text-center">
                            <span className="text-xs font-bold text-indigo-400 uppercase tracking-widest mb-1">Coste Arbitrajes</span>
                            <span className="text-2xl font-black text-indigo-700">{compRefereeCost.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} <span className="text-sm text-indigo-400">€</span></span>
                          </div>
                          <div className="bg-sky-50 border border-sky-100 p-4 rounded-2xl flex flex-col items-center justify-center text-center">
                            <span className="text-xs font-bold text-sky-500 uppercase tracking-widest mb-1">Coste Instalaciones</span>
                            <span className="text-2xl font-black text-sky-700">{compPitchCost.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} <span className="text-sm text-sky-400">€</span></span>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                          <div className="space-y-3">
                            <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Reparto de Horas (Instalaciones)</div>
                            {venues.length === 0 ? (
                               <div className="text-xs text-rose-500 font-medium py-2">No hay campos configurados en Configuración Económica.</div>
                            ) : (
                              venues.map(v => {
                                const val = comp.venueDistributions[v.venue_name] || 0;
                                const fieldCost = val * v.hourly_rate;
                                return (
                                  <div key={v.venue_name} className="flex items-center justify-between bg-slate-50 border border-slate-200 p-3 rounded-xl gap-4">
                                    <div className="flex-1 min-w-0">
                                      <div className="text-sm font-black text-slate-900 truncate">{v.venue_name}</div>
                                      <div className="text-[10px] font-bold text-slate-500 uppercase mt-0.5">Tarifa: {v.hourly_rate.toLocaleString('de-DE', {minimumFractionDigits:2, maximumFractionDigits:2})}€/hr</div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                      <div className="text-right hidden sm:block">
                                        <div className="text-[10px] font-bold text-slate-400 uppercase">Subtotal</div>
                                        <div className="text-sm font-black text-slate-700">{fieldCost.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}€</div>
                                      </div>
                                      <div className="flex items-center gap-1.5">
                                        <input 
                                          type="number"
                                          min="0"
                                          step="0.5"
                                          value={val}
                                          onChange={e => updateVenueDistribution(comp.id, v.venue_name, parseFloat(e.target.value)||0)}
                                          className="w-20 px-3 py-2 text-center bg-white border border-slate-200 rounded-lg outline-none font-black text-slate-800 shadow-sm focus:ring-2 focus:ring-indigo-500/20" 
                                        />
                                        <span className="text-xs font-bold text-slate-400">hr</span>
                                      </div>
                                    </div>
                                  </div>
                                );
                              })
                            )}
                            {unassignedHours !== 0 && venues.length > 0 && (
                              <div className={`text-xs font-bold p-3 text-center rounded-xl border ${unassignedHours > 0 ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'}`}>
                                {unassignedHours > 0 ? (
                                  <>⚠️ Faltan <strong>{Math.abs(unassignedHours)} h</strong> por asignar para cubrir los {compHours}h totales requeridas.</>
                                ) : (
                                  <>Hay <strong>{Math.abs(unassignedHours)} h</strong> extra asignadas (requeridas: {compHours}h).</>
                                )}
                              </div>
                            )}
                          </div>

                          <div className="space-y-3">
                            <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Resumen Económico (Competición)</div>
                            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-inner">
                               <div className="flex justify-between items-center pb-3 border-b border-slate-800/50">
                                 <span className="text-sm font-medium text-slate-400">Total Partidos Estimados</span>
                                 <span className="text-sm font-bold text-white">{compMatches}</span>
                               </div>
                               <div className="flex justify-between items-center py-3 border-b border-slate-800/50">
                                 <span className="text-sm font-medium text-slate-400">Subtotal Arbitrajes</span>
                                 <span className="text-sm font-bold text-white">{compRefereeCost.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €</span>
                               </div>
                               <div className="flex justify-between items-center py-3 border-b border-slate-800/50">
                                 <span className="text-sm font-medium text-slate-400">Subtotal Instalaciones</span>
                                 <span className="text-sm font-bold text-white">{compPitchCost.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €</span>
                               </div>
                               <div className="flex justify-between items-center pt-5 mt-2">
                                 <span className="text-sm font-black text-white uppercase tracking-wider">Coste Total Competición</span>
                                 <span className="text-2xl font-black text-indigo-400">
                                   {(compRefereeCost + compPitchCost).toLocaleString('de-DE', {minimumFractionDigits:2, maximumFractionDigits:2})} 
                                   <span className="text-base text-indigo-400/60 ml-1">€</span>
                                 </span>
                               </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {competitions.length > 0 && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white rounded-[2rem] p-6 border border-slate-200 shadow-sm flex flex-col justify-center">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-slate-500 font-bold uppercase tracking-widest text-xs">Total Global Partidos</h4>
                <div className="w-8 h-8 rounded-full bg-indigo-50 text-indigo-500 flex items-center justify-center">
                  <Calculator className="w-4 h-4" />
                </div>
              </div>
              <span className="text-3xl font-black text-slate-800">{totalMatchesGlobal}</span>
            </div>

            <div className="bg-white rounded-[2rem] p-6 border border-slate-200 shadow-sm flex flex-col justify-center">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-slate-500 font-bold uppercase tracking-widest text-xs">Total Árbitros (Global)</h4>
                <div className="w-8 h-8 rounded-full bg-orange-50 text-orange-500 flex items-center justify-center">
                  <Calculator className="w-4 h-4" />
                </div>
              </div>
              <span className="text-3xl font-black text-slate-800">{totalRefereeCostGlobal.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €</span>
            </div>

            <div className="bg-white rounded-[2rem] p-6 border border-slate-200 shadow-sm flex flex-col justify-center">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-slate-500 font-bold uppercase tracking-widest text-xs">Total Canchas (Global)</h4>
                <div className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-500 flex items-center justify-center">
                  <Warehouse className="w-4 h-4" />
                </div>
              </div>
              <span className="text-3xl font-black text-slate-800">{totalPitchCostGlobal.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €</span>
            </div>
          </div>

          <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-[2rem] p-8 shadow-xl text-white relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl transform translate-x-1/4 -translate-y-1/4" />
            <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
              <div>
                <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-1">Impacto Económico Organizativo</h3>
                <p className="text-xs font-medium text-slate-300">Suma total de arbitrajes y alquiler de instalaciones calculados</p>
              </div>
              <div className="text-5xl font-black tracking-tight flex items-baseline gap-2">
                {(totalRefereeCostGlobal + totalPitchCostGlobal).toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} 
                <span className="text-3xl text-slate-500">€</span>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Delete Confirmation Modal */}
      {competitionToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl p-6 relative">
            <h3 className="text-lg font-black text-slate-900 truncate pr-5">Eliminar Competición</h3>
            <p className="text-sm font-medium text-slate-600 mt-2 leading-relaxed">
              ¿Estás seguro de que deseas eliminar esta competición? Se perderá toda la configuración de categorías, grupos y distribución de gastos.
            </p>
            <div className="flex justify-end gap-3 mt-6">
              <button 
                onClick={() => setCompetitionToDelete(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-bold rounded-lg transition-colors"
              >
                Cancelar
              </button>
              <button 
                onClick={() => removeCompetition(competitionToDelete)}
                className="px-4 py-2 bg-rose-500 hover:bg-rose-600 text-white text-sm font-bold rounded-lg transition-colors flex items-center gap-2"
              >
                <Trash2 className="w-4 h-4" /> Eliminar
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
