import { Outlet, NavLink, useLocation } from "react-router-dom";
import { UserButton, useClerk } from "@clerk/clerk-react";
import { useSpec } from "../../context/SpecContext";
import { specsApi } from "../../api/specs";
import { transformSpec } from "../../utils/specParser";
import {
  TerminalSquare, Settings, FileJson,
  Menu, X, Clock, Braces,
  ChevronRight, ChevronDown, Plus, Trash2, FolderOpen, Package,
  Edit3, Check, Sliders, LogOut
} from "lucide-react";
import { useState, useEffect, useCallback } from "react";
import type { Module, ParsedEndpoint } from "../../types";

export function AppLayout() {
  const { state: specState, dispatch: specDispatch } = useSpec();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isPinned, setIsPinned] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const location = useLocation();
  const clerk = useClerk();

  const isExpanded = isPinned || isHovered;

  // ── Module creation state ──
  const [showNewModule, setShowNewModule] = useState(false);
  const [newModuleName, setNewModuleName] = useState("");

  // ── Import modal state ──
  const [showImportModal, setShowImportModal] = useState(false);
  const [importTargetModuleId, setImportTargetModuleId] = useState<string | null>(null);
  const [importMode, setImportMode] = useState<'spec' | 'manual'>('spec');
  const [importInput, setImportInput] = useState("");
  const [manualMethod, setManualMethod] = useState<string>("GET");
  const [manualUrl, setManualUrl] = useState("");
  const [importError, setImportError] = useState("");
  const [isImporting, setIsImporting] = useState(false);
  
  // ── Module editing state ──
  const [editingModuleId, setEditingModuleId] = useState<string | null>(null);
  const [editingModuleName, setEditingModuleName] = useState("");
  const [isSavingName, setIsSavingName] = useState(false);

  // ── Variable modal state ──
  const [showVarsModal, setShowVarsModal] = useState(false);
  const [varsModuleId, setVarsModuleId] = useState<string | null>(null);
  const [tempVars, setTempVars] = useState<Array<{ key: string; value: string }>>([]);
  const [isSavingVars, setIsSavingVars] = useState(false);

  // ── Load modules from DB on mount ──
  const loadModules = useCallback(async () => {
    try {
      const specs = await specsApi.getAll();
      const modules: Module[] = [];

      for (const spec of specs) {
        try {
          const full = await specsApi.getById(spec.id);
          const parsed = await transformSpec(full.content);
          modules.push({
            id: spec.id,
            name: spec.name,
            specDbId: spec.id,
            parsedSpec: parsed,
            rawContent: full.content,
            isOpen: false,
            variables: (spec.variables as Record<string, string>) || {},
          });
        } catch {
          // Spec exists but can't parse. Still show it.
          modules.push({
            id: spec.id,
            name: spec.name,
            specDbId: spec.id,
            parsedSpec: null,
            rawContent: "",
            isOpen: false,
            variables: (spec.variables as Record<string, string>) || {},
          });
        }
      }

      specDispatch({ type: "SET_MODULES", payload: modules });
    } catch {
      // API not available — silently ignore
    }
  }, [specDispatch]);

  useEffect(() => {
    loadModules();
  }, [loadModules]);

  // ── Create new module ──
  const handleCreateModule = async () => {
    const name = newModuleName.trim();
    if (!name) return;
    setNewModuleName("");
    setShowNewModule(false);
    // Open import modal for the new module right away
    setImportTargetModuleId("__new__:" + name);
    setShowImportModal(true);
  };

  // ── Import spec into module ──
  const handleImport = async () => {
    if (!importTargetModuleId) return;
    setIsImporting(true);
    setImportError("");

    try {
      let specRecord;
      let parsed;

      if (importMode === 'manual') {
        const moduleName = importTargetModuleId.startsWith("__new__:") 
          ? importTargetModuleId.replace("__new__:", "")
          : specState.modules.find(m => m.id === importTargetModuleId)?.name || "Manual Module";

        specRecord = await specsApi.createManual({
          name: moduleName,
          method: manualMethod,
          url: manualUrl,
        });
        parsed = await transformSpec(specRecord.content);
      } else {
        if (!importInput.trim()) {
           setIsImporting(false);
           return;
        }
        parsed = await transformSpec(importInput);

        if (importTargetModuleId.startsWith("__new__:")) {
          const moduleName = importTargetModuleId.replace("__new__:", "");
          specRecord = await specsApi.create({
            name: moduleName,
            content: importInput,
            description: parsed.info.description || "",
          });
        } else {
          const existingModule = specState.modules.find(m => m.id === importTargetModuleId);
          if (!existingModule) throw new Error("Module not found");
          specRecord = await specsApi.update(existingModule.specDbId, {
            content: importInput,
            description: parsed.info.description || "",
          });
        }
      }

      const freshModule: Module = {
        id: specRecord.id,
        name: specRecord.name,
        specDbId: specRecord.id,
        parsedSpec: parsed,
        rawContent: specRecord.content,
        isOpen: true,
        variables: (specRecord.variables as Record<string, string>) || {},
      };

      if (importTargetModuleId.startsWith("__new__:")) {
        specDispatch({ type: "ADD_MODULE", payload: freshModule });
      } else {
        specDispatch({
          type: "SET_MODULES",
          payload: specState.modules.map(m => m.id === importTargetModuleId ? freshModule : m),
        });
      }

      setShowImportModal(false);
      setImportInput("");
      setManualUrl("");
      setImportTargetModuleId(null);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to parse specification.";
      setImportError(msg);
    } finally {
      setIsImporting(false);
    }
  };

  // ── Delete module ──
  const handleDeleteModule = async (mod: Module) => {
    try {
      await specsApi.delete(mod.specDbId);
    } catch {
      // already deleted or not reachable
    }
    specDispatch({ type: "DELETE_MODULE", payload: mod.id });
  };

  // ── Open / Save Variables ──
  const handleOpenVars = (mod: Module) => {
    setVarsModuleId(mod.id);
    const arr = Object.entries(mod.variables || {}).map(([key, value]) => ({ key, value }));
    setTempVars(arr);
    setShowVarsModal(true);
  };

  const handleSaveVars = async () => {
    if (!varsModuleId) return;
    const mod = specState.modules.find(m => m.id === varsModuleId);
    if (!mod) return;

    setIsSavingVars(true);
    try {
      const varsObj: Record<string, string> = {};
      tempVars.forEach(tv => {
        if (tv.key.trim()) {
          varsObj[tv.key.trim()] = tv.value;
        }
      });

      await specsApi.update(mod.specDbId, { variables: varsObj });
      specDispatch({ type: "UPDATE_MODULE_VARIABLES", payload: { id: mod.id, variables: varsObj } });
      setShowVarsModal(false);
    } catch (e) {
      console.error("Failed to update module variables", e);
    } finally {
      setIsSavingVars(false);
    }
  };

  // ── Update module name ──
  const handleUpdateModuleName = async (mod: Module) => {
    const name = editingModuleName.trim();
    if (!name || name === mod.name) {
      setEditingModuleId(null);
      return;
    }

    setIsSavingName(true);
    try {
      await specsApi.update(mod.specDbId, { name });
      specDispatch({ type: "UPDATE_MODULE_NAME", payload: { id: mod.id, name } });
    } catch (e) {
      console.error("Failed to update module name", e);
    } finally {
      setIsSavingName(false);
      setEditingModuleId(null);
    }
  };

  // ── Select endpoint ──
  const handleSelectEndpoint = (ep: ParsedEndpoint, mod: Module) => {
    const baseUrl = mod.parsedSpec?.servers?.[0]?.url || "";
    specDispatch({
      type: "SELECT_ENDPOINT",
      payload: { endpoint: ep, moduleId: mod.id, baseUrl },
    });
  };

  const getMethodColor = (method: string) => {
    switch (method.toLowerCase()) {
      case 'get': return 'text-method-get bg-method-get/10 border-method-get/20';
      case 'post': return 'text-method-post bg-method-post/10 border-method-post/20';
      case 'put': return 'text-method-put bg-method-put/10 border-method-put/20';
      case 'delete': return 'text-method-delete bg-method-delete/10 border-method-delete/20';
      case 'patch': return 'text-method-patch bg-method-patch/10 border-method-patch/20';
      default: return 'text-secondary bg-surface border-border';
    }
  };

  const isPlayground = location.pathname === "/app";

  return (
    <div className="flex h-screen bg-base text-primary overflow-hidden">
      {/* Mobile Sidebar Overlay */}
      {!sidebarOpen && (
        <button
          className="md:hidden absolute top-4 left-4 z-50 p-2 bg-surface border border-border rounded-md"
          onClick={() => setSidebarOpen(true)}
        >
          <Menu className="w-5 h-5 text-secondary" />
        </button>
      )}

      {/* Desktop spacer */}
      <div className={`hidden md:block transition-all duration-300 shrink-0 ${isPinned ? 'w-72' : 'w-16'}`} />

      {/* Sidebar */}
      <aside
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className={`
        fixed top-0 left-0 h-full z-40
        transition-all duration-300 ease-in-out
        flex flex-col bg-surface border-r border-border overflow-hidden
        ${sidebarOpen ? 'translate-x-0 w-72 shadow-2xl' : '-translate-x-full md:translate-x-0'}
        ${isExpanded ? 'md:w-72 md:shadow-2xl md:border-r md:bg-surface' : 'md:w-16 md:bg-surface md:border-r md:border-border cursor-pointer'}
      `}>
        <div className="w-72 h-full flex flex-col min-w-[18rem] transition-opacity duration-300 opacity-100">

        {/* Sidebar Header */}
        <div className="h-14 flex items-center justify-between px-5 border-b border-border shrink-0">
          <NavLink to="/" className="flex items-center gap-3 text-primary hover:text-accent transition-colors">
            <TerminalSquare className="w-6 h-6 text-accent shrink-0" />
            <span className={`font-bold tracking-tight transition-opacity duration-200 ${isExpanded ? 'opacity-100' : 'opacity-0'}`}>APIPlayground</span>
          </NavLink>
          <div className="flex items-center gap-1">
            <button
              className="hidden md:flex p-1 text-secondary hover:text-primary hover:bg-elevated rounded-md transition-colors cursor-pointer"
              onClick={() => setIsPinned(!isPinned)}
              title={isPinned ? "Unpin Sidebar" : "Pin Sidebar"}
            >
              <Menu className="w-4 h-4" />
            </button>
            <button
              className="md:hidden p-1 text-secondary hover:text-primary rounded-md cursor-pointer"
              onClick={() => setSidebarOpen(false)}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Navigation */}
        <div className="flex flex-col p-3 gap-2 border-b border-border shrink-0">
          <NavLink
            end
            to="/app"
            className={({isActive}) => `flex items-center gap-3 p-2 rounded-lg text-sm font-medium transition-colors ${isActive ? 'bg-elevated text-primary shadow-sm' : 'text-secondary hover:text-primary hover:bg-surface'}`}
          >
             <Braces className="w-5 h-5 shrink-0" />
             <span className={`transition-opacity duration-200 ${isExpanded ? 'opacity-100' : 'opacity-0'}`}>Playground</span>
          </NavLink>
          <NavLink
            to="/app/history"
            className={({isActive}) => `flex items-center gap-3 p-2 rounded-lg text-sm font-medium transition-colors ${isActive ? 'bg-elevated text-primary shadow-sm' : 'text-secondary hover:text-primary hover:bg-surface'}`}
          >
             <Clock className="w-5 h-5 shrink-0" />
             <span className={`transition-opacity duration-200 ${isExpanded ? 'opacity-100' : 'opacity-0'}`}>History</span>
          </NavLink>
        </div>

        {/* Modules / Spec section */}
        {isPlayground && (
          <div className="flex-1 overflow-y-auto flex flex-col">

            {/* Module list header */}
            <div className={`px-4 pt-4 pb-2 flex items-center justify-between transition-opacity duration-200 ${isExpanded ? 'opacity-100' : 'opacity-0 h-0 overflow-hidden p-0'}`}>
              <h2 className="text-xs font-bold text-secondary uppercase tracking-wider">Modules</h2>
              <button
                onClick={() => setShowNewModule(true)}
                className="p-1 text-accent hover:bg-accent/10 rounded-md transition-colors cursor-pointer"
                title="New Module"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>

            {/* Collapsed: icon-only add button */}
            {!isExpanded && (
              <div className="p-3 flex justify-center border-b border-border">
                <button
                  className="p-2 rounded-md bg-accent/10 border border-accent/20 text-accent hover:bg-accent/20 transition-colors cursor-pointer"
                  onClick={() => { setShowNewModule(true); setIsPinned(true); }}
                  title="New Module"
                >
                  <Plus className="w-5 h-5 shrink-0" />
                </button>
              </div>
            )}

            {/* New module inline form */}
            {showNewModule && isExpanded && (
              <div className="px-4 pb-3">
                <div className="flex gap-2">
                  <input
                    autoFocus
                    value={newModuleName}
                    onChange={e => setNewModuleName(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter") handleCreateModule(); if (e.key === "Escape") setShowNewModule(false); }}
                    placeholder="Module name..."
                    className="flex-1 px-2 py-1.5 text-sm bg-base border border-border rounded-md outline-none focus:border-accent text-primary"
                  />
                  <button
                    onClick={handleCreateModule}
                    disabled={!newModuleName.trim()}
                    className="px-2 py-1.5 text-xs font-medium bg-accent text-white rounded-md hover:bg-accent-hover transition-colors cursor-pointer disabled:opacity-40"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}

            {/* Modules list */}
            <div className="flex-1 px-2 pb-3">
              {specState.modules.length === 0 ? (
                <div className={`h-full flex flex-col items-center justify-center text-center p-4 text-secondary/70 transition-opacity duration-200 ${isExpanded ? 'opacity-100' : 'opacity-0'}`}>
                  <div className="w-12 h-12 rounded-full border border-dashed border-border flex items-center justify-center mb-3">
                    <Package className="w-5 h-5 opacity-50" />
                  </div>
                  <p className="text-sm font-medium text-primary mb-1">No modules yet</p>
                  <p className="text-xs">Create a module to import your first API spec.</p>
                </div>
              ) : (
                <div className="flex flex-col gap-1">
                  {specState.modules.map(mod => (
                    <div key={mod.id} className="flex flex-col">

                      {/* Module header */}
                      <div
                        onClick={() => !isExpanded && setIsPinned(true)}
                        className={`flex items-center gap-2 p-2 rounded-lg transition-colors group cursor-pointer
                          ${specState.activeModuleId === mod.id ? 'bg-elevated shadow-sm' : 'hover:bg-surface/50'}
                          ${!isExpanded ? 'justify-center p-3' : ''}
                        `}
                      >
                        {isExpanded && (
                          <button
                            onClick={(e) => { e.stopPropagation(); specDispatch({ type: "TOGGLE_MODULE", payload: mod.id }); }}
                            className="shrink-0 p-0.5 text-secondary hover:text-primary cursor-pointer"
                          >
                            {mod.isOpen
                              ? <ChevronDown className="w-3.5 h-3.5" />
                              : <ChevronRight className="w-3.5 h-3.5" />
                            }
                          </button>
                        )}

                        <FolderOpen 
                          className={`w-4 h-4 shrink-0 ${specState.activeModuleId === mod.id ? 'text-accent' : 'text-secondary'}`} 
                        />

                        {editingModuleId === mod.id ? (
                          <div className="flex-1 flex gap-1 items-center px-1" onClick={e => e.stopPropagation()}>
                            <input
                              autoFocus
                              value={editingModuleName}
                              onChange={e => setEditingModuleName(e.target.value)}
                              onKeyDown={e => {
                                if (e.key === "Enter") handleUpdateModuleName(mod);
                                if (e.key === "Escape") setEditingModuleId(null);
                              }}
                              disabled={isSavingName}
                              className="w-full bg-base border border-accent/30 rounded px-1.5 py-0.5 text-[11px] font-semibold outline-none text-primary"
                            />
                            <button
                               onClick={() => handleUpdateModuleName(mod)}
                               disabled={isSavingName}
                               className="p-1 text-accent hover:bg-accent/10 rounded cursor-pointer transition-colors"
                            >
                              <Check className="w-3 h-3" />
                            </button>
                          </div>
                        ) : (
                          <span
                            onClick={(e) => { e.stopPropagation(); specDispatch({ type: "TOGGLE_MODULE", payload: mod.id }); }}
                            className={`text-xs font-semibold truncate flex-1 transition-opacity duration-200 ${isExpanded ? 'opacity-100' : 'opacity-0 w-0'} ${specState.activeModuleId === mod.id ? 'text-primary' : 'text-secondary'}`}
                          >
                            {mod.name}
                          </span>
                        )}

                        {/* Module actions */}
                        <div className={`flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity ${isExpanded ? '' : 'hidden'}`}>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingModuleId(mod.id);
                              setEditingModuleName(mod.name);
                            }}
                            className="p-1 text-secondary hover:text-accent rounded transition-colors cursor-pointer"
                            title="Rename Module"
                          >
                            <Edit3 className="w-3 h-3" />
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); setImportTargetModuleId(mod.id); setShowImportModal(true); }}
                            className="p-1 text-secondary hover:text-accent rounded transition-colors cursor-pointer"
                            title="Import / Replace Spec"
                          >
                            <FileJson className="w-3 h-3" />
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); handleOpenVars(mod); }}
                            className="p-1 text-secondary hover:text-accent rounded transition-colors cursor-pointer"
                            title="Environment Variables"
                          >
                            <Sliders className="w-3 h-3" />
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); handleDeleteModule(mod); }}
                            className="p-1 text-secondary hover:text-danger rounded transition-colors cursor-pointer"
                            title="Delete Module"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>

                      {/* Endpoints inside module */}
                      {isExpanded && mod.isOpen && mod.parsedSpec && (
                        <div className="ml-4 pl-3 border-l border-border/50 flex flex-col gap-0.5 pb-1">
                          {mod.parsedSpec.endpoints.map(ep => {
                            const isSelected = specState.selectedEndpoint?.id === ep.id && specState.activeModuleId === mod.id;
                            return (
                              <button
                                key={ep.id}
                                title={ep.path}
                                onClick={() => handleSelectEndpoint(ep, mod)}
                                className={`
                                  flex items-center gap-2 p-1.5 rounded-md text-left transition-all w-full cursor-pointer
                                  ${isSelected ? 'bg-accent/10 border border-accent/20' : 'hover:bg-surface/50 border border-transparent'}
                                `}
                              >
                                <span className={`text-[9px] uppercase font-bold py-0.5 rounded border shrink-0 w-9 text-center ${getMethodColor(ep.method)}`}>
                                  {ep.method.slice(0, 3)}
                                </span>
                                <span className={`text-[11px] font-mono truncate flex-1 transition-opacity duration-200 ${isExpanded ? 'opacity-100' : 'opacity-0 w-0'} ${isSelected ? 'text-accent' : 'text-secondary'}`}>
                                  {ep.path}
                                </span>
                              </button>
                            );
                          })}
                          {mod.parsedSpec.endpoints.length === 0 && (
                            <p className="text-[10px] text-secondary/50 py-1 pl-2">No endpoints found</p>
                          )}
                        </div>
                      )}

                      {mod.isOpen && !mod.parsedSpec && (
                        <div className="ml-4 pl-3 border-l border-border/50 py-2">
                          <button
                            onClick={() => { setImportTargetModuleId(mod.id); setShowImportModal(true); }}
                            className="text-[11px] text-accent hover:underline cursor-pointer"
                          >
                            Import a spec into this module
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Bottom user section */}
        <div className="mt-auto p-4 border-t border-border flex items-center justify-between bg-surface shrink-0">
          <div className="flex items-center gap-3">
             <div className="shrink-0 flex items-center justify-center">
                 <UserButton afterSignOutUrl="/" />
             </div>
             <div className={`flex flex-col transition-opacity duration-200 ${isExpanded ? 'opacity-100' : 'opacity-0 w-0 overflow-hidden'}`}>
               <span className="text-xs font-medium">My Account</span>
               <div className="flex items-center gap-2 mt-0.5">
                 <button 
                   onClick={() => clerk.signOut()}
                   className="text-[10px] text-secondary hover:text-danger transition-colors flex items-center cursor-pointer"
                 >
                   <LogOut className="w-3 h-3 mr-1 shrink-0" /> Logout
                 </button>
               </div>
             </div>
          </div>
        </div>
        </div>
      </aside>

      {/* Import Modal */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-base/80 backdrop-blur-sm p-4">
          <div className="bg-surface border border-border rounded-xl w-full max-w-2xl shadow-2xl flex flex-col overflow-hidden">
            <div className="p-4 border-b border-border flex items-center justify-between bg-elevated">
              <h2 className="text-lg font-bold text-primary">Module Setup</h2>
              <button
                className="text-secondary hover:text-primary transition-colors p-1 cursor-pointer rounded-md hover:bg-surface"
                onClick={() => { setShowImportModal(false); setImportError(""); setImportInput(""); setManualUrl(""); setImportTargetModuleId(null); }}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Tabs */}
            <div className="flex border-b border-border bg-base/50">
              <button
                onClick={() => setImportMode('spec')}
                className={`flex-1 py-3 text-sm font-medium transition-colors cursor-pointer border-b-2
                  ${importMode === 'spec' ? 'text-accent border-accent' : 'text-secondary border-transparent hover:text-primary'}
                `}
              >
                Import Specification
              </button>
              <button
                onClick={() => setImportMode('manual')}
                className={`flex-1 py-3 text-sm font-medium transition-colors cursor-pointer border-b-2
                  ${importMode === 'manual' ? 'text-accent border-accent' : 'text-secondary border-transparent hover:text-primary'}
                `}
              >
                Manual Endpoint
              </button>
            </div>

            <div className="p-4 flex-1 flex flex-col gap-4">
              {importMode === 'spec' ? (
                <>
                  <p className="text-xs text-secondary">
                    Paste your OpenAPI 3.0 or Swagger 2.0 specification below (JSON or YAML format).
                  </p>
                  <textarea
                    className="w-full h-64 bg-base border border-border rounded-lg p-3 text-sm font-mono text-primary outline-none focus:border-accent transition-colors resize-y hide-scrollbar"
                    placeholder={"openapi: 3.0.0\ninfo:\n  title: Sample API..."}
                    value={importInput}
                    onChange={(e) => setImportInput(e.target.value)}
                  />
                </>
              ) : (
                <div className="flex flex-col gap-4">
                  <p className="text-xs text-secondary">
                    Provide the HTTP method and full URL to quickly create a manual endpoint.
                  </p>
                  <div className="flex gap-2">
                    <select
                      value={manualMethod}
                      onChange={(e) => setManualMethod(e.target.value)}
                      className="w-32 bg-base border border-border rounded-lg px-3 py-2 text-sm text-primary outline-none focus:border-accent cursor-pointer"
                    >
                      {["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS", "HEAD"].map(m => (
                        <option key={m} value={m}>{m}</option>
                      ))}
                    </select>
                    <input
                      type="text"
                      placeholder="https://api.example.com/v1/users"
                      value={manualUrl}
                      onChange={(e) => setManualUrl(e.target.value)}
                      className="flex-1 bg-base border border-border rounded-lg px-3 py-2 text-sm text-primary outline-none focus:border-accent font-mono"
                    />
                  </div>
                </div>
              )}

              {importError && (
                <div className="p-3 rounded-md bg-danger/10 border border-danger/20 text-danger text-sm">
                  {importError}
                </div>
              )}
            </div>
            <div className="p-4 border-t border-border flex justify-end gap-3 bg-elevated">
              <button
                className="px-4 py-2 rounded-md text-sm font-medium text-secondary hover:text-primary hover:bg-surface transition-colors cursor-pointer border border-transparent hover:border-border"
                onClick={() => { setShowImportModal(false); setImportError(""); setImportInput(""); setManualUrl(""); setImportTargetModuleId(null); }}
              >
                Cancel
              </button>
              <button
                className="px-4 py-2 rounded-md text-sm font-medium bg-accent text-white hover:bg-accent-hover transition-colors flex items-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={handleImport}
                disabled={isImporting || (importMode === 'spec' ? !importInput.trim() : !manualUrl.trim())}
              >
                {isImporting ? "Processing..." : (importMode === 'spec' ? "Import Spec" : "Create Endpoint")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Variables Modal */}
      {showVarsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-base/80 backdrop-blur-sm p-4">
          <div className="bg-surface border border-border rounded-xl w-full max-w-lg shadow-2xl flex flex-col overflow-hidden">
            <div className="p-4 border-b border-border flex items-center justify-between bg-elevated">
              <h2 className="text-lg font-bold text-primary flex items-center gap-2">
                <Sliders className="w-5 h-5 text-accent" />
                Environment Variables
              </h2>
              <button
                className="text-secondary hover:text-primary transition-colors p-1 cursor-pointer rounded-md hover:bg-surface"
                onClick={() => setShowVarsModal(false)}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 flex-1 flex flex-col gap-4 max-h-[60vh] overflow-y-auto">
              <p className="text-xs text-secondary">
                Define variables to reuse across requests in this module. Use them via <code className="text-accent bg-accent/10 px-1 py-0.5 rounded">{`{{variable_name}}`}</code> in URLs, parameters, headers, or body.
              </p>

              {tempVars.length === 0 ? (
                <div className="py-6 flex flex-col items-center justify-center border border-dashed border-border rounded-lg bg-base/50">
                   <p className="text-xs text-secondary/50 mb-2">No variables defined</p>
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  {tempVars.map((tv, idx) => (
                    <div key={idx} className="flex items-center gap-2 group">
                      <input
                        type="text"
                        placeholder="Key (e.g. baseUrl)"
                        value={tv.key}
                        onChange={(e) => setTempVars(tempVars.map((item, i) => i === idx ? { ...item, key: e.target.value } : item))}
                        className="flex-1 px-3 py-1.5 text-sm bg-base border border-border rounded-md outline-none focus:border-accent text-primary font-mono"
                      />
                      <input
                        type="text"
                        placeholder="Value (e.g. https://api.ex.com)"
                        value={tv.value}
                        onChange={(e) => setTempVars(tempVars.map((item, i) => i === idx ? { ...item, value: e.target.value } : item))}
                        className="flex-1 px-3 py-1.5 text-sm bg-base border border-border rounded-md outline-none focus:border-accent text-primary font-mono"
                      />
                      <button
                        onClick={() => setTempVars(tempVars.filter((_, i) => i !== idx))}
                        className="p-1.5 text-secondary hover:text-danger rounded-md transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <button
                onClick={() => setTempVars([...tempVars, { key: "", value: "" }])}
                className="text-xs font-medium text-accent hover:underline flex items-center gap-1 w-max cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" /> Add Variable
              </button>
            </div>

            <div className="p-4 border-t border-border flex justify-end gap-3 bg-elevated">
              <button
                className="px-4 py-2 rounded-md text-sm font-medium text-secondary hover:text-primary hover:bg-surface transition-colors cursor-pointer border border-transparent hover:border-border"
                onClick={() => setShowVarsModal(false)}
              >
                Cancel
              </button>
              <button
                className="px-4 py-2 rounded-md text-sm font-medium bg-accent text-white hover:bg-accent-hover transition-colors flex items-center gap-2 cursor-pointer disabled:opacity-50"
                onClick={handleSaveVars}
                disabled={isSavingVars}
              >
                {isSavingVars ? "Saving..." : "Save Variables"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col w-full h-full relative z-10 overflow-hidden bg-base">
        <div className="flex-1 h-full overflow-hidden">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
