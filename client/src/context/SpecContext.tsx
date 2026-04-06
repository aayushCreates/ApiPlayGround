import React, { createContext, useContext, useReducer, type ReactNode } from "react";
import type { SpecContextState, SpecAction } from "../types";

const initialState: SpecContextState = {
  modules: [],
  activeModuleId: null,
  selectedEndpoint: null,
  baseUrl: "",
  isParsing: false,
  parseError: null,
};

function specReducer(state: SpecContextState, action: SpecAction): SpecContextState {
  switch (action.type) {
    case "SET_MODULES":
      return { ...state, modules: action.payload };

    case "ADD_MODULE":
      return { ...state, modules: [action.payload, ...state.modules] };

    case "DELETE_MODULE": {
      const modules = state.modules.filter(m => m.id !== action.payload);
      const wasActive = state.activeModuleId === action.payload;
      return {
        ...state,
        modules,
        activeModuleId: wasActive ? null : state.activeModuleId,
        selectedEndpoint: wasActive ? null : state.selectedEndpoint,
        baseUrl: wasActive ? "" : state.baseUrl,
      };
    }

    case "TOGGLE_MODULE":
      return {
        ...state,
        modules: state.modules.map(m =>
          m.id === action.payload ? { ...m, isOpen: !m.isOpen } : m
        ),
      };

    case "SET_ACTIVE_MODULE":
      return { ...state, activeModuleId: action.payload };

    case "SELECT_ENDPOINT":
      return {
        ...state,
        selectedEndpoint: action.payload.endpoint,
        activeModuleId: action.payload.moduleId,
        baseUrl: action.payload.baseUrl,
      };

    case "PARSE_START":
      return { ...state, isParsing: true, parseError: null };

    case "PARSE_ERROR":
      return { ...state, isParsing: false, parseError: action.payload };

    case "SET_BASE_URL":
      return { ...state, baseUrl: action.payload };

    case "RESET":
      return initialState;

    default:
      return state;
  }
}

const SpecContext = createContext<{
  state: SpecContextState;
  dispatch: React.Dispatch<SpecAction>;
}>({ state: initialState, dispatch: () => null });

export const SpecProvider = ({ children }: { children: ReactNode }) => {
  const [state, dispatch] = useReducer(specReducer, initialState);
  return (
    <SpecContext.Provider value={{ state, dispatch }}>
      {children}
    </SpecContext.Provider>
  );
};

export const useSpec = () => useContext(SpecContext);
