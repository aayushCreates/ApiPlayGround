import React, { createContext, useContext, useEffect } from "react";
import { useAuth } from "@clerk/clerk-react";
import { setClerkTokenGetter } from "../api";

const AuthContext = createContext({});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const { getToken } = useAuth();

  useEffect(() => {
    // Inject the getToken function into our axios client whenever it changes/mounts
    setClerkTokenGetter(getToken);
  }, [getToken]);

  return <AuthContext.Provider value={{}}>{children}</AuthContext.Provider>;
};

export const useAppAuth = () => useContext(AuthContext);
