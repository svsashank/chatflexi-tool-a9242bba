
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import AppRoutes from "./AppRoutes";
import { useChatStore } from "./store";
import { useEffect } from "react";

// Create a client with better error handling
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30000,
    },
  },
});

const AppContent = () => {
  const { initializeSelectedModel } = useChatStore();

  // Initialize the selected model from localStorage when the app first loads
  useEffect(() => {
    console.log("App: Initializing selected model");
    initializeSelectedModel();
  }, [initializeSelectedModel]);

  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
};

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <TooltipProvider>
          <Toaster />
          <Sonner position="top-right" closeButton />
          <AppContent />
        </TooltipProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
};

export default App;
